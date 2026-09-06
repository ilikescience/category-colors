#!/bin/sh
# Score palettes on Colorgorical's four criteria inside Docker.
#   echo '[["#ff0000","#00ff00","#0000ff"]]' | bench/colorgorical/score.sh
#   bench/colorgorical/score.sh --samples > bench/colorgorical/samples.json
# Builds the image on first use (a few minutes; downloads ~1GB).
set -e
dir=$(cd "$(dirname "$0")" && pwd)
image=colorgorical-scorer
if [ -z "$(docker images -q "$image")" ]; then
  docker build -q --platform linux/amd64 -t "$image" "$dir" >&2
fi
exec docker run --rm -i --platform linux/amd64 "$image" "$@"
