#!/bin/sh
# Install the DSH task notification bridge into DSH's web frontend.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DEFAULT_DIST=/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist
DIST="${DSH_WEB_FRONTEND_DIST:-$DEFAULT_DIST}"

if [ ! -f "$DIST/index.html" ]; then
  FOUND=$(find /usr/local/lib/node_modules/@deepseek-ai/dsh -path '*/dsh-web-frontend/dist/index.html' -print 2>/dev/null | head -n1 || true)
  if [ -n "$FOUND" ]; then DIST=$(dirname "$FOUND"); fi
fi

if [ ! -f "$DIST/index.html" ]; then
  echo "找不到 DSH Web 前端 dist，跳过任务通知桥安装。" >&2
  exit 1
fi

cp "$ROOT/public/dsh-notify.js" "$DIST/dsh-notify.js"
chmod 644 "$DIST/dsh-notify.js"

node --input-type=commonjs - "$DIST/index.html" <<'NODE'
const fs = require('node:fs')
const file = process.argv[2]
let source = fs.readFileSync(file, 'utf8')
const start = '<!-- dsh-task-notify:start -->'
const end = '<!-- dsh-task-notify:end -->'

for (;;) {
  const a = source.indexOf(start)
  if (a < 0) break
  const b = source.indexOf(end, a)
  if (b < 0) break
  source = source.slice(0, a) + source.slice(b + end.length).replace(/^\n/, '')
}

if (!source.includes('</head>')) {
  console.error('DSH index.html 缺少 </head>')
  process.exit(1)
}

const block = [
  start,
  '  <script defer src="dsh-notify.js"></script>',
  '  ' + end,
  '',
].join('\n')
source = source.replace('</head>', block + '</head>')
fs.writeFileSync(file, source)
NODE

echo "已安装 DSH 任务通知桥: $DIST"
