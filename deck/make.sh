#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=${OUT:-media/logistic-growth-unhinged.pptx}
BUNDLE=${BUNDLE:-media/logistic-growth-unhinged.zip}
IMG=deck/out/img
PORT=9093

[ -d demo/out/frames ] || { echo "run demo/make.sh first: the GIFs and trailer reuse its footage" >&2; exit 1; }
mkdir -p "$IMG" "$(dirname "$OUT")"

npx vite build >/dev/null
npx vite preview --port $PORT --strictPort >/dev/null 2>&1 &
server=$!
trap 'kill $server' EXIT
until curl -s "localhost:$PORT" >/dev/null; do sleep 0.2; done
DEMO_URL="http://localhost:$PORT/" node deck/assets.mjs "$IMG"

./deck/gifs.sh
python3 deck/art.py "$IMG" 31
ffmpeg -loglevel error -y -ss 20 -i media/product-demo.mp4 -frames:v 1 -vf scale=1280:-1 "$IMG/trailer_cover.png"
ffmpeg -loglevel error -y -i media/product-demo.mp4 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart deck/out/trailer.mp4

node deck/build.mjs deck/out/deck.pptx
python3 deck/finalize.py deck/out/deck.pptx "$OUT"

python3 - "$OUT" "$BUNDLE" <<'PY'
import sys, zipfile
from pathlib import Path
deck, bundle = map(Path, sys.argv[1:])
with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(deck, deck.name)
    for f in sorted(Path('deck/fonts').iterdir()):
        z.write(f, f'fonts/{f.name}')
PY
echo "wrote $OUT and $BUNDLE"
