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
     --session-dir "$SESSION" --project-root "$PWD" >/dev/null 2>&1 &
   ```
   Read the URL from `"$SESSION/server-info.json"` and tell the user to open it.

5. **Wait for the decision.** Poll for `"$SESSION/decision.json"` (re-check every few
   seconds; stop if the user cancels). Read its `action`:

   - **`commit`**: derive a concise commit message from your explanation, then:
     ```bash
     git add -A && git commit -m "<message>"
     HASH="$(git rev-parse HEAD)"
     node "${CLAUDE_PLUGIN_ROOT}/server/save-explanation.mjs" \
       --session-dir "$SESSION" --project-root "$PWD" --commit "$HASH"
     ```
     If the commit fails (hooks/conflicts), surface git's output and do **not** save
     the `.md`. Then stop the server (kill the background process).

   - **`request_changes`**: apply `generalComment` and each `fileComments[path]` as
     real edits to the code. Then **start over from step 1** with a fresh session
     (re-gather, re-explain, re-open the UI) so the user re-reviews the updated diff.

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
- The server auto-exits after inactivity, but always kill it explicitly when done.
- Never commit on `request_changes` or `proceed`.
