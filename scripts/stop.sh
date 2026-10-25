#!/bin/sh
# Stop only the launcher process. A DSH instance it started is left running.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DATA="${DSH_LAUNCHER_DATA:-$ROOT/data}"
PIDFILE="$DATA/launcher.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "DSH 启动器没有在运行。"
  exit 0
fi

PID=$(cat "$PIDFILE" 2>/dev/null || true)
if [ -z "$PID" ] || ! kill -0 "$PID" 2>/dev/null; then
  rm -f "$PIDFILE"
  echo "DSH 启动器没有在运行。"
  exit 0
fi

kill "$PID" 2>/dev/null || true
i=0
while [ "$i" -lt 50 ]; do
  if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PIDFILE"
    echo "DSH 启动器已停止（DSH 实例会继续运行）。"
    exit 0
  fi
  i=$((i + 1))
  sleep 0.2
done

kill -9 "$PID" 2>/dev/null || true
rm -f "$PIDFILE"
echo "DSH 启动器已强制停止。"
