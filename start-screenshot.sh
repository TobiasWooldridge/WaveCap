#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

export WAVECAP_USE_PASSTHROUGH_TRANSCRIBER=1

exec "$ROOT_DIR/start-app.sh" --screenshot-fixtures "$@"
