# WaveCap Backend (Python)

This backend is implemented with [FastAPI](https://fastapi.tiangolo.com/) and
`faster-whisper` to provide the transcription and stream control APIs used by the
multi-stream WaveCap application.

## Development Setup

1. Install Python 3.10 or newer and `ffmpeg`.
2. Create a virtual environment: `python -m venv .venv`.
3. Activate the environment and install dependencies: `pip install -e .[dev]`.
4. Review `backend/default-config.yaml` and adjust overrides in `state/config.yaml` as needed. The override file is created automatically on first run, but you can create it manually if you want to customise settings up front.

Run the server locally with:

```bash
uvicorn wavecap_backend.server:create_app --factory --reload
```

### Screenshot/demo fixtures

To capture UI screenshots without wiring up live audio streams, launch the backend with the curated fixture set. The command
below clears `state/runtime.sqlite`, inserts sample streams and transcripts, and writes placeholder recording files so the UI
looks populated immediately:

```bash
python -m wavecap_backend --screenshot-fixtures
```

The helper scripts at the repository root accept the same flag (`./start-app.sh --screenshot-fixtures` or
`pwsh -File start-app.ps1 --screenshot-fixtures`). You can also set the `WAVECAP_FIXTURES` environment variable to a fixture set name
when starting Uvicorn manually:

```bash
WAVECAP_FIXTURES=screenshot uvicorn wavecap_backend.server:create_app --factory
```

Run `python -m wavecap_backend --help` to confirm the available fixture sets and CLI shortcuts before capturing new
screenshots. The help output lists `--screenshot-fixtures` alongside `--fixture-set <name>` so future datasets appear without
editing scripts.

Run the automated tests:

```bash
pytest
```

## Export reviewed transcriptions

Reviewed corrections can be exported to a JSONL dataset (with optional audio copies) that is ready for Whisper fine-tuning:

```bash
python -m wavecap_backend.tools.export_transcriptions --output-dir state/exports/whisper-dataset
```

Run the command from the repository root or inside `backend/` with `PYTHONPATH=src`. The output directory will contain
`transcriptions.jsonl`, a `metadata.json` summary, and an `audio/` folder when audio files are copied. Open the
`notebooks/whisper_finetuning.ipynb` notebook for an end-to-end walkthrough of preparing the dataset with 🤗 Transformers.

The backend expects the frontend build output under
`../frontend/dist`. `start-app.sh` and `start-app.ps1` take care of building the frontend bundle and
then launch the backend.
