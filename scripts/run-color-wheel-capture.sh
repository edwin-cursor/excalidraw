#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "${ROOT}/artifacts/screenshots" "${ROOT}/artifacts/video"
SHOT="${ROOT}/artifacts/screenshots/stroke-color-wheel.png"
VIDEO="${ROOT}/artifacts/video/stroke-color-wheel-demo.mp4"

export PUPPETEER_HEADLESS=1
node "${ROOT}/scripts/capture-color-wheel-demo.mjs"

ffmpeg -y -loop 1 -i "${SHOT}" -t 6 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=15" \
  -pix_fmt yuv420p "${VIDEO}"

echo "Artifacts:"
echo "  ${SHOT}"
echo "  ${VIDEO}"
