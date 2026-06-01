#!/usr/bin/env bash
# Builds the web/ SPA and copies the output into the plugin's committed
# web_dist bundle. Run this whenever you change anything under web/ — the
# committed bundle is what the plugin ships, and web/dist itself is gitignored.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here/web"
pnpm install --frozen-lockfile
pnpm build
# Copy the built bundle into BOTH the Claude Code plugin and the Codex mirror so
# they never drift. $here is always an absolute path (cd && pwd), so each $dest is
# never empty or "/".
for dest in \
  "$here/plugin/explain-changes/server/web_dist" \
  "$here/plugins/explain-changes/server/web_dist"; do
  rm -rf "$dest"
  mkdir -p "$dest"
  cp -R "$here/web/dist/." "$dest/"
  echo "Copied web/dist -> $dest"
done
