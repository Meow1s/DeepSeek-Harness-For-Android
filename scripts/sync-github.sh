#!/bin/sh
# Commit and push the current working tree to the public GitHub repository.
# Usage: sh scripts/sync-github.sh "feat: describe the change"
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

if [ ! -d .git ]; then
  echo "不是 git 仓库: $ROOT" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "${1:-chore: sync from device}"
fi

git push origin main
echo "已同步: $(git remote get-url origin)"
