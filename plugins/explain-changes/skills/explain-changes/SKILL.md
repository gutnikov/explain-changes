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

2. **Author the explanation — write a narrative, not a report.** Write a markdown
   explanation to `"$SESSION/explanation.md"` that a smart reader who did **not**
   see the task can read top-to-bottom and come away understanding what happened
   and why. Tell it as a short story, not a checklist.

   Cover these beats in whatever shape fits the change (pick your own headings;
   omit a beat if the change is trivial — a one-line fix can be one paragraph):

   1. **Context / the setup** — what this part of the codebase does and what
      prompted the change, so the reader has footing before any diff.
   2. **The goal** — one or two plain sentences on what we set out to achieve.
   3. **The approach** — the path chosen and *why* (mention roads not taken when it
      clarifies). An ASCII diagram of a before→after flow or box/arrow architecture
      often earns its place here.
   4. **Walking through the changes** — narrate the edits in reading order. Link
      each file to its diff card (see anchor format below) and drop in short code
      snippets where seeing the code explains faster than prose.

   **Craft rules:**
   - Write for someone smart but unfamiliar with this code; define an unavoidable
     term the first time you use it.
   - Lead with *why* before *what*. Short paragraphs.
   - Use a diagram or snippet only when it adds understanding — never as decoration.
   - Use fenced code blocks for snippets and for ASCII diagrams. (Code blocks render
     in monospace; there is no syntax coloring — keep snippets short and focused.)

   **Link to a file's diff card** with a markdown link to its anchor. The anchor is
   `#file-` followed by the file path with every run of non-`[A-Za-z0-9_-]`
   characters replaced by a single `-`. Examples:
   - `frontend/src/lib/types.ts` → `[types.ts](#file-frontend-src-lib-types-ts)`
   - `server/lib/handler.mjs` → `[handler.mjs](#file-server-lib-handler-mjs)`

   **Worked example** (shape to aim for):
   ```markdown
   ## The setup
   The board view fetches labels from the API but typed them as `any`, so a typo
   in a label field silently slipped through to render.

   ## Goal
   Make labels type-safe end to end without changing any runtime behavior.

   ## Approach
   Mirror the backend `LabelRead` schema as a single TS interface and thread it
   through the API client and the board components:

       api.ts  ──returns──▶  Label[]
          │
          ▼
       board.tsx (filters, chips) ──uses──▶ Label.id / .name / .color

   ## Walking through the changes
   The new shape lives in [types.ts](#file-frontend-src-lib-types-ts):

       export interface Label { id: number; name: string; color: string }

   [api.ts](#file-frontend-src-lib-api-ts) now returns `Label[]` from
   `listLabels()`, and [board.tsx](#file-frontend-src-board-tsx) consumes the typed
   fields instead of `any`.
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

5. **Poll loop — answer comments and wait for the decision.** Loop every few
   seconds. On each iteration:

   **a. Answer new comments.** Read `"$SESSION/comments.jsonl"` and
   `"$SESSION/seen.json"` **defensively** — either file may not exist yet on the
   first pass; treat a missing/empty file as no comments / `[]` and never let that
   abort the loop (e.g. `cat "$SESSION/comments.jsonl" 2>/dev/null`). Each
   `comments.jsonl` line is `{id, threadId, file, side, line, code, body, ts}`.
   Messages sharing a `threadId` are one conversation thread (a follow-up reuses
   the original `threadId` with a new `id`); `seen.json` lists message ids you've
   already judged.

   For every message whose `id` is **not** in `seen`, judge its intent:
   - If it's a **question or wants discussion** (including a follow-up in a thread
     you've already answered), write a concise answer for its `threadId`.
   - If it's a **pure change request** (an instruction to edit code), do not
     answer it here — it will be applied on `request_changes`.

   Then record what you judged with one call. `--replies` is keyed by **threadId**
   and each value is an **array** of answers (the helper appends, so a new answer
   in an existing thread continues the conversation). Pass **all** newly-judged
   message ids in `--seen`:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/server/save-replies.mjs" \
     --session-dir "$SESSION" \
     --replies '{"<threadId>":[{"body":"<your answer>","ts":<epoch>}]}' \
     --seen '["<messageId>", "..."]'
   ```
   The UI polls `/replies` and shows your answers inline in each thread; while a
   user message is awaiting your answer it shows an "Agent typing…" hint.

   **b. Check the decision.** Read `"$SESSION/decision.json"`. If it does not yet
   exist, sleep briefly and repeat from (a). If the user interrupts in the
   conversation — asks to stop or starts a new request — abandon the loop
   immediately. When it exists, act on its `action`:

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
     (each is `{id, threadId, file, side, line, code, body}` — the `code` is the exact
     line that was commented on) as real edits to the relevant lines. Then **start over from
     step 1** with a fresh session (re-gather, re-explain, re-open the UI) so the user
     re-reviews the updated diff. If you've applied the requested changes and cannot
     make further progress, surface that to the user instead of looping again.

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
- On commit, alongside `<hash>.md`, a `<hash>.json` sidecar is written holding the
  explanation and the parsed diff (`files` with hunks). The review UI's checkpoint
  switcher reads these to show past checkpoints read-only; the `.md` remains the
  human-readable record. `save-explanation.mjs` writes both.
- During the interactive review, the UI appends user line-comments (and thread
  follow-ups) to `comments.jsonl`; your answers live in `replies.json` (keyed by
  `threadId`, an array of answers per thread) and judged message ids in
  `seen.json`, both written via `save-replies.mjs`. All are inside the gitignored
  session dir and are never committed.
- Stop the background server by reading the `pid` field from `"$SESSION/server-info.json"`
  and running `kill <pid>` (the server also self-exits after inactivity, but always stop
  it explicitly once you've acted).
- Never commit on `request_changes` or `proceed`.
