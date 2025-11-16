#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"
FIXTURE_SET=""
SKIP_REBUILD=false
SKIP_BACKEND_REBUILD=false
SKIP_FRONTEND_REBUILD=false

require_command() {
  local cmd="$1"
  local help="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    [ -n "$help" ] && echo "$help" >&2
    exit 1
  fi
}

check_python_version() {
  local python_bin="$1"
  local version
  version=$("$python_bin" - <<'PY'
import sys
print(f"{sys.version_info.major}.{sys.version_info.minor}")
PY
  )
  local major=${version%%.*}
  local minor=${version#*.}
  if [ -z "$major" ] || [ -z "$minor" ] || [ "$major" -lt 3 ] || { [ "$major" -eq 3 ] && [ "$minor" -lt 10 ]; }; then
    echo "Python 3.10+ is required; detected $version from $python_bin" >&2
    exit 1
  fi
}

validate_fixture_set() {
  local name="$1"
  if [ -z "$name" ]; then
    return
  fi

  local normalized
  if ! normalized=$(
    cd "$BACKEND_DIR" &&
      python - "$name" <<'PY'
from __future__ import annotations

import sys

from wavecap_backend.fixtures import available_fixture_sets, normalize_fixture_set_name

requested = sys.argv[1]
canonical = normalize_fixture_set_name(requested)
available = available_fixture_sets()
if canonical not in available:
    print(
        f"Unknown fixture set '{requested}'. Available sets: {', '.join(available)}",
        file=sys.stderr,
    )
    sys.exit(1)

print(canonical)
PY
  ); then
    echo "Unable to validate fixture set '$name'." >&2
    exit 1
  fi

  FIXTURE_SET="$normalized"
}

while (($#)); do
  case "$1" in
    --screenshot-fixtures)
      FIXTURE_SET="screenshot"
      shift
      ;;
    --no-rebuild)
      SKIP_REBUILD=true
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

if [ "$SKIP_REBUILD" = true ]; then
  SKIP_BACKEND_REBUILD=true
  SKIP_FRONTEND_REBUILD=true
fi

require_command "python3" "Install Python 3.10+ and ensure python3 is on your PATH."
require_command "npm" "Install Node.js (which includes npm). Version 10+ is required."
require_command "curl" "Install curl so pip can be bootstrapped when needed."

check_python_version "python3"

printf "Starting Multi-Stream WaveCap Application...\n\n"

# Check npm version
NPM_VERSION=$(npm --version | cut -d. -f1)
if ! [[ "$NPM_VERSION" =~ ^[0-9]+$ ]]; then
  echo "Unable to determine npm version (got '$NPM_VERSION')." >&2
  exit 1
fi
USE_NPX_NPM=false
if [ "$NPM_VERSION" -lt 10 ]; then
  echo "npm version $NPM_VERSION detected. This project requires npm >=10.0.0."
  echo "Will use npx to run a compatible npm version for installation."
  USE_NPX_NPM=true
  echo ""
fi


echo "Setting up Python environment..."
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
check_python_version "python"
# Ensure pip is available in the venv even on externally-managed systems
# 1) Try ensurepip (may be unavailable on some Debian/Ubuntu installs)
python -m ensurepip --upgrade >/dev/null 2>&1 || true
# 2) If pip is still missing, bootstrap with get-pip
if ! command -v pip >/dev/null 2>&1; then
  echo "Bootstrapping pip in virtualenv..."
  curl -fsSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
  python /tmp/get-pip.py >/dev/null
  rm -f /tmp/get-pip.py
fi

# Always invoke pip via the venv's python for reliability
if [ "$SKIP_BACKEND_REBUILD" = true ] && [ ! -f "$VENV_DIR/bin/activate" ]; then
  echo "--no-rebuild requested but virtual environment missing; installing dependencies."
  SKIP_BACKEND_REBUILD=false
fi

if [ "$SKIP_BACKEND_REBUILD" = true ]; then
  if ! python - <<'PY' >/dev/null 2>&1
from __future__ import annotations

import importlib

if importlib.util.find_spec("wavecap_backend") is None:
    raise SystemExit(1)
PY
  then
    echo "--no-rebuild requested but backend dependencies are missing; installing them."
    SKIP_BACKEND_REBUILD=false
  fi
fi

if [ "$SKIP_BACKEND_REBUILD" = true ]; then
  echo "Skipping backend dependency installation (--no-rebuild)."
else
  python -m pip install --upgrade pip >/dev/null
  (cd "$BACKEND_DIR" && python -m pip install -e .)
fi
echo

validate_fixture_set "$FIXTURE_SET"

echo "Installing frontend dependencies..."
if [ "$SKIP_FRONTEND_REBUILD" = true ] && [ ! -d "$FRONTEND_DIR/dist" ]; then
  echo "--no-rebuild requested but $FRONTEND_DIR/dist is missing; rebuilding frontend."
  SKIP_FRONTEND_REBUILD=false
fi

if [ "$SKIP_FRONTEND_REBUILD" = true ]; then
  echo "Reusing existing frontend build (--no-rebuild)."
else
  # Clean npm cache to avoid corruption issues
  if [ "$USE_NPX_NPM" = true ]; then
    npx --yes npm@latest cache clean --force >/dev/null 2>&1
  else
    npm cache clean --force >/dev/null 2>&1
  fi

  if [ -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Removing existing node_modules for clean install..."
    # Try normal rm first, if it fails use find with force delete
    if ! rm -rf "$FRONTEND_DIR/node_modules" 2>/dev/null; then
      echo "Standard removal failed, using alternative method..."
      find "$FRONTEND_DIR/node_modules" -type f -delete 2>/dev/null || true
      find "$FRONTEND_DIR/node_modules" -type d -delete 2>/dev/null || true
      rm -rf "$FRONTEND_DIR/node_modules" 2>/dev/null || true
    fi
  fi

  # Use npx npm@latest if local npm is too old
  if [ "$USE_NPX_NPM" = true ]; then
    (cd "$FRONTEND_DIR" && npx --yes npm@latest ci --include=dev --legacy-peer-deps)
  else
    # Install exact lockfile with dev deps to ensure TypeScript/Vite present
    (cd "$FRONTEND_DIR" && npm ci --include=dev)
  fi
  echo

  echo "Building frontend bundle..."
  if ! (cd "$FRONTEND_DIR" && npm run build); then
    echo "Frontend build failed. Aborting." >&2
    exit 1
  fi
  if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo "Frontend build artifacts not found at $FRONTEND_DIR/dist after build." >&2
    exit 1
  fi
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

# Replace the shell with uvicorn so it receives signals directly (Ctrl+C, SIGTERM)
exec uvicorn wavecap_backend.server:create_app --factory --host "$HOST" --port "$PORT"
