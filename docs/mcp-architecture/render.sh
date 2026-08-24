#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$ROOT/m-linx-mcp-architecture.pdf}"
DATA_DIR="$(mktemp -d /tmp/chrome-mcp-pdf.XXXXXX)"
cleanup() { rm -rf "$DATA_DIR"; }
trap cleanup EXIT

timeout 25s google-chrome \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --disable-extensions \
  --disable-background-networking \
  --disable-sync \
  --disable-component-update \
  --metrics-recording-only \
  --user-data-dir="$DATA_DIR" \
  --no-pdf-header-footer \
  --print-to-pdf="$OUT" \
  "file://$ROOT/index.html"

echo "Wrote $OUT"
