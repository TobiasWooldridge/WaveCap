#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"
FIXTURE_SET=""

while (($#)); do
  case "$1" in
    --screenshot-fixtures)
      FIXTURE_SET="screenshot"
      shift
      ;;
    --fixture-set)
      if [ $# -lt 2 ]; then
        echo "--fixture-set requires a value" >&2
        exit 1
      fi
      FIXTURE_SET="$2"
      shift 2
      ;;
    --fixture-set=*)
      FIXTURE_SET="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

printf "Starting Multi-Stream WaveCap Application...\n\n"

echo "Setting up Python environment..."
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip >/dev/null
(cd "$BACKEND_DIR" && pip install -e .)
echo

echo "Installing frontend dependencies..."
(cd "$FRONTEND_DIR" && npm install)
echo

echo "Building frontend bundle..."
if ! (cd "$FRONTEND_DIR" && npm run build); then
  echo "Frontend build failed. Aborting." >&2
  exit 1
fi
echo

if [ -n "$FIXTURE_SET" ]; then
  export WAVECAP_FIXTURES="$FIXTURE_SET"
  echo "Loading fixture set '$FIXTURE_SET' before launch (existing state will be replaced)."
fi

echo "Launching backend server..."
HOST=$(python -c "from wavecap_backend.config import load_config; print(load_config().server.host)")
PORT=$(python -c "from wavecap_backend.config import load_config; print(load_config().server.port)")
echo "Backend listening on ${HOST}:${PORT}"
uvicorn wavecap_backend.server:create_app --factory --host "$HOST" --port "$PORT"
