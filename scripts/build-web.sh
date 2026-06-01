#!/usr/bin/env bash
# Builds the web/ SPA into the canonical plugin bundle, then regenerates the Codex
# mirror (skills + server, incl the bundle) so the two never drift. Run this whenever
# you change anything under web/. web/dist itself is gitignored.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here/web"
pnpm install --frozen-lockfile
pnpm build
# $here is always an absolute path (cd && pwd), so $dest is never empty or "/".
dest="$here/plugin/explain-changes/server/web_dist"
rm -rf "$dest"
mkdir -p "$dest"
cp -R "$here/web/dist/." "$dest/"
echo "Copied web/dist -> $dest"
"$here/scripts/sync-mirror.sh"
