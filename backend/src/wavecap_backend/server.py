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
from fastapi.responses import FileResponse, Response, StreamingResponse
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
from .state_paths import LOG_DIR, PROJECT_ROOT, RECORDINGS_DIR, resolve_state_path
from .request_utils import describe_remote_client
from .stream_manager import StreamManager
from .whisper_transcriber import (
    AbstractTranscriber,
    PassthroughTranscriber,
    create_transcriber,
)
from .fixtures import available_fixture_sets, normalize_fixture_set_name

TRANSCRIBER_ENV_FLAG = "WAVECAP_USE_PASSTHROUGH_TRANSCRIBER"

LOGGER = logging.getLogger(__name__)


class DependencyError(Exception):
    """Raised when a required dependency is missing or misconfigured."""

    pass


def check_dependencies() -> None:
    """Verify that required external dependencies are available.

    Raises:
        DependencyError: If a required dependency is missing or cannot be used.
    """
    import shutil
    import subprocess

    errors: list[str] = []

    # Check for ffmpeg
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        errors.append(
            "ffmpeg is not installed or not in PATH. "
            "Install with: brew install ffmpeg (macOS) or apt install ffmpeg (Ubuntu)"
        )
    else:
        # Verify ffmpeg can execute
        try:
            result = subprocess.run(
                [ffmpeg_path, "-version"],
                capture_output=True,
                timeout=5,
            )
            if result.returncode != 0:
                errors.append(
                    f"ffmpeg is installed at {ffmpeg_path} but failed to execute"
                )
        except subprocess.TimeoutExpired:
            errors.append(f"ffmpeg at {ffmpeg_path} timed out during version check")
        except Exception as exc:
            errors.append(f"ffmpeg check failed: {exc}")

    # Check for whisper backend availability
    try:
        from .whisper_transcriber import mlx_available

        has_mlx = mlx_available()
    except Exception:
        has_mlx = False

    try:
        import faster_whisper  # noqa: F401

        has_faster_whisper = True
    except ImportError:
        has_faster_whisper = False

    if not has_mlx and not has_faster_whisper:
        errors.append(
            "No whisper backend available. Install faster-whisper (pip install faster-whisper) "
            "or mlx-whisper for Apple Silicon (pip install mlx-whisper)"
        )

    if errors:
        error_msg = "Dependency check failed:\n" + "\n".join(f"  - {e}" for e in errors)
        raise DependencyError(error_msg)


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
    return create_transcriber(config.whisper)


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

    # Shared connection health state
    connection_healthy = True
    last_pong_time = time.time()

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
        nonlocal connection_healthy
        consecutive_send_failures = 0
        max_consecutive_failures = 3
        # If no pong received for this many intervals, consider connection dead
        pong_timeout_intervals = 4  # 4 * 30s = 2 minutes without pong
        intervals_without_pong = 0
        try:
            while True:
                await asyncio.sleep(max(interval_seconds, 5.0))

                # Check if we've received a pong recently
                time_since_pong = time.time() - last_pong_time
                if time_since_pong > interval_seconds * 1.5:
                    intervals_without_pong += 1
                    if intervals_without_pong >= pong_timeout_intervals:
                        LOGGER.warning(
                            "No pong received from %s for %.0fs, closing connection",
                            client_label,
                            time_since_pong,
                        )
                        connection_healthy = False
                        try:
                            await websocket.close(code=1011, reason="Client unresponsive")
                        except Exception:
                            pass
                        break
                else:
                    intervals_without_pong = 0

                try:
                    payload = {"type": "ping", "timestamp": int(time.time() * 1000)}
                    await websocket.send_text(json.dumps(payload))
                    consecutive_send_failures = 0  # Reset on success
                except WebSocketDisconnect:
                    LOGGER.info(
                        "WebSocket disconnected during heartbeat for %s",
                        client_label,
                    )
                    connection_healthy = False
                    break
                except Exception as exc:  # pragma: no cover - defensive
                    consecutive_send_failures += 1
                    LOGGER.warning(
                        "Heartbeat send failed for %s (failure %d/%d): %s",
                        client_label,
                        consecutive_send_failures,
                        max_consecutive_failures,
                        exc,
                    )
                    if consecutive_send_failures >= max_consecutive_failures:
                        LOGGER.warning(
                            "Closing unhealthy WebSocket connection for %s after %d consecutive heartbeat failures",
                            client_label,
                            consecutive_send_failures,
                        )
                        connection_healthy = False
                        try:
                            await websocket.close(code=1011, reason="Heartbeat failed")
                        except Exception:
                            pass  # Connection may already be closed
                        break
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
        nonlocal last_pong_time
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
                # Handle pong responses from client to track connection health
                msg_type = message.get("type")
                if msg_type == "pong":
                    last_pong_time = time.time()
                    LOGGER.debug("Received pong from %s", client_label)
                    continue
                await handle_command(message)
        except WebSocketDisconnect:
            LOGGER.info("WebSocket disconnected for %s", client_label)

    sender = asyncio.create_task(send_events())
    receiver = asyncio.create_task(receive_commands())
    heartbeat = asyncio.create_task(send_heartbeat())
    try:
        # Include heartbeat in wait so connection closes when heartbeat detects issues
        done, pending = await asyncio.wait(
            {sender, receiver, heartbeat},
            return_when=asyncio.FIRST_COMPLETED,
        )
        # Log which task completed first for debugging
        for task in done:
            task_name = "unknown"
            if task is sender:
                task_name = "sender"
            elif task is receiver:
                task_name = "receiver"
            elif task is heartbeat:
                task_name = "heartbeat"
            LOGGER.debug(
                "WebSocket task '%s' completed first for %s",
                task_name,
                client_label,
            )
    finally:
        for task in (sender, receiver, heartbeat):
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        await manager.broadcaster.unregister(queue)
        LOGGER.debug("Unregistered WebSocket queue for %s", client_label)


FIXTURE_ENV_VAR = "WAVECAP_FIXTURES"


def _read_log_tail(path: Path, max_lines: int) -> list[str]:
    """Read the last N lines from a log file efficiently."""
    import collections

    if not path.exists():
        return []

    result: collections.deque[str] = collections.deque(maxlen=max_lines)
    try:
        with path.open("r", encoding="utf-8", errors="replace") as f:
            for line in f:
                stripped = line.rstrip("\n\r")
                if stripped:
                    result.append(stripped)
    except Exception:
        # Fall back to reading whole file if streaming fails
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
            lines = [l for l in content.splitlines() if l.strip()]
            return lines[-max_lines:]
        except Exception:
            return []

    return list(result)


def create_app() -> FastAPI:
    # Check dependencies before anything else
    check_dependencies()

    config = load_config()
    ensure_logging_directories(config)
    configure_logging(config.logging)

    fixture_request_raw = (os.getenv(FIXTURE_ENV_VAR) or "").strip()
    fixture_request = ""
    if fixture_request_raw:
        normalized = normalize_fixture_set_name(fixture_request_raw)
        available = set(available_fixture_sets())
        if normalized not in available:
            readable = ", ".join(sorted(available)) or "none"
            raise RuntimeError(
                f"Unknown fixture set '{fixture_request_raw}'. Available sets: {readable}."
            )
        fixture_request = normalized

    state = AppState(config, fixture_set=fixture_request)
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        LOGGER.info("Starting WaveCap backend")
        RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
        await state.database.initialize()
        if state.fixture_set:
            LOGGER.info("Applying fixture set '%s'", state.fixture_set)
            try:
                await state.load_fixtures()
            except Exception:
                LOGGER.exception(
                    "Failed to load fixture set '%s' during startup", state.fixture_set
                )
                raise
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

    @app.get("/api/logs/backend")
    async def get_backend_logs(
        state: AppState = Depends(get_state),
        _: AccessRole = Depends(require_editor_role),
        lines: int = Query(500, ge=1, le=5000),
        source: str = Query("all", pattern="^(all|app|stderr)$"),
    ) -> dict:
        """Fetch recent backend log entries. Requires editor role.

        Args:
            lines: Maximum number of lines to return (default 500, max 5000)
            source: Log source - "all" (both), "app" (backend.log), "stderr" (service stderr)
        """
        from pathlib import Path
        import os

        log_entries: list[dict] = []

        # Application log (state/logs/backend.log)
        if source in ("all", "app"):
            app_log_path = LOG_DIR / state.config.logging.backend.fileName
            if app_log_path.exists():
                try:
                    app_lines = _read_log_tail(app_log_path, lines)
                    for line in app_lines:
                        log_entries.append({"source": "app", "line": line})
                except Exception as exc:
                    log_entries.append({"source": "app", "line": f"[Error reading log: {exc}]"})

        # Service stderr log (launchd output)
        if source in ("all", "stderr"):
            stderr_log_path = Path.home() / "Library" / "Logs" / "wavecap-server-error.log"
            if stderr_log_path.exists():
                try:
                    stderr_lines = _read_log_tail(stderr_log_path, lines)
                    for line in stderr_lines:
                        log_entries.append({"source": "stderr", "line": line})
                except Exception as exc:
                    log_entries.append({"source": "stderr", "line": f"[Error reading log: {exc}]"})

        # Sort by rough timestamp if present, otherwise keep order
        # Filter to most recent `lines` entries total
        if source == "all" and len(log_entries) > lines:
            log_entries = log_entries[-lines:]

        return {
            "entries": log_entries,
            "total": len(log_entries),
            "maxLines": lines,
        }

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

    # Serve favicon.ico from favicon.svg to prevent 404s
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        favicon_path = frontend_dir / "favicon.svg"
        if favicon_path.exists():
            return FileResponse(
                favicon_path,
                media_type="image/svg+xml",
                headers={"Cache-Control": "public, max-age=86400"},
            )
        raise HTTPException(status_code=404, detail="Favicon not found")

    # Serve robots.txt to prevent 404s
    @app.get("/robots.txt", include_in_schema=False)
    async def robots_txt():
        return Response(
            content="User-agent: *\nDisallow: /api/\nDisallow: /ws\n",
            media_type="text/plain",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    if frontend_dir.exists():
        # Use StaticFiles for reliability - cache headers should be set in nginx/Cloudflare
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    else:
        LOGGER.warning(
            "Frontend build directory missing at %s; serving API without UI assets.",
            frontend_dir,
        )

    return app


__all__ = ["create_app"]
