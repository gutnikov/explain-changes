---
name: explain-changes
description: Use when the user wants to review the agent's uncommitted changes in a GitHub-PR-style web UI, get an explanation of what changed and why, leave comments, and decide whether to commit. Triggers on "explain changes", "review my changes", "show me a diff/PR view", "explain-changes", "open the change review", or when the user asks to set up periodic/automatic change checkpoints. Handles both the interactive (browser) flow and the non-interactive (headless, auto-commit) flow.
---

# explain-changes

Give the user a best-in-class review of the **uncommitted working-tree changes**
(everything modified/created/deleted vs `HEAD`), with an agent-authored explanation,
in a GitHub-PR-style web UI — then act on their decision.

`${CLAUDE_PLUGIN_ROOT}` is this plugin's directory. All scripts live under
`${CLAUDE_PLUGIN_ROOT}/server/`. The project repo root is the user's cwd.

## Choose the mode

- **Interactive** (default): the user asks to review changes now → run the browser flow.
- **Non-interactive**: the user stated a checkpoint cadence at session start
  (e.g. "checkpoint after each todo"). At each trigger, run the headless flow.

---

## Interactive flow

1. **Create a session dir:**
   ```bash
   SESSION="$PWD/.explain-changes/.session/$(date +%s)"
   mkdir -p "$SESSION"
   ```

2. **Author the explanation.** Write a concise markdown explanation of what changed
   and why to `"$SESSION/explanation.md"`. Use these sections:
   ```markdown
   ## What changed & why
   <prose>

   ## Per-file notes
   - **path/to/file** — <what & why>
   ```

3. **Build the payload:**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/server/build-payload.mjs" \
     --session-dir "$SESSION" --project-root "$PWD" \
     --explanation-file "$SESSION/explanation.md"
   ```
   The command prints `{"fileCount":N,"branch":"…"}`. **If `fileCount` is 0**, tell
   the user there are no uncommitted changes to review and stop.

4. **Start the server (background) and give the user the URL:**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/server/serve.mjs" \
     --session-dir "$SESSION" --project-root "$PWD" --open >/dev/null 2>&1 &
   ```
   The server writes `"$SESSION/server-info.json"` shortly after starting. Wait for that
   file to exist (re-check every ~0.5s for a few seconds), then read the `url` from it
   and tell the user to open it. The `--open` flag attempts to open the browser automatically; still give the user the URL as a fallback in case the open is blocked.

5. **Wait for the decision.** Poll for `"$SESSION/decision.json"` (re-check every few
   seconds). If the user interrupts in the conversation — asks to stop or starts a new
   request — abandon the wait immediately. Otherwise read its `action`:

   - **`commit`**: derive a commit message from your explanation (one concise line,
     imperative mood), then:
     ```bash
     git add -A && git commit -m "<message>"
     HASH="$(git rev-parse HEAD)"
     node "${CLAUDE_PLUGIN_ROOT}/server/save-explanation.mjs" \
       --session-dir "$SESSION" --project-root "$PWD" --commit "$HASH"
     ```
     If the commit fails (hooks/conflicts), surface git's output and do **not** save
     the `.md`. Then stop the server (kill the background process).

   - **`request_changes`**: apply `generalComment` and each entry in `lineComments`
     (each is `{file, side, line, code, body}` — the `code` is the exact line that was
     commented on) as real edits to the relevant lines. Then **start over from step 1**
     with a fresh session (re-gather, re-explain, re-open the UI) so the user re-reviews
     the updated diff. If you've applied the requested changes and cannot make further
     progress, surface that to the user instead of looping again.

   - **`proceed`**: stop the server and continue the session. Save nothing.

6. **Always stop the background server** once you've acted.

---

## Non-interactive flow

At each user-defined checkpoint trigger:

1. Create a session dir (as above).
2. Author `explanation.md` (as above).
3. Build the payload. If `fileCount` is 0, skip silently.
4. **Do not start the server.** Commit and save directly:
   ```bash
   git add -A && git commit -m "<message>"
   HASH="$(git rev-parse HEAD)"
   node "${CLAUDE_PLUGIN_ROOT}/server/save-explanation.mjs" \
     --session-dir "$SESSION" --project-root "$PWD" --commit "$HASH"
   ```
   (No `decision.json` exists, so no review-comments section is added.)

---

## Notes

- Session dirs live under `.explain-changes/.session/` and are gitignored; the
  persisted records are `.explain-changes/<branch>/<hash>.md`, written only on commit.
- Stop the background server by reading the `pid` field from `"$SESSION/server-info.json"`
  and running `kill <pid>` (the server also self-exits after inactivity, but always stop
  it explicitly once you've acted).
- Never commit on `request_changes` or `proceed`.
