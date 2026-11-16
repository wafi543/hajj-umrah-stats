#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE="hajj-stats-namecheap"
REMOTE_WEB_ROOT="public_html"

for command in npm ssh scp; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  fi
done

printf 'Building the web app...\n'
npm --prefix "$PROJECT_DIR" run build:web

if [[ ! -f "$PROJECT_DIR/dist/index.html" ]]; then
  printf 'Build did not produce dist/index.html; upload cancelled.\n' >&2
  exit 1
fi

printf 'Uploading to Namecheap...\n'
scp -r "$PROJECT_DIR/dist/." "$REMOTE:$REMOTE_WEB_ROOT/"

printf 'Checking the deployed index file...\n'
ssh "$REMOTE" "test -s \"\$HOME/$REMOTE_WEB_ROOT/index.html\""

printf 'Deployment complete: https://hajj-stats.online/\n'
