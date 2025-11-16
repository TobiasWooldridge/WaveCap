# WaveCap

A FastAPI + React application for real-time multi-stream audio transcription. The backend orchestrates Whisper-based
transcription, SQLite persistence, and WebSocket updates while the frontend delivers the operator console.

## Quick Start

### Docker

Build the container image and start the service with Docker Compose. The bundled
configuration persists under `state/`, so mounting it into the container keeps
stream definitions, transcripts, and recordings between restarts.

```bash
docker compose up --build
```

The application is available at http://localhost:8000 by default. Override
`state/config.yaml` before the first launch (or edit the mounted file later) to
adjust the host, port, CORS origins, or any other deployment-specific defaults.

To build and run the image manually:

```bash
docker build -t wavecap .
docker run -p 8000:8000 -v $(pwd)/state:/app/state wavecap
```

Radio capture has moved out of this repo. Use WaveCap‑SDR for device control and demodulation, and connect WaveCap to it as a remote audio source. WaveCap no longer bundles SDR drivers or DSP logic.

### Windows
```powershell
pwsh -File start-app.ps1
```

### macOS / Linux
```bash
chmod +x start-app.sh
./start-app.sh
```

The helper script creates a Python virtual environment for the backend, installs dependencies, builds the frontend, and then
launches `uvicorn` on the configured port (defaults to `8000`).

Use `--no-rebuild` with either helper script to reuse installed dependencies and an existing frontend build when the workspace
is already prepared. If required artifacts are missing, the scripts fall back to a full setup automatically.

### Git Hooks

The repository ships the pre-commit hook under `.githooks/pre-commit`. Install it once per clone so commits run TypeScript and
Python type checking automatically:

```bash
git config core.hooksPath .githooks
```

After configuring the custom hook path, the pre-commit hook invokes `npm --prefix frontend run type-check` when TypeScript files
are staged and `poetry -C backend run mypy` for staged Python files.

### Manual Start

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn wavecap_backend.server:create_app --factory --host 0.0.0.0 --port 8000

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

> **Note:** When you change `server.host` or `server.port` in configuration,
> update the manual `uvicorn` command (and the Vite proxy target in
> `frontend/vite.config.ts` for frontend development) to match.

### Jupyter Notebooks

Use the dedicated Dockerfile to spin up a JupyterLab environment with the same
Python dependencies as the backend. Mount the local `notebooks/` directory to
persist any changes you make while working inside the container.

```bash
docker build -f Dockerfile.jupyter -t wavecap-notebooks .
docker run -p 8888:8888 -v $(pwd)/notebooks:/workspace/notebooks wavecap-notebooks
```

JupyterLab becomes available at http://localhost:8888 with authentication
disabled for local development convenience.

### Screenshot fixtures

Need a populated workspace for documentation or pull request screenshots? Launch the backend with the shipped fixture set to
reset the database and preload curated sample streams and transcripts:

```bash
# One-off backend launch
python -m wavecap_backend --screenshot-fixtures

# Helper script on macOS / Linux
./start-app.sh --screenshot-fixtures

# Helper script on Windows
pwsh -File start-app.ps1 --screenshot-fixtures
```

All of the commands above set the `WAVECAP_FIXTURES` environment variable to `screenshot`, which clears
`state/runtime.sqlite` and replaces it with the demo dataset. Provide a different fixture set with
`--fixture-set <name>` as additional fixtures are introduced.

## Access

- **Application**: http://localhost:8000
- **API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/api/health

## Features

- **Multiple Stream Support** – manage multiple audio streams defined in YAML; enable/disable via configuration and Reset from the UI.
- **Real-time Transcription** – live transcription updates delivered over WebSocket.
- **SQLite Persistence** – streams and transcripts survive restarts; recordings are saved as WAV files.
- **Multi-user Awareness** – any number of browsers can monitor the same control plane.
- **Default Stream Catalogue** – preload Broadcastify feeds from configuration files.
- **Reviewed Transcript Exports** – download curated transcripts and their audio as a ZIP archive for downstream workflows.

## Architecture

The system ships as a single FastAPI service that also serves the built frontend bundle:

```
wavecap/
├── backend/                  # Python backend (FastAPI, Whisper integration)
│   ├── src/wavecap_backend/   # Backend source
│   ├── default-config.yaml    # Shipped defaults with inline notes
│   └── pyproject.toml         # Python dependencies & tooling
├── frontend/                 # React frontend
│   ├── src/                  # UI components and TypeScript utilities
│   │   └── types/            # Application data contracts consumed across the frontend
│   └── package.json          # Frontend dependencies
├── state/                    # Persisted configuration and runtime data
│   ├── config.yaml           # User overrides (auto-created from defaults)
│   ├── recordings/           # Saved audio snippets served by the backend
│   └── runtime.sqlite        # SQLite database created at runtime
└── start-app.*               # Startup scripts for each platform
```

## Configuration

Configuration is layered across the backend and the `state/` directory:

- `backend/default-config.yaml` – shipped defaults, expressed in YAML with inline comments that describe every Whisper knob.
- (Optional) `state/default-config.yaml` – deployment-wide defaults that load after the shipped file.
- `state/config.yaml` – user overrides that take precedence when present. When the file is missing, the backend copies the shipped defaults, preserves the inline notes, and swaps placeholder webhook tokens and passwords for freshly generated secrets.

Override any setting in `state/config.yaml` to keep customisations separate from the shipped defaults.

- Streams: define under `streams`. Add/remove streams by editing YAML; there is no UI or API to create or delete streams.
- Pager feeds: define under `streams` with `source: pager` to receive token-protected webhook posts from CAD systems. The generated `state/config.yaml` already includes unique tokens for the sample pager entries.
- Combined views: define under `combinedStreamViews` to merge activity from multiple streams into a single conversation.
 - Remote radio: define `source: remote` with one or more `remoteUpstreams`. Each upstream can be `mode: pull` (WaveCap connects to a remote PCM URL, e.g., a WaveCap‑SDR channel endpoint) or `mode: push` (an external sender POSTs raw PCM to `/api/ingest/{streamId}/audio` with the ingest password). When multiple upstreams are provided, WaveCap automatically uses the highest‑priority active source.
 - Ingest protection: set `ingest.password` to require a password for push‑mode senders. The shipped defaults rotate placeholder passwords automatically when `state/config.yaml` is created.

For detailed guidance on tuning transcription latency versus accuracy, see the
[Configuration & Transcription Tuning Guide](docs/configuration.md).

## API Endpoints

- `GET /api/streams` – list streams and their statuses.
- `POST /api/streams/:id/start` – start transcription.
- `POST /api/streams/:id/stop` – stop transcription.
- `POST /api/streams/:id/reset` – delete history and recordings.
- `GET /api/streams/:id/transcriptions` – paginate transcript history.
- `PATCH /api/transcriptions/:id/review` – update review metadata.
- `GET /api/transcriptions/export-reviewed` – download a ZIP containing JSONL metadata and referenced audio clips.
- `GET /api/health` – service heartbeat.
 - `POST /api/ingest/{streamId}/audio` – accept push PCM audio for a REMOTE stream. Requires `X-Ingest-Password` header (configured under `ingest.password`) and `X-Source-Id` identifying the upstream.

Note: Stream add/remove is configuration-only via YAML, not exposed via UI or public API.

## WebSocket Events

- `streams` – updated stream list.
- `transcription` – new transcription result.

## Development

### Prerequisites
- Python 3.10+
- `ffmpeg`
- Node.js 18+
- npm

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
pytest
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

- **Port 8000 in use** – change the port in `state/config.yaml` under `server.port`.
- **WebSocket errors** – ensure the backend is running and the browser can reach `ws://localhost:8000/ws`.
- **FFmpeg errors** – confirm `ffmpeg` is installed and the stream URL is reachable.
- **Slow transcription** – adjust Whisper model/chunk settings in configuration or use GPU acceleration.

## Notes

- Streams, transcripts, and recordings are stored under the `state/` directory; back it up to retain history.
- Reviewed exports bundle transcripts and audio to simplify downstream labelling workflows.
- The backend exposes the same HTTP API consumed by the frontend, so external automations can interact with it directly.
