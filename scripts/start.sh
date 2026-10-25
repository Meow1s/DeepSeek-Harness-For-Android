#!/bin/sh
# Start the DSH Pocket Launcher in the background.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DATA="${DSH_LAUNCHER_DATA:-$ROOT/data}"
HOST="${DSH_LAUNCHER_HOST:-127.0.0.1}"
PORT="${DSH_LAUNCHER_PORT:-3081}"
PIDFILE="$DATA/launcher.pid"
OUT="$DATA/server.out"
NODE_BIN="${NODE_BIN:-node}"

mkdir -p "$DATA/logs"
chmod 700 "$DATA" "$DATA/logs" 2>/dev/null || true
cd "$ROOT"

# Keep DSH's mobile adaptation + view reset bridge present (best effort; DSH can update over it).
if [ -f "$ROOT/scripts/install-dsh-mobile.sh" ]; then
  sh "$ROOT/scripts/install-dsh-mobile.sh" >/dev/null 2>&1 || true
elif [ -f "$ROOT/scripts/install-dsh-reset-page.sh" ]; then
  sh "$ROOT/scripts/install-dsh-reset-page.sh" >/dev/null 2>&1 || true
fi

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE" 2>/dev/null || true)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "DSH 启动器已经在运行: http://127.0.0.1:$PORT/"
    exit 0
  fi
  rm -f "$PIDFILE"
fi

if ! command -v "$NODE_BIN" >/dev/null 2>&1; then
  echo "找不到 node，请先安装 Node.js 22 或更高版本。" >&2
  exit 1
fi

# Optional local environment (for example a DEEPSEEK_API_KEY route).
if [ -f /workspace/.dsh-env ]; then
  . /workspace/.dsh-env
fi

setsid nohup "$NODE_BIN" server.mjs --host "$HOST" --port "$PORT" >>"$OUT" 2>&1 </dev/null &
PID=$!
echo "$PID" >"$PIDFILE"

i=0
while [ "$i" -lt 60 ]; do
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then
    echo "DSH 启动器已就绪: http://127.0.0.1:$PORT/"
    if [ "$HOST" != "127.0.0.1" ] && [ "$HOST" != "localhost" ] && [ "$HOST" != "::1" ]; then
      echo "监听地址: $HOST:$PORT（访问密钥见 $OUT 或 $DATA/access-key）"
    fi
    exit 0
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 0.2
done

rm -f "$PIDFILE"
echo "启动失败，请查看 $OUT" >&2
tail -n 30 "$OUT" >&2 2>/dev/null || true
exit 1
