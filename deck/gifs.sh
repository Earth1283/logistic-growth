#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
FRAMES=${FRAMES:-demo/out/frames}
OUT=${OUT:-deck/out/img}
mkdir -p "$OUT"

gif() {
  local name=$1 start=$2 end=$3 crop=$4 width=$5
  ffmpeg -loglevel error -y -start_number "$start" -framerate 60 -i "$FRAMES/%05d.jpg" -frames:v $((end - start)) \
    -vf "crop=$crop,fps=15,scale=$width:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
    -loop 0 "$OUT/$name.gif"
  echo "$name.gif $(du -h "$OUT/$name.gif" | cut -f1)"
}

gif scurve 453 1060 1992:1280:840:520 760
gif slider 1045 1275 2782:1280:50:520 900
gif meteor 1860 2230 1992:1418:840:32 760
gif reindeer 2352 2880 1992:1418:840:32 760
