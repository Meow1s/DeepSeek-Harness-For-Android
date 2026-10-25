#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
"$ROOT/scripts/stop.sh"
sleep 0.3
"$ROOT/scripts/start.sh"
