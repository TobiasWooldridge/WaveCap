# Repository Guidance

## Project Overview
WaveCap is a browser-based control console for monitoring and transcribing multiple radio or pager feeds in real time. It uses Whisper-based speech recognition to transcribe audio streams and provides a React frontend for operators to monitor, search, and review transcriptions.

## Development Commands

### Backend (Python/FastAPI)

```bash
# From repository root or backend/
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e .[dev]

# Run server with hot reload
uvicorn wavecap_backend.server:create_app --factory --reload

# Run tests
pytest

# Run with demo fixtures (for screenshots/testing)
python -m wavecap_backend --screenshot-fixtures
# or
WAVECAP_FIXTURES=screenshot uvicorn wavecap_backend.server:create_app --factory
```

### Frontend (TypeScript/React/Vite)

```bash
cd frontend
npm ci
npm run build        # Production build (runs tsc then vite build)
npm run dev          # Development server
npm run lint         # ESLint
npm run type-check   # TypeScript checking only
npm run test         # Run tests
```

### Full Application

```bash
# Build frontend and start backend (creates venv, installs deps)
./start-app.sh              # macOS/Linux
pwsh -File start-app.ps1    # Windows

# Skip rebuild if assets exist
./start-app.sh --no-rebuild

# Screenshots with fixture data
./start-screenshot.sh
```

## Architecture

### Backend (`backend/src/wavecap_backend/`)

- **server.py**: FastAPI application factory with WebSocket support for real-time updates
- **stream_manager.py**: Orchestrates stream lifecycle, coordinates workers, and broadcasts events
- **stream_worker.py**: Per-stream worker handling audio ingest, chunking, and transcription coordination
- **whisper_transcriber.py**: Abstraction over faster-whisper and mlx-whisper backends
- **transcription_executor.py**: Concurrent transcription job execution
- **database.py**: SQLite persistence via SQLModel/aiosqlite
- **config.py**: YAML configuration loading from `state/config.yaml`
- **models.py**: Pydantic models shared between API and internal logic
- **pager_formats.py**: Parsers for CAD/pager webhook payloads (CFS Flex format)
- **llm_corrector.py**: Optional LLM-based post-transcription correction

### Frontend (`frontend/src/`)

- **App.tsx**: Root component with routing and context providers
- **components/StreamSidebar.react.tsx**: Stream list with status badges and navigation
- **components/StreamTranscriptionPanel.react.tsx**: Main transcript view with playback
- **components/CombinedTranscriptionLog.react.tsx**: Merged view for combined streams
- **components/PagerTranscriptTable.react.tsx**: Incident-grouped pager message display
- **hooks/useWebSocket.ts**: Real-time event subscription
- **hooks/useTranscriptions.ts**: Paginated transcript fetching with infinite scroll
- **hooks/useTranscriptionAudioPlayback.ts**: Audio segment playback coordination
- **contexts/**: Auth, toast notifications, UI settings, live audio state

## Data Flow
1. Audio streams (HTTP/remote) are ingested by `stream_worker.py`
2. Audio is chunked based on silence detection and duration thresholds
3. Chunks are queued to `transcription_executor.py` for Whisper processing
4. Results are persisted to SQLite and broadcast via WebSocket
5. Frontend receives events and updates React Query cache

## Configuration
- **backend/default-config.yaml**: Shipped defaults (copied to `state/config.yaml` on first run)
- **state/config.yaml**: Runtime configuration (streams, whisper settings, UI preferences)
- **state/runtime.sqlite**: Persistent database
- **state/recordings/**: WAV audio files

## Key Patterns
- Streams are defined in `state/config.yaml`, not created via UI
- UI start/stop controls are disabled; enable streams in configuration
- Combined stream views merge transcripts from multiple sources
- Pager feeds accept webhook POSTs with optional `format=cfs-flex` for CAD parsing
- WebSocket at `/ws` broadcasts all stream and transcription events

## Testing
- Backend tests use pytest-asyncio with in-memory SQLite. Mock Whisper when testing transcription flow.
- Frontend tests run via the custom runner in `scripts/run-tests.mjs`.

## Coding Principles
- Prefer strong typing throughout the codebase. When working in TypeScript or other typed languages, enable and respect strict compiler settings, and add explicit types where inference would be ambiguous.
- Favor semantic CSS class names that convey component intent and structure rather than visual appearance alone.
- Write tests where appropriate. Avoid mocking critical business logic unless interacting with components that are impractical to test directly (e.g., external databases or heavyweight libraries such as Whisper).
- When adding new functionality, include tests that exercise the real code paths whenever feasible; keep mocking to the minimum necessary to make the tests reliable.
- When extracting or adding primitive UI components, ensure they encapsulate their default styling and behaviors. Prefer purposeful props over requiring every call site to re-specify base class names or configuration that should live inside the primitive.

## Documentation Expectations
- Treat `SPEC.md` as the authoritative reference for the product. When adding, modifying, or removing functionality, make corresponding updates (even small ones) so the specification stays current.
- Ensure every meaningful configuration option is represented in the project's configuration files and documented in `docs/configuration.md`.
 - Do not boast about the technology stack. In user-facing docs, focus on outcomes and workflows; avoid naming frameworks/libraries unless strictly required for setup or troubleshooting.

## Workflow Notes
- Do not create or commit unnecessary images (e.g., PNG/JPG/JPEG) when updating documentation or workflows.
- Always run the relevant linters and tests for the areas you change.
- Follow repository-specific instructions in nested `AGENTS.md` files if present; their scope applies to the directory in which they reside and its descendants.
- Run all required project checks and tests after making changes.
- Before publishing a change for review, run the full automated test suite locally and confirm it passes without failures.
- Keep the working tree clean by committing meaningful changes with clear messages.
- Keep marketing language out of project documentation. Do not add unnecessary emoji or self-promotional content to `README.md` or related docs when describing the tech stack.
- Before finalizing any suggested changes, run `git pull` to ensure the local branch is synchronized with the remote repository.
- Always validate that the code compiles before completing a task:
  - Backend: from `backend/`, ensure deps are installed (`pip install -e .[dev]`) and run `pytest`.
  - Frontend: from `frontend/`, run `npm ci && npm run build` to verify TypeScript and bundle build succeed without errors.
  - Do not mark work as complete if either layer fails to compile/build.
- Include at least one screenshot in every pull request description. Capture it with the `browser_container` tool when the change affects the UI; otherwise provide a relevant static view. When a pull request adds or modifies demo/screenshot fixtures or otherwise prepares specific UI states, include a browser-based capture of the web UI that demonstrates the scenario, even if the code changes live exclusively in the backend. Example: if you only adjust demo seed data for a conversation list, still start the app and attach a screenshot that shows the seeded conversations rendered in the interface.
- Use `./start-screenshot.sh` when preparing captures. The script delegates to `start-app.sh` with screenshot fixtures and enables a passthrough transcriber so Whisper models are never downloaded in this environment.
- Push back on requests that would substantially bloat complexity or pull the product away from its defined purpose.
