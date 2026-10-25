#!/bin/sh
# Print launcher and DSH status.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DATA="${DSH_LAUNCHER_DATA:-$ROOT/data}"
PORT="${DSH_LAUNCHER_PORT:-3081}"
PIDFILE="$DATA/launcher.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE" 2>/dev/null || true)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "launcher: running (pid $PID) http://127.0.0.1:$PORT/"
  else
    echo "launcher: stopped (stale pid file)"
  fi
else
  echo "launcher: stopped"
fi

if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:$PORT/api/status" 2>/dev/null | node -e '
    let s = ""
    process.stdin.on("data", (d) => { s += d })
    process.stdin.on("end", () => {
      try {
        const data = JSON.parse(s)
        const d = data.dsh
        console.log("phase: " + data.phase)
        if (d) console.log("dsh: " + d.host + ":" + d.port + " (" + (d.external ? "external" : "managed") + ", token=" + (d.tokenReady ? "yes" : "no") + ")")
        console.log("profile: " + data.config.profile)
        console.log("workspace: " + data.config.workspace)
        console.log("sessions: " + data.sessions.length)
        if (data.lastError) console.log("lastError: " + data.lastError)
      } catch {
        console.log("status: unavailable")
      }
    })
  ' || echo "status: launcher not reachable"
fi
