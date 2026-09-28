#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
WORK=${WORK:-demo/out}
OUT=${OUT:-media/product-demo.mp4}
PORT=9092

mkdir -p demo/fonts "$(dirname "$OUT")"
fetch_font() {
  [ -s "demo/fonts/$1" ] && return
  url=$(curl -s "https://fonts.googleapis.com/css2?family=$2" | grep -o 'https://[^)]*\.ttf' | head -1)
  curl -s -o "demo/fonts/$1" "$url"
}
fetch_font Hanken-Medium.ttf 'Hanken+Grotesk:wght@500'
fetch_font Hanken-SemiBold.ttf 'Hanken+Grotesk:wght@600'
fetch_font STIX-SemiBold.ttf 'STIX+Two+Text:wght@600'
fetch_font STIX-Italic.ttf 'STIX+Two+Text:ital,wght@1,400'

if [ -z "${SKIP_CAPTURE:-}" ]; then
  npx vite build
  npx vite preview --port $PORT --strictPort >/dev/null 2>&1 &
  server=$!
  trap 'kill $server' EXIT
  until curl -s "localhost:$PORT" >/dev/null; do sleep 0.2; done
  DEMO_URL="http://localhost:$PORT/" node demo/capture.mjs "$WORK/frames"
fi

python3 demo/render.py "$WORK"

intro=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/intro.mp4")
main=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/main.mp4")
ffmpeg -y -loglevel error -i "$WORK/intro.mp4" -i "$WORK/main.mp4" -i "$WORK/outro.mp4" -filter_complex "
  [0][1]xfade=transition=fade:duration=0.5:offset=$(awk "BEGIN{print $intro - 0.5}")[a];
  [a][2]xfade=transition=fade:duration=0.6:offset=$(awk "BEGIN{print $intro - 0.5 + $main - 0.6}")[v]" \
  -map '[v]' -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "$OUT"
echo "wrote $OUT"
