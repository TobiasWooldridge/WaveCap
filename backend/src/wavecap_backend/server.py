"""FastAPI application factory for the WaveCap backend."""

from __future__ import annotations

import asyncio
import hmac
import io
import json
import logging
import os
from contextlib import asynccontextmanager, suppress
import time
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional, Sequence
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import (
    Body,
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .audio_regression import (
    REGRESSION_AUDIO_SUBDIR,
    REGRESSION_CASES_FILENAME,
    RegressionCaseDefinition,
    generate_case_name,
)

from .auth import AuthManager, AuthenticationError
from .config import ensure_logging_directories, load_config
from .datetime_utils import isoformat_utc, optional_isoformat, parse_iso8601, utcnow
from .database import StreamDatabase
from .logging_utils import configure_logging, record_frontend_event
from .models import (
    AccessDescriptor,
    AccessRole,
    AppConfig,
    ExportTranscriptionsRequest,
    LoginRequest,
    LoginResponse,
    ReviewUpdateRequest,
    Stream,
    StreamSource,
    StreamStatus,
    RemoteIngestServerConfig,
    TranscriptionQueryResponse,
    TranscriptionResult,
    TranscriptionReviewStatus,
    UpdateAlertsRequest,
    UpdateStreamRequest,
)
from .pager_formats import parse_pager_webhook_payload
from .state_paths import PROJECT_ROOT, RECORDINGS_DIR, resolve_state_path
from .request_utils import describe_remote_client
from .stream_manager import StreamManager
from .whisper_transcriber import (
    AbstractTranscriber,
    PassthroughTranscriber,
    WhisperTranscriber,
)
# Note: Avoid importing the optional SDR module at import time.
# Import lazily only when SDR is configured/used.

TRANSCRIBER_ENV_FLAG = "WAVECAP_USE_PASSTHROUGH_TRANSCRIBER"

LOGGER = logging.getLogger(__name__)


def _should_use_passthrough_transcriber() -> bool:
    env_value = os.getenv(TRANSCRIBER_ENV_FLAG)
    if env_value is None:
        return False
    normalized = env_value.strip().lower()
    return normalized in {"1", "true", "yes", "on"}


def _create_transcriber(config: AppConfig) -> AbstractTranscriber:
    if _should_use_passthrough_transcriber():
        LOGGER.warning(
            "Using PassthroughTranscriber because %s is set.", TRANSCRIBER_ENV_FLAG
        )
        return PassthroughTranscriber()
    return WhisperTranscriber(config.whisper)


class AppState:
    def __init__(self, config: AppConfig, fixture_set: Optional[str] = None):
        self.config = config
        self.auth_manager = AuthManager(config.access)
        self.database = StreamDatabase(resolve_state_path("runtime.sqlite"))
        self.transcriber = _create_transcriber(config)
        self.stream_manager = StreamManager(config, self.database, self.transcriber)
        self.fixture_set = fixture_set.strip() if fixture_set else ""
        # SDR devices are no longer configured in WaveCap. Use WaveCap‑SDR.

    async def shutdown(self) -> None:
        await self.stream_manager.shutdown()
        await self.database.close()

    async def load_fixtures(self) -> None:
        if not self.fixture_set:
            return
        from .fixtures import load_fixture_set

        await load_fixture_set(self.fixture_set, self.database)


@lru_cache(maxsize=1)
def get_frontend_dir() -> Path:
    dist_dir = PROJECT_ROOT / "frontend" / "dist"
    return dist_dir


async def stream_events(
    websocket: WebSocket,
    manager: StreamManager,
    auth: AuthManager,
    token: Optional[str],
    initial_role: AccessRole,
) -> None:
    client_label = describe_remote_client(websocket.headers, websocket.client)
    current_role = initial_role
    LOGGER.info(
        "WebSocket connection established from %s with role %s",
        client_label,
        current_role.value,
    )
    queue = await manager.broadcaster.register()
    await websocket.accept()
    LOGGER.debug("WebSocket connection accepted for %s", client_label)

    async def ensure_editor(request_id: Optional[str]) -> bool:
        nonlocal current_role
        try:
            current_role = auth.require_role(token, AccessRole.EDITOR)
            return True
        except AuthenticationError as exc:
            LOGGER.warning(
                "Authorization failure handling command from %s: %s (request_id=%s)",
                client_label,
                exc.message,
                request_id,
            )
            await send_error(exc.message, request_id)
            if exc.status_code == 401:
                await websocket.close(code=4401, reason=exc.message)
            return False

    async def send_events() -> None:
        try:
            while True:
                event = await queue.get()
                payload = jsonable_encoder({"type": event.type, "data": event.payload})
                LOGGER.debug("Sending event %s to %s", event.type, client_label)
                await websocket.send_text(json.dumps(payload))
        except WebSocketDisconnect:
            pass

    async def send_heartbeat(interval_seconds: float = 30.0) -> None:
        """Periodically send a ping message to keep intermediaries from idling out the WebSocket.

        Some reverse proxies (e.g., Cloudflare) close idle WebSocket connections after a short
        period without any frames. Sending a lightweight application-level heartbeat ensures
        there is regular activity so long-lived dashboards stay connected.
        """
        try:
            while True:
                await asyncio.sleep(max(interval_seconds, 5.0))
                try:
                    payload = {"type": "ping", "timestamp": int(time.time() * 1000)}
                    await websocket.send_text(json.dumps(payload))
                except WebSocketDisconnect:
                    break
                except Exception as exc:  # pragma: no cover - defensive
                    # Log and continue; heartbeat failures should not tear down the connection.
                    LOGGER.debug("Heartbeat send failed for %s: %s", client_label, exc)
        except asyncio.CancelledError:
            # Task cancelled during shutdown/cleanup
            pass

    async def send_error(message: str, request_id: Optional[str] = None) -> None:
        LOGGER.warning(
            "WebSocket error for %s: %s (request_id=%s)",
            client_label,
            message,
            request_id,
        )
        payload: dict[str, Any] = {"type": "error", "message": message}
        if request_id:
            payload["requestId"] = request_id
        await websocket.send_text(json.dumps(payload))

    async def handle_command(message: dict[str, Any]) -> None:
        action = message.get("type")
        request_id_value = message.get("requestId")
        request_id = (
            request_id_value
            if isinstance(request_id_value, str) and request_id_value
            else None
        )
        if not isinstance(action, str):
            await send_error("Invalid command payload", request_id)
            return
        LOGGER.debug(
            "Handling WebSocket command %s from %s (request_id=%s)",
            action,
            client_label,
            request_id,
        )
        editor_actions = {
            "start_transcription",
            "stop_transcription",
            "reset_stream",
            "update_stream",
        }
        if action in editor_actions:
            if not await ensure_editor(request_id):
                return
        try:
            if action == "start_transcription":
                # Runtime start via UI is disabled; configuration controls enabled state.
                raise ValueError(
                    "Enable streams via configuration (config.yaml); UI start is disabled"
                )
            elif action == "stop_transcription":
                # Runtime stop via UI is disabled; configuration controls enabled state.
                raise ValueError(
                    "Disable streams via configuration (config.yaml); UI stop is disabled"
                )
            elif action == "reset_stream":
                stream_id = message.get("streamId")
                if not isinstance(stream_id, str) or not stream_id:
                    raise ValueError("streamId is required")
                await manager.reset_stream(stream_id)
            elif action == "update_stream":
                stream_id = message.get("streamId")
                if not isinstance(stream_id, str) or not stream_id:
                    raise ValueError("streamId is required")
                payload = {
                    key: message.get(key)
                    for key in ("name", "language", "ignoreFirstSeconds")
                    if key in message
                }
                request = UpdateStreamRequest.model_validate(payload)
                await manager.update_stream(stream_id, request)
            else:
                raise ValueError(f"Unsupported command: {action}")
        except ValueError as exc:
            LOGGER.warning(
                "Validation error handling command %s from %s: %s",
                action,
                client_label,
                exc,
            )
            await send_error(str(exc), request_id)
            return
        if request_id:
            ack_payload = {"type": "ack", "requestId": request_id, "action": action}
            LOGGER.debug(
                "Sending ack for command %s to %s (request_id=%s)",
                action,
                client_label,
                request_id,
            )
            await websocket.send_text(json.dumps(ack_payload))

    async def receive_commands() -> None:
        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    message = json.loads(raw)
                except json.JSONDecodeError:
                    LOGGER.warning(
                        "Received invalid JSON payload from %s: %s",
                        client_label,
                        raw,
                    )
                    await send_error("Invalid JSON payload")
                    continue
                if not isinstance(message, dict):
                    LOGGER.warning(
                        "Received non-object command from %s: %s",
                        client_label,
                        raw,
                    )
                    await send_error("Command must be an object")
                    continue
                await handle_command(message)
        except WebSocketDisconnect:
            LOGGER.info("WebSocket disconnected for %s", client_label)

    sender = asyncio.create_task(send_events())
    receiver = asyncio.create_task(receive_commands())
    heartbeat = asyncio.create_task(send_heartbeat())
    try:
        await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
    finally:
        for task in (sender, receiver, heartbeat):
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        await manager.broadcaster.unregister(queue)
        LOGGER.debug("Unregistered WebSocket queue for %s", client_label)


FIXTURE_ENV_VAR = "WAVECAP_FIXTURES"


def create_app() -> FastAPI:
    config = load_config()
    ensure_logging_directories(config)
    configure_logging(config.logging)

    fixture_request = os.getenv(FIXTURE_ENV_VAR)
    state = AppState(config, fixture_set=fixture_request)
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        LOGGER.info("Starting WaveCap backend")
        RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
        await state.database.initialize()
        if state.fixture_set:
            LOGGER.info("Applying fixture set '%s'", state.fixture_set)
            await state.load_fixtures()
        await state.stream_manager.initialize()
        try:
            yield
        finally:
            await state.shutdown()
            LOGGER.info("WaveCap backend stopped")

    app = FastAPI(title="WaveCap Backend", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[config.server.corsOrigin] if config.server.corsOrigin else ["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.state = state

    def get_state() -> AppState:
        return state

    def get_auth_manager() -> AuthManager:
        return state.auth_manager

    def get_optional_bearer_token(request: Request) -> Optional[str]:
        authorization = request.headers.get("Authorization")
        if not authorization:
            return None
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        return token.strip()

    def resolve_access_role(
        token: Optional[str] = Depends(get_optional_bearer_token),
        auth: AuthManager = Depends(get_auth_manager),
    ) -> AccessRole:
        try:
            return auth.resolve_role(token)
        except AuthenticationError as exc:
            raise HTTPException(
                status_code=exc.status_code, detail=exc.message
            ) from exc

    def require_editor_role(
        token: Optional[str] = Depends(get_optional_bearer_token),
        auth: AuthManager = Depends(get_auth_manager),
    ) -> AccessRole:
        try:
            return auth.require_role(token, AccessRole.EDITOR)
        except AuthenticationError as exc:
            raise HTTPException(
                status_code=exc.status_code, detail=exc.message
            ) from exc

    @app.get("/api/access", response_model=AccessDescriptor)
    async def access_descriptor(
        token: Optional[str] = Depends(get_optional_bearer_token),
        auth: AuthManager = Depends(get_auth_manager),
    ) -> AccessDescriptor:
        try:
            return auth.describe_access(token)
        except AuthenticationError as exc:
            raise HTTPException(
                status_code=exc.status_code, detail=exc.message
            ) from exc

    @app.post("/api/auth/login", response_model=LoginResponse)
    async def login(
        request: LoginRequest,
        auth: AuthManager = Depends(get_auth_manager),
    ) -> LoginResponse:
        try:
            session = auth.authenticate(request.password, request.identifier)
        except AuthenticationError as exc:
            raise HTTPException(
                status_code=exc.status_code, detail=exc.message
            ) from exc
        return LoginResponse(
            token=session.token, role=session.role, identifier=session.identifier
        )

    @app.post("/api/auth/logout")
    async def logout(
        token: Optional[str] = Depends(get_optional_bearer_token),
        auth: AuthManager = Depends(get_auth_manager),
    ) -> Response:
        auth.invalidate(token)
        return Response(status_code=204)

    @app.get("/api/logging-config")
    async def logging_config(state: AppState = Depends(get_state)) -> dict:
        return {
            "enabled": state.config.logging.enabled,
            "frontend": state.config.logging.frontend.model_dump(by_alias=True),
            "backend": state.config.logging.backend.model_dump(by_alias=True),
        }

    @app.get("/api/ui-config")
    async def ui_config(state: AppState = Depends(get_state)) -> dict:
        return state.config.ui.model_dump(by_alias=True)

    @app.get("/api/combined-stream-views")
    async def combined_stream_views(
        state: AppState = Depends(get_state),
    ) -> list[dict[str, Any]]:
        return [
            view.model_dump(by_alias=True)
            for view in state.config.combinedStreamViews
        ]

    @app.post("/api/logs/frontend")
    async def frontend_log(
        payload: dict, state: AppState = Depends(get_state)
    ) -> Response:
        record_frontend_event(payload, state.config.logging)
        return Response(status_code=204)

    @app.get("/api/alerts")
    async def get_alerts(state: AppState = Depends(get_state)) -> dict:
        return state.config.alerts.model_dump(by_alias=True)

    @app.put("/api/alerts")
    async def update_alerts(
        request: UpdateAlertsRequest,
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
    ) -> dict:
        await state.stream_manager.update_alerts(request)
        return request.model_dump(by_alias=True)

    @app.get("/api/streams", response_model=list[Stream])
    async def list_streams(
        state: AppState = Depends(get_state),
        include_transcriptions: bool = Query(True, alias="includeTranscriptions"),
        max_transcriptions: int | None = Query(None, alias="maxTranscriptions", ge=0),
    ) -> list[Stream]:
        # Only return streams that are present and enabled in configuration
        streams = [s for s in state.stream_manager.get_streams() if s.enabled]
        if not include_transcriptions:
            return [
                stream.model_copy(update={"transcriptions": []}) for stream in streams
            ]

        if max_transcriptions is not None:
            limit = max(0, max_transcriptions)

            if limit == 0:
                return [
                    stream.model_copy(update={"transcriptions": []})
                    for stream in streams
                ]

            return [
                stream.model_copy(
                    update={"transcriptions": stream.transcriptions[:limit]}
                )
                for stream in streams
            ]

        return streams

    @app.patch("/api/streams/{stream_id}", response_model=Stream)
    async def update_stream(
        stream_id: str,
        request: UpdateStreamRequest,
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
    ) -> Stream:
        try:
            return await state.stream_manager.update_stream(stream_id, request)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Stream not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    @app.post("/api/streams/{stream_id}/start")
    async def start_stream(
        stream_id: str,
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
    ) -> Response:
        # Runtime enable is not allowed; configuration controls enabled state.
        raise HTTPException(
            status_code=405,
            detail="Enable streams via configuration (config.yaml); UI start is disabled",
        )

    @app.post("/api/streams/{stream_id}/stop")
    async def stop_stream(
        stream_id: str,
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
    ) -> Response:
        # Runtime disable is not allowed; configuration controls enabled state.
        raise HTTPException(
            status_code=405,
            detail="Disable streams via configuration (config.yaml); UI stop is disabled",
        )

    @app.post("/api/streams/{stream_id}/reset")
    async def reset_stream(
        stream_id: str,
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
    ) -> Response:
        try:
            await state.stream_manager.reset_stream(stream_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return Response(status_code=202)

    @app.get(
        "/api/streams/{stream_id}/transcriptions",
        response_model=TranscriptionQueryResponse,
    )
    async def get_transcriptions(
        stream_id: str,
        state: AppState = Depends(get_state),
        limit: int = 100,
        before: Optional[str] = None,
        after: Optional[str] = None,
        search: Optional[str] = None,
        order: str = "desc",
    ) -> TranscriptionQueryResponse:
        before_dt = parse_iso8601(before) if before else None
        after_dt = parse_iso8601(after) if after else None
        normalized_order = order.lower()
        if normalized_order not in {"asc", "desc"}:
            raise HTTPException(status_code=400, detail="Invalid order parameter")
        return await state.stream_manager.query_transcriptions(
            stream_id,
            limit=limit,
            before=before_dt,
            after=after_dt,
            search=search.strip() if search else None,
            order=normalized_order,
        )

    @app.patch(
        "/api/transcriptions/{transcription_id}/review",
        response_model=TranscriptionResult,
    )
    async def update_review(
        transcription_id: str,
        request: ReviewUpdateRequest,
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
    ) -> TranscriptionResult:
        return await state.stream_manager.update_review(
            transcription_id,
            request.correctedText,
            request.reviewStatus,
            request.reviewer,
        )



    def _normalise_review_text(result: TranscriptionResult) -> str:
        if result.correctedText and result.correctedText.strip():
            return result.correctedText.strip()
        return result.text.strip()
    
    
    def _prepare_regression_artifacts(
        results: Sequence[TranscriptionResult],
    ) -> tuple[list[tuple[Path, str]], list[str]]:
        used_names: set[str] = set()
        audio_entries: list[tuple[Path, str]] = []
        case_lines: list[str] = []
        for result in results:
            text = _normalise_review_text(result)
            if not text:
                LOGGER.debug(
                    "Skipping transcription %s because the text is empty", result.id
                )
                continue
            if not result.recordingUrl:
                LOGGER.debug(
                    "Skipping transcription %s because no recording is associated", result.id
                )
                continue
            source = RECORDINGS_DIR / Path(result.recordingUrl).name
            if not source.exists():
                LOGGER.warning(
                    "Audio file missing for transcription %s: %s", result.id, source
                )
                continue
            timestamp = isoformat_utc(result.timestamp)
            name = generate_case_name(
                stream_id=result.streamId,
                timestamp=timestamp,
                fallback=result.id,
                used_names=used_names,
            )
            arcname = f"{REGRESSION_AUDIO_SUBDIR}/{source.name}"
            audio_entries.append((source, arcname))
            case = RegressionCaseDefinition(
                name=name,
                audio=arcname,
                expected_transcript=text,
                transcription_id=result.id,
                stream_id=result.streamId,
                timestamp=timestamp,
                duration=result.duration,
                review_status=result.reviewStatus.value,
                source_text=result.text,
                reviewed_at=optional_isoformat(result.reviewedAt),
                reviewer=result.reviewedBy,
            )
            case_lines.append(case.to_json())
        return audio_entries, case_lines
    
    
    def _stream_regression_export(
        results: Sequence[TranscriptionResult],
        statuses: Sequence[TranscriptionReviewStatus],
    ) -> StreamingResponse:
        audio_entries, case_lines = _prepare_regression_artifacts(results)
        buffer = io.BytesIO()
        with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
            metadata = {
                "exportedAt": isoformat_utc(utcnow()),
                "statuses": [status.value for status in statuses],
                "count": len(results),
                "cases": len(case_lines),
                "format": "audio-regression",
            }
            archive.writestr("metadata.json", json.dumps(metadata, indent=2))
            archive.writestr(REGRESSION_CASES_FILENAME, "\n".join(case_lines))
            for source, arcname in audio_entries:
                archive.write(source, arcname=arcname)
        buffer.seek(0)
        filename = f"reviewed-transcriptions-regression-{utcnow().strftime('%Y%m%d-%H%M%S')}.zip"
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(buffer, media_type="application/zip", headers=headers)


    @app.get("/api/transcriptions/export")
    async def export_transcriptions(state: AppState = Depends(get_state)) -> list[dict]:
        results = await state.stream_manager.export_transcriptions(
            ExportTranscriptionsRequest()
        )
        return [result.model_dump(by_alias=True) for result in results]

    @app.get("/api/transcriptions/export-reviewed")
    async def export_reviewed_transcriptions(
        request: Request,
        state: AppState = Depends(get_state),
    ) -> StreamingResponse:
        status_params = request.query_params.getlist("status")
        statuses: list[TranscriptionReviewStatus] = []
        for value in status_params:
            try:
                statuses.append(TranscriptionReviewStatus(value))
            except ValueError as exc:
                raise HTTPException(
                    status_code=400, detail=f"Invalid status: {value}"
                ) from exc
        if not statuses:
            statuses = [
                TranscriptionReviewStatus.CORRECTED,
                TranscriptionReviewStatus.VERIFIED,
            ]
        export_format = request.query_params.get("format")
        if export_format and export_format != "regression":
            raise HTTPException(status_code=400, detail="Unsupported export format")
        results = await state.stream_manager.export_transcriptions(
            ExportTranscriptionsRequest(statuses=statuses)
        )
        if export_format == "regression":
            return _stream_regression_export(results, statuses)
        buffer = io.BytesIO()
        with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
            metadata = {
                "exportedAt": isoformat_utc(utcnow()),
                "statuses": [status.value for status in statuses],
                "count": len(results),
            }
            archive.writestr("metadata.json", json.dumps(metadata, indent=2))
            lines = [
                json.dumps(result.model_dump(by_alias=True), ensure_ascii=False)
                for result in results
            ]
            archive.writestr("transcriptions.jsonl", "\n".join(lines))
            for result in results:
                if result.recordingUrl:
                    filename = Path(result.recordingUrl).name
                    file_path = RECORDINGS_DIR / filename
                    if file_path.exists():
                        archive.write(file_path, arcname=f"recordings/{filename}")
        buffer.seek(0)
        filename = f"reviewed-transcriptions-{utcnow().strftime('%Y%m%d-%H%M%S')}.zip"
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(buffer, media_type="application/zip", headers=headers)

    @app.get("/api/pager-feeds/{stream_id}/export")
    async def export_pager_feed(
        stream_id: str,
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
    ) -> StreamingResponse:
        stream = state.stream_manager.streams.get(stream_id)
        if not stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        if stream.source != StreamSource.PAGER:
            raise HTTPException(
                status_code=400, detail="Stream does not accept pager webhooks"
            )

        results = await state.stream_manager.export_pager_messages(stream_id)

        buffer = io.BytesIO()
        with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
            metadata = {
                "exportedAt": isoformat_utc(utcnow()),
                "streamId": stream.id,
                "streamName": stream.name,
                "count": len(results),
            }
            archive.writestr("metadata.json", json.dumps(metadata, indent=2))

            lines: list[str] = []
            for result in results:
                payload = result.model_dump(by_alias=True, mode="json")
                allowed_keys = {"id", "streamId", "timestamp", "text", "pagerIncident"}
                record = {
                    key: payload.get(key)
                    for key in allowed_keys
                    if key in payload
                }
                lines.append(json.dumps(record, ensure_ascii=False))

            archive.writestr("messages.jsonl", "\n".join(lines))

        buffer.seek(0)
        filename = f"pager-feed-{stream.id}-{utcnow().strftime('%Y%m%d-%H%M%S')}.zip"
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(buffer, media_type="application/zip", headers=headers)

    @app.get("/api/streams/{stream_id}/live")
    async def live_audio(
        stream_id: str,
        request: Request,
        state: AppState = Depends(get_state),
    ) -> StreamingResponse:
        stream = state.stream_manager.streams.get(stream_id)
        if not stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        if stream.source not in (StreamSource.AUDIO, StreamSource.REMOTE):
            raise HTTPException(
                status_code=400, detail="Stream does not provide live audio"
            )

        if stream.status != StreamStatus.TRANSCRIBING:
            raise HTTPException(
                status_code=409, detail="Stream is not actively transcribing"
            )
        try:
            iterator = state.stream_manager.iter_live_audio(stream_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=409, detail=str(exc)
            ) from exc

        client_host = "unknown"
        if request.client:
            client_host = f"{request.client.host}:{request.client.port}"
        LOGGER.info(
            "Live audio requested for stream %s by %s",
            stream_id,
            client_host,
        )

        headers = {"Cache-Control": "no-store"}
        return StreamingResponse(iterator, media_type="audio/wav", headers=headers)

    # SDR status endpoint removed; integrate with WaveCap‑SDR for device details.

    @app.websocket("/ws")
    async def websocket_endpoint(
        websocket: WebSocket, state: AppState = Depends(get_state)
    ) -> None:
        token = websocket.query_params.get("token")
        try:
            role = state.auth_manager.resolve_role(token)
        except AuthenticationError as exc:
            await websocket.close(code=4401, reason=exc.message)
            return
        await stream_events(
            websocket, state.stream_manager, state.auth_manager, token, role
        )

    @app.post("/api/pager-feeds/{stream_id}")
    async def ingest_pager_feed(
        stream_id: str,
        payload: dict[str, Any] = Body(..., description="Pager webhook payload"),
        token: str = Query(..., description="Authentication token for the pager feed"),
        format: Optional[str] = Query(
            default=None, description="Optional hint describing the payload format"
        ),
        state: AppState = Depends(get_state),
    ) -> dict:
        stream = state.stream_manager.streams.get(stream_id)
        if not stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        if stream.source != StreamSource.PAGER:
            raise HTTPException(
                status_code=400, detail="Stream does not accept pager webhooks"
            )
        if not stream.webhookToken or not hmac.compare_digest(
            stream.webhookToken, token
        ):
            raise HTTPException(status_code=401, detail="Invalid token")
        try:
            request = parse_pager_webhook_payload(payload, format)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        result = await state.stream_manager.ingest_pager_message(stream_id, request)
        return {"status": "accepted", "transcription": result.model_dump(by_alias=True)}

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok"}

    @app.post("/api/ingest/{stream_id}/audio")
    async def ingest_remote_audio(
        stream_id: str,
        request: Request,
        state: AppState = Depends(get_state),
    ) -> Response:
        """Accepts push-mode remote audio for a REMOTE stream.

        Headers:
          - X-Ingest-Password: required when config.ingest.password is set
          - X-Source-Id: identifier of the upstream within stream.remoteUpstreams (mode==push)
          - X-Audio-Rate: optional integer sample rate hint (must match configured)
        Body: raw PCM bytes (mono s16le or f32 depending on negotiated format)
        """
        cfg: RemoteIngestServerConfig | None = state.config.ingest
        expected_password = (cfg.password.strip() if (cfg and cfg.password) else None)  # type: ignore[union-attr]
        provided = request.headers.get("X-Ingest-Password") or request.headers.get("x-ingest-password")
        if expected_password:
            if not provided or provided.strip() != expected_password:
                raise HTTPException(status_code=401, detail="Invalid ingest password")

        source_id = request.headers.get("X-Source-Id") or request.headers.get("x-source-id")
        if not source_id or not source_id.strip():
            raise HTTPException(status_code=400, detail="Missing X-Source-Id header")

        worker = state.stream_manager.workers.get(stream_id)
        if worker is None:
            raise HTTPException(status_code=409, detail="Stream is not actively transcribing")
        stream = state.stream_manager.streams.get(stream_id)
        if stream is None:
            raise HTTPException(status_code=404, detail="Stream not found")
        if stream.source != StreamSource.REMOTE:
            raise HTTPException(status_code=400, detail="Stream does not accept remote ingest")

        try:
            async for chunk in request.stream():  # type: ignore[attr-defined]
                if not chunk:
                    continue
                await worker.ingest_remote_push(source_id.strip(), bytes(chunk))
        except Exception as exc:  # pragma: no cover - defensive
            LOGGER.warning("Remote ingest error for %s (%s): %s", stream_id, source_id, exc)
            raise HTTPException(status_code=500, detail="Ingest failed") from exc
        return Response(status_code=202)

    if RECORDINGS_DIR.exists():
        app.mount(
            "/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings"
        )

    frontend_dir = get_frontend_dir()
    if frontend_dir.exists():
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

    return app


__all__ = ["create_app"]
