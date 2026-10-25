#!/bin/sh
# Link the bundled DSH plugins into the web profile. Idempotent; safe to run on
# every launcher start.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PROFILE_NAME="${DSH_PROFILE:-web}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE="$DSH_HOME/profiles/$PROFILE_NAME"
WEB="$ROOT/plugins/dsh-web-mobile"
OPS="$ROOT/plugins/dsh-ops"

for dir in "$WEB" "$OPS"; do
  [ -f "$dir/package.json" ] || { echo "缺少内置插件: $dir" >&2; exit 1; }
done

if [ ! -f "$PROFILE/package.json" ]; then
  echo "DSH profile 尚未初始化: $PROFILE（先启动一次 DSH 再运行）" >&2
  exit 0
fi

if node --input-type=commonjs - "$PROFILE/package.json" <<'NODE'
const fs = require('node:fs')
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const deps = p.dependencies || {}
const bundles = p.dsh?.profile?.bundles || []
const ok = String(deps['dsh-web-mobile'] || '').startsWith('link:')
  && String(deps['dsh-ops'] || '').startsWith('link:')
  && bundles.includes('dsh-web-mobile')
  && bundles.includes('dsh-ops')
process.exit(ok ? 0 : 1)
NODE
then
  echo "内置 DSH 插件已链接: dsh-web-mobile, dsh-ops"
  exit 0
fi

DSH_BIN="${DSH_BIN:-$(command -v dsh || true)}"
if [ -z "$DSH_BIN" ]; then
  echo "找不到 dsh 命令，跳过内置插件安装" >&2
  exit 1
fi

"$DSH_BIN" plugin --profile "$PROFILE_NAME" add "link:$WEB" "link:$OPS"

node --input-type=commonjs - "$PROFILE/package.json" <<'NODE'
const fs = require('node:fs')
const file = process.argv[2]
const p = JSON.parse(fs.readFileSync(file, 'utf8'))
p.dsh ??= {}
p.dsh.profile ??= {}
p.dsh.profile.bundles ??= []
for (const name of ['dsh-web-mobile', 'dsh-ops']) {
  if (!p.dsh.profile.bundles.includes(name)) p.dsh.profile.bundles.push(name)
}
fs.writeFileSync(file, JSON.stringify(p, null, 2) + '\n')
NODE

echo "已链接内置 DSH 插件: dsh-web-mobile, dsh-ops"
