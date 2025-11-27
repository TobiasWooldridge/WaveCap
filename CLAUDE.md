# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WaveCap is a browser-based control console for monitoring and transcribing multiple radio or pager feeds in real time. It uses Whisper-based speech recognition (faster-whisper or mlx-whisper on Apple Silicon) to transcribe audio streams and provides a React frontend for operators to monitor, search, and review transcriptions.

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

### Data Flow

1. Audio streams (HTTP/remote) are ingested by `stream_worker.py`
2. Audio is chunked based on silence detection and duration thresholds
3. Chunks are queued to `transcription_executor.py` for Whisper processing
4. Results are persisted to SQLite and broadcast via WebSocket
5. Frontend receives events and updates React Query cache

### Configuration

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

Backend tests use pytest-asyncio with in-memory SQLite. Mock Whisper when testing transcription flow. Frontend tests run via custom runner in `scripts/run-tests.mjs`.

## Additional Guidance

See `AGENTS.md` for coding principles, documentation expectations, and workflow notes. Treat `SPEC.md` as the authoritative product specification.
