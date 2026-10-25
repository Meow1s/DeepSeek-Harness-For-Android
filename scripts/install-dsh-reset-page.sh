#!/bin/sh
# Install the DSH-origin "back to chat" bridge page into the DSH web frontend.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE="$ROOT/public/dsh-pocket-reset.html"
DEFAULT_DIST=/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist
DIST="${DSH_WEB_FRONTEND_DIST:-$DEFAULT_DIST}"

if [ ! -f "$DIST/index.html" ]; then
  FOUND=$(find /usr/local/lib/node_modules/@deepseek-ai/dsh -path '*/dsh-web-frontend/dist/index.html' -print 2>/dev/null | head -n1 || true)
  if [ -n "$FOUND" ]; then
    DIST=$(dirname "$FOUND")
  fi
fi

if [ ! -f "$DIST/index.html" ]; then
  echo "找不到 DSH Web 前端 dist，跳过视图重置页安装。" >&2
  exit 1
fi
if [ ! -f "$SOURCE" ]; then
  echo "找不到 $SOURCE" >&2
  exit 1
fi

cp "$SOURCE" "$DIST/dsh-pocket-reset.html"
chmod 644 "$DIST/dsh-pocket-reset.html"
echo "已安装: $DIST/dsh-pocket-reset.html"
