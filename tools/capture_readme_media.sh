#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8010}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/media"
mkdir -p "$OUT"

cd "$ROOT"
python3 -m http.server "$PORT" >/tmp/morningstar_media_server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
sleep 1

for PHASE in 1 2 3; do
  chromium --headless=new --no-sandbox --disable-dev-shm-usage \
    --window-size=1280,720 --virtual-time-budget=5000 \
    --run-all-compositor-stages-before-draw \
    --screenshot="$OUT/phase_${PHASE}.png" \
    "http://127.0.0.1:${PORT}/index.html?scene=boss&phase=${PHASE}"
done

echo "Screenshots written to $OUT"
echo "Record a short GIF manually from the same URLs, or use your preferred screen recorder."
