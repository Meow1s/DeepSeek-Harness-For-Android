#!/bin/sh
# Install the mobile adaptation + "back to chat" bridge into DSH's web frontend.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DEFAULT_DIST=/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist
DIST="${DSH_WEB_FRONTEND_DIST:-$DEFAULT_DIST}"

if [ ! -f "$DIST/index.html" ]; then
  FOUND=$(find /usr/local/lib/node_modules/@deepseek-ai/dsh -path '*/dsh-web-frontend/dist/index.html' -print 2>/dev/null | head -n1 || true)
  if [ -n "$FOUND" ]; then DIST=$(dirname "$FOUND"); fi
fi

if [ ! -f "$DIST/index.html" ]; then
  echo "找不到 DSH Web 前端 dist，跳过移动端适配安装。" >&2
  exit 1
fi

for file in dsh-pocket-reset.html dsh-mobile.css dsh-mobile.js; do
  if [ ! -f "$ROOT/public/$file" ]; then
    echo "缺少 public/$file" >&2
    exit 1
  fi
  cp "$ROOT/public/$file" "$DIST/$file"
  chmod 644 "$DIST/$file"
done

node --input-type=commonjs - "$DIST/index.html" <<'NODE'
const fs = require('node:fs')
const file = process.argv[2]
let source = fs.readFileSync(file, 'utf8')
const start = '<!-- dsh-mobile:start -->'
const end = '<!-- dsh-mobile:end -->'

// Make this installer idempotent.
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
  '  <link rel="stylesheet" href="dsh-mobile.css">',
  '  <script defer src="dsh-mobile.js"></script>',
  '  ' + end,
  '',
].join('\n')
source = source.replace('</head>', block + '</head>')
fs.writeFileSync(file, source)
NODE

echo "已安装 DSH 移动端适配: $DIST"
