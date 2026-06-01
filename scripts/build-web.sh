#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here/web"
pnpm install
pnpm build
dest="$here/plugin/explain-changes/server/web_dist"
rm -rf "$dest"
mkdir -p "$dest"
cp -R "$here/web/dist/." "$dest/"
echo "Copied web/dist -> $dest"
