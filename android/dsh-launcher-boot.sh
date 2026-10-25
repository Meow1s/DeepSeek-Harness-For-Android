#!/system/bin/sh
# DSH Pocket Launcher — KernelSU service.d boot hook.
#
# Starts the mobile launcher in the Eta Debian proot so its home-screen PWA
# is reachable after a reboot. It does NOT start DSH itself: opening the
# launcher and tapping the main button does that.
#
# Optional overrides:
#   DSH_LAUNCHER_PORT=3081
#   DSH_LAUNCHER_HOST=127.0.0.1
#   DSH_LAUNCHER_DATA_HOST=/data/local/tmp/eta/dsh-launcher/data
#   DSH_LAUNCHER_DATA_GUEST=/workspace/dsh-launcher/data

APP_DATA=/data/user/0/io.github.mangi.eta
WORKSPACE=${DSH_LAUNCHER_WORKSPACE:-/data/local/tmp/eta}
APP_DIR_HOST=${DSH_LAUNCHER_APP_DIR:-$WORKSPACE/dsh-launcher}
PORT=${DSH_LAUNCHER_PORT:-3081}
LAUNCHER_HOST=${DSH_LAUNCHER_HOST:-127.0.0.1}
DATA_HOST=${DSH_LAUNCHER_DATA_HOST:-$APP_DIR_HOST/data}
DATA_GUEST=${DSH_LAUNCHER_DATA_GUEST:-/workspace/dsh-launcher/data}
LOG=$DATA_HOST/boot.log

mkdir -p "$DATA_HOST" "$DATA_HOST/logs" 2>/dev/null
chmod 700 "$DATA_HOST" "$DATA_HOST/logs" 2>/dev/null
exec 9>>"$LOG"
echo "=== $(date '+%F %T') dsh-launcher boot begin (port $PORT) ===" >&9

# Wait for Android to finish booting.
i=0
while [ "$(getprop sys.boot_completed 2>/dev/null)" != "1" ] && [ "$i" -lt 180 ]; do
  sleep 2
  i=$((i + 1))
done
echo "boot_completed=$(getprop sys.boot_completed 2>/dev/null)" >&9

# Wait for the rootfs to be readable after FBE unlock.
ROOTFS=$(find /data/user/0/io.github.mangi.eta/files/terminal -maxdepth 3 -type d -name rootfs 2>/dev/null | head -n1)
i=0
while { [ -z "$ROOTFS" ] || [ ! -x "$ROOTFS/bin/sh" ]; } && [ "$i" -lt 120 ]; do
  sleep 2
  i=$((i + 1))
  ROOTFS=$(find /data/user/0/io.github.mangi.eta/files/terminal -maxdepth 3 -type d -name rootfs 2>/dev/null | head -n1)
done
if [ -z "$ROOTFS" ] || [ ! -x "$ROOTFS/bin/sh" ]; then
  echo "rootfs not ready, abort" >&9
  exit 1
fi
echo "rootfs=$ROOTFS" >&9
sleep 8

# Check whether the launcher port is already listening.
HEX=$(printf '%04X' "$PORT")
port_busy() {
  grep -qi ":$HEX .* 0A " /proc/net/tcp 2>/dev/null && return 0
  grep -qi ":$HEX .* 0A " /proc/net/tcp6 2>/dev/null && return 0
  return 1
}
if port_busy; then
  echo "port $PORT already listening, skip" >&9
  exit 0
fi

if [ ! -f "$APP_DIR_HOST/server.mjs" ]; then
  echo "launcher not found: $APP_DIR_HOST/server.mjs" >&9
  exit 1
fi

LIBDIR=$(find /data/app -path '*io.github.mangi.eta-*' -path '*/lib/arm64' -type d 2>/dev/null | head -n1)
if [ -z "$LIBDIR" ] || [ ! -x "$LIBDIR/libproot_exec.so" ]; then
  echo "proot executable not found, abort" >&9
  exit 1
fi

PROOT_TMP="$WORKSPACE/.proot-launcher"
mkdir -p "$PROOT_TMP"
chmod 700 "$PROOT_TMP" 2>/dev/null

echo "app=$APP_DIR_HOST" >&9
echo "proot=$LIBDIR" >&9

export PROOT_LOADER="$LIBDIR/libproot_loader.so"
export PROOT_TMP_DIR="$PROOT_TMP"
setsid "$LIBDIR/libproot_exec.so" --root-id --link2symlink --sysvipc \
  -r "$ROOTFS" -w /workspace \
  -b /dev:/dev -b /proc:/proc -b /sys:/sys \
  -b "$WORKSPACE:/workspace" \
  -b "$PROOT_TMP:/dev/shm" \
  /usr/bin/env -i HOME=/root USER=root LOGNAME=root SHELL=/bin/sh \
  TERM=dumb LANG=C.UTF-8 LC_ALL=C.UTF-8 TMPDIR=/tmp NO_COLOR=1 \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /bin/sh -lc "cd /workspace/dsh-launcher && [ -f scripts/install-dsh-reset-page.sh ] && sh scripts/install-dsh-reset-page.sh >/dev/null 2>&1 || true; [ -f /workspace/.dsh-env ] && . /workspace/.dsh-env; export DSH_LAUNCHER_DATA='$DATA_GUEST'; exec node server.mjs --host '$LAUNCHER_HOST' --port '$PORT'" \
  >>"$LOG" 2>&1 </dev/null 9>&- &

echo "launched pid=$!" >&9
sleep 3
if port_busy; then
  echo "ok: launcher listening on $LAUNCHER_HOST:$PORT" >&9
else
  echo "warn: launcher not listening yet; see $LOG" >&9
fi
echo "=== $(date '+%F %T') dsh-launcher boot done ===" >&9
