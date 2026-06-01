#!/usr/bin/env bash
# Regenerate the Codex plugin mirror from the canonical Claude Code plugin so the
# two never drift. Run after any change to the skill or the server (incl web_dist).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
src="$here/plugin/explain-changes"
dst="$here/plugins/explain-changes"
for sub in skills server; do
  rm -rf "$dst/$sub"
  cp -R "$src/$sub" "$dst/$sub"
done
echo "Synced plugin/explain-changes/{skills,server} -> plugins/explain-changes/"
