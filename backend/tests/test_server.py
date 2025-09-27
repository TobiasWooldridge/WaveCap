import json
from contextlib import contextmanager
from io import BytesIO
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient

from wavecap_backend.models import StreamConfig, StreamSource, StreamStatus
from wavecap_backend.server import create_app
from wavecap_backend.state_paths import RECORDINGS_DIR


@pytest.fixture
def make_test_client(minimal_config, monkeypatch):
    @contextmanager
    def factory(*, streams: list[StreamConfig] | None = None):
        config = minimal_config.model_copy(deep=True)
        config.alerts.enabled = False
        if streams is not None:
            config.streams = streams

        from wavecap_backend import server as server_module
        from wavecap_backend import stream_manager as stream_manager_module

        monkeypatch.setattr(server_module, "load_config", lambda: config)

        class StubTranscriber:
            def __init__(self, *_args, **_kwargs):
                pass

        monkeypatch.setattr(server_module, "WhisperTranscriber", StubTranscriber)

        class StubWorker:
            def __init__(self, stream, **_):
                self.stream = stream

            def start(self) -> None:
                self.stream.status = StreamStatus.TRANSCRIBING

            async def stop(self) -> None:
                self.stream.status = StreamStatus.STOPPED

            async def iter_live_audio(self):
                yield b"stub-header"
                yield b"stub-audio"

        monkeypatch.setattr(stream_manager_module, "StreamWorker", StubWorker)
        app = create_app()
        with TestClient(app) as client:
            yield client

    return factory


def login_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"identifier": "tester", "password": "test-password"},
    )
    assert response.status_code == 200
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_combined_stream_views_endpoint(make_test_client):
    with make_test_client() as client:
        response = client.get("/api/combined-stream-views")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)


def test_stream_management_api(make_test_client):
    audio_stream = StreamConfig(
        id="example-audio",
        name="Example",
        url="http://example.com/audio",
        enabled=False,
        ignoreFirstSeconds=0,
    )
    with make_test_client(streams=[audio_stream]) as client:
        headers = login_headers(client)
        response = client.get("/api/streams")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Example"
        assert data[0]["enabled"] is False

        patch = client.patch(
            "/api/streams/example-audio",
            json={"name": "Renamed example"},
            headers=headers,
        )
        assert patch.status_code == 200
        assert patch.json()["name"] == "Renamed example"


def test_live_audio_stream_uses_active_worker(make_test_client):
    audio_stream = StreamConfig(
        id="example-audio",
        name="Example",
        url="http://example.com/audio",
        enabled=False,
    )
    with make_test_client(streams=[audio_stream]) as client:
        headers = login_headers(client)
        inactive_response = client.get("/api/streams/example-audio/live")
        assert inactive_response.status_code == 409

        start = client.post(
            "/api/streams/example-audio/start", headers=headers
        )
        assert start.status_code == 202

        live_response = client.get("/api/streams/example-audio/live")
        assert live_response.status_code == 200
        assert live_response.headers["content-type"].startswith("audio/wav")
        assert live_response.content == b"stub-headerstub-audio"

        streams = client.get("/api/streams")
        assert streams.json()[0]["enabled"] is True


def test_pager_webhook_endpoint(make_test_client):
    pager_stream = StreamConfig(
        id="pager-demo",
        name="Pager",
        source=StreamSource.PAGER,
        webhookToken="pager-token",
    )
    with make_test_client(streams=[pager_stream]) as client:
        headers = login_headers(client)
        stream_id = pager_stream.id
        webhook_token = pager_stream.webhookToken
        response = client.post(
            f"/api/pager-feeds/{stream_id}?token={webhook_token}",
            json={"message": "Test alert", "sender": "Dispatch"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "accepted"
        assert body["transcription"]["text"].startswith("Dispatch")
        assert body["transcription"]["pagerIncident"] is None

        unauthorized = client.post(
            f"/api/pager-feeds/{stream_id}?token=wrong-token",
            json={"message": "Invalid"},
        )
        assert unauthorized.status_code == 401

        streams = client.get("/api/streams")
        data = streams.json()
        assert data[0]["id"] == stream_id
        assert data[0]["transcriptions"]
        assert data[0]["transcriptions"][0]["text"].startswith("Dispatch")


def test_pager_webhook_known_format(make_test_client):
    pager_stream = StreamConfig(
        id="pager-demo",
        name="Pager",
        source=StreamSource.PAGER,
        webhookToken="pager-token",
    )
    with make_test_client(streams=[pager_stream]) as client:
        headers = login_headers(client)
        stream_id = pager_stream.id
        webhook_token = pager_stream.webhookToken

        payload = {
        "inc": "INC0123",
        "date": {
            "dateTime": "2025-09-01T10:35:54.000Z",
            "dateStr": "2025-09-01",
            "timeStr": "10:35:54",
        },
        "alarm": 1,
        "type": None,
        "address": ": @CFS - HAPPY VALLEY 1 GLORY CT HAPPY VALLEY",
        "map": {"type": "ADL", "page": 178, "grid": ["B", 2]},
        "TG": 134,
        "message": (
            "FLEX|2025-09-01 10:35:54|1600/2/K/A|08.124|001908967|ALN|MFS: "
            "*CFSRES INC0123 01/09/25 20:05 RESPOND TRAINING/TEST ONLY, ALARM LEVEL: 1, "
            ": @CFS - HAPPY VALLEY 1 GLORY CT HAPPY VALLEY,MAP:ADL 178 B2,TG 134, "
            "==TRAINING TEST ONLY FOR TABLET TRAINING :HPPY34P HPPYPUMP HPPYQRV :"
        ),
        }

        response = client.post(
            f"/api/pager-feeds/{stream_id}?token={webhook_token}&format=cfs-flex",
            json=payload,
        )
        assert response.status_code == 200
        body = response.json()
        text = body["transcription"]["text"]
        assert "INC0123" in text
        assert "HAPPY VALLEY" in text
    assert "Alarm level 1" in text
    assert "Map: ADL 178 B2" in text
    assert body["transcription"]["timestamp"] == "2025-09-01T10:35:54Z"
    incident = body["transcription"]["pagerIncident"]
    assert incident["incidentId"] == "INC0123"
    assert incident["callType"] == "TRAINING/TEST ONLY"
    assert incident["address"] == "CFS - HAPPY VALLEY 1 GLORY CT HAPPY VALLEY"
    assert incident["alarmLevel"] == "1"
    assert incident["map"] == "ADL 178 B2"
    assert incident["talkgroup"] == "134"


def test_export_reviewed_zip(make_test_client):
    with make_test_client() as client:
        response = client.get("/api/transcriptions/export-reviewed")
        assert response.status_code == 200
        assert response.headers["Content-Type"].startswith("application/zip")
        buffer = BytesIO(response.content)
        with ZipFile(buffer) as archive:
            assert "metadata.json" in archive.namelist()
            metadata = archive.read("metadata.json").decode("utf-8")
            assert "count" in metadata


def test_export_pager_feed_zip(make_test_client):
    pager_stream = StreamConfig(
        id="pager-demo",
        name="Pager",
        source=StreamSource.PAGER,
        webhookToken="pager-token",
    )
    with make_test_client(streams=[pager_stream]) as client:
        headers = login_headers(client)
        stream_id = pager_stream.id
        webhook_token = pager_stream.webhookToken

        ingest = client.post(
            f"/api/pager-feeds/{stream_id}?token={webhook_token}",
            json={"message": "Structure fire", "sender": "Dispatch"},
        )
        assert ingest.status_code == 200

        response = client.get(
            f"/api/pager-feeds/{stream_id}/export", headers=headers
        )
        assert response.status_code == 200
        assert response.headers["Content-Type"].startswith("application/zip")

        buffer = BytesIO(response.content)
        with ZipFile(buffer) as archive:
            names = archive.namelist()
            assert "metadata.json" in names
            assert "messages.jsonl" in names
            metadata = json.loads(archive.read("metadata.json").decode("utf-8"))
            assert metadata["streamId"] == stream_id
            records = (
                archive.read("messages.jsonl").decode("utf-8").strip().splitlines()
            )
            assert len(records) == 1


def test_websocket_command_ack(make_test_client):
    audio_stream = StreamConfig(
        id="live-audio",
        name="Live",
        url="http://example.com/live",
        enabled=False,
    )
    with make_test_client(streams=[audio_stream]) as client:
        headers = login_headers(client)
        token = headers["Authorization"].split(" ", 1)[1]
        with client.websocket_connect(f"/ws?token={token}") as websocket:
            request_id = "req-start"
            websocket.send_json(
                {
                    "type": "start_transcription",
                    "streamId": "live-audio",
                    "requestId": request_id,
                }
            )
            received_ack = False
            for _ in range(5):
                message = websocket.receive_json()
                if message.get("type") == "ack":
                    assert message["requestId"] == request_id
                    assert message["action"] == "start_transcription"
                    received_ack = True
                    break
            assert received_ack, "Expected ack response for start_transcription command"


def test_recording_files_served(make_test_client):
    with make_test_client() as client:
        recording = RECORDINGS_DIR / "test-recording.wav"
        payload = b"fake-wav-data"
        try:
            recording.write_bytes(payload)
            response = client.get(f"/recordings/{recording.name}")
            assert response.status_code == 200
            assert response.content == payload
        finally:
            if recording.exists():
                recording.unlink()


def test_server_restart_preserves_stream_states(make_test_client):
    streams = [
        StreamConfig(
            id="one",
            name="One",
            url="http://example.com/one",
            enabled=False,
        ),
        StreamConfig(
            id="two",
            name="Two",
            url="http://example.com/two",
            enabled=False,
        ),
    ]

    with make_test_client(streams=streams) as first_client:
        headers = login_headers(first_client)
        first_client.post("/api/streams/one/start", headers=headers)
        first_client.post("/api/streams/two/start", headers=headers)
        first_client.post("/api/streams/two/stop", headers=headers)

        before_restart = first_client.get("/api/streams").json()
        statuses = {stream["id"]: stream["status"] for stream in before_restart}
        enabled = {stream["id"]: stream["enabled"] for stream in before_restart}
        assert statuses["one"] == StreamStatus.TRANSCRIBING
        assert statuses["two"] == StreamStatus.STOPPED
        assert enabled["one"] is True
        assert enabled["two"] is False

    with make_test_client(streams=streams) as second_client:
        after_restart = second_client.get("/api/streams").json()
        statuses = {stream["id"]: stream["status"] for stream in after_restart}
        enabled = {stream["id"]: stream["enabled"] for stream in after_restart}
        assert statuses["one"] == StreamStatus.TRANSCRIBING
        assert statuses["two"] == StreamStatus.STOPPED
        assert enabled["one"] is True
        assert enabled["two"] is False
