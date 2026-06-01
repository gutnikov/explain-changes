# explain-changes — Design Spec

**Date:** 2026-06-01
**Status:** Approved for planning

## Summary

`explain-changes` is a Claude Code / Codex plugin that gives a coding agent (the
usual "developer" in an agentic workflow) a best-in-class, GitHub-PR-style review
surface for **uncommitted working-tree changes**. A developer can stop mid-session,
review the agent's changes file-by-file in a browser, read an agent-authored
explanation of what changed and why, leave comments, and then decide whether to
commit, iterate, or just proceed. Each approved commit is recorded as a markdown
explanation under `.explain-changes/`.

It runs in two modes:

- **Interactive** — launches a local web UI; the user reviews and chooses an action.
- **Non-interactive** — headless; the agent checkpoints automatically per a
  user-specified cadence, behaving as if "Commit & proceed" was chosen.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Diff scope | Uncommitted working-tree changes vs `HEAD` (modified/created/deleted, staged + unstaged). |
| When `.md` is saved | **Only on commit.** "Proceed without committing" and "Request changes" persist nothing. |
| Non-interactive trigger | A **user-specified rule** stated at session start (e.g. "checkpoint after each todo"). |
| "Request changes" behavior | **Iterate then re-review** — agent applies comments, re-invokes, shows updated diff; loops until commit or proceed. |
| Architecture | **Payload-driven thin bridge server** — agent owns git + explanation; server is a dumb static + file-drop bridge. |
| Server runtime | **Node, zero-dependency** (`node:http`). Reuse orca's *frontend*; reimplement the serving layer in Node. |
| UI layout | **Single-scroll**, GitHub-faithful, with a **sticky action bar on top**. |
| Diff view | **Unified + split toggle** (GitHub-style). |
| History browser | **In scope for v1** (read-only). |
| Comments | One general comment + one comment per file. **No per-line comments** in v1. |

## Reference: orca (`/Users/agutnikov/work/orca`)

The orca repo's `web/` and serving conventions are the template. Reuse the entire
frontend; reimplement only the serving layer in Node.

- Frontend stack to lift: React 19, `@tanstack/react-router`, Vite 6, Tailwind 4,
  `radix-ui` (shadcn base), `react-markdown` + `remark-gfm`, `diff`, `prism-react-renderer`,
  `next-themes`, `sonner`, `class-variance-authority`, `tailwind-merge`, `lucide-react`.
- Reusable building blocks: `web/src/hooks/usePollInterval.ts`, `useTheme.ts`,
  `lib/utils.ts`, `lib/ansi.tsx`, router/route-tree setup, `components.json`, Vite config.
- Serving pattern (to reimplement in Node): orca's `_SPAStaticFiles` falls back to
  `index.html` for client-side routes and resolves a `web_dist` directory; we mirror
  that behavior in `serve.mjs`.
- Plugin manifest conventions: `.claude-plugin/marketplace.json`, per-plugin
  `.claude-plugin/plugin.json` (Claude Code) and `.codex-plugin/plugin.json` (Codex),
  skills under `skills/<name>/SKILL.md`.

## Repo / plugin layout

```
explain-changes/
├── .claude-plugin/marketplace.json         # marketplace entry
├── plugin/explain-changes/
│   ├── .claude-plugin/plugin.json           # Claude Code manifest
│   ├── skills/
│   │   └── explain-changes/SKILL.md         # the agent-facing skill (orchestration)
│   └── server/
│       ├── serve.mjs                        # zero-dep node:http: SPA + /payload + /decision + /api/history
│       └── web_dist/                        # prebuilt SPA, shipped with the plugin
├── plugins/explain-changes/                 # Codex mirror (.codex-plugin/plugin.json + skills)
└── web/                                      # React/Vite source (built → server/web_dist)
    ├── package.json  vite.config.ts  components.json  index.html
    └── src/ … (router, hooks, lib, routes, styles — lifted/retheme'd from orca)
```

### Component boundaries

Three units, each understandable and testable in isolation:

1. **`SKILL.md`** — the only "smart" component. Runs git, generates the explanation,
   writes `payload.json`, launches/stops the server, polls `decision.json`, and acts
   (commit / iterate / proceed). Depends on: git, Node, the server script.
2. **`serve.mjs`** — a dumb static + bridge server. Serves `web_dist` with SPA
   fallback, exposes `GET /payload`, `POST /decision`, `GET /api/history`. **No git,
   no business logic.** Depends on: the session dir layout + `.explain-changes/`.
3. **`web/`** — pure view. Fetches `/payload`, renders the review screen, POSTs
   `/decision`; the `/history` route fetches `/api/history`. Knows nothing about git.

## Data model

### Persistent store

`.explain-changes/<branch>/<commit-hash>.md` — written **only when the user commits**.

### Session dir (ephemeral, per-invocation, gitignored)

`.explain-changes/.session/<id>/` containing:
- `server-info.json` — startup JSON (url, port) so the skill can recover the URL.
- `payload.json` — written by the skill, read by the UI.
- `decision.json` — written by the server on button click, polled by the skill.

### `payload.json`

```jsonc
{
  "branch": "feature/rate-limit",
  "base": "HEAD",
  "explanation": "<markdown: what changed & why>",
  "files": [
    {
      "path": "src/auth/login.ts",
      "status": "modified",        // modified | added | deleted | renamed
      "additions": 12,
      "deletions": 0,
      "hunks": [
        {
          "header": "@@ -10,6 +10,8 @@",
          "lines": [
            { "type": "context", "content": " router.post(\"/login\", handler);" },
            { "type": "add", "content": "+router.use(rateLimit({ max: 5 }));" }
          ]
        }
      ]
    }
  ]
}
```

### `decision.json`

```jsonc
{
  "action": "commit" | "request_changes" | "proceed",
  "generalComment": "…",
  "fileComments": { "src/auth/login.ts": "…" }
}
```

### `.explain-changes/<branch>/<hash>.md`

```markdown
---
commit: 9f2a1c7
branch: feature/rate-limit
date: 2026-06-01T15:40:00Z
files: [src/auth/login.ts, src/auth/rateLimit.ts]
additions: 46
deletions: 0
---

## What changed & why
Added rate-limiting to the auth endpoint to stop credential-stuffing…

## Per-file notes
- **src/auth/login.ts** — wired token-bucket middleware into the login route.

## Review comments (if any)
> general: looks good, ship it
```

Frontmatter lets the history UI render summary cards without parsing prose.
General/file comments from the approving review are folded into the body so the
record is complete.

## Flows

### Interactive

1. Skill runs `git status` / `git diff` against `HEAD` → builds the file list + hunks.
2. Skill generates the explanation markdown (what changed & why).
3. Skill writes `payload.json`, starts `serve.mjs` in the background (which writes
   `server-info.json` and prints `http://localhost:<port>`), and tells the user to open it.
4. Skill **polls** `decision.json` until it appears (or inactivity timeout).
5. Skill acts on `action`:
   - **`commit`** → `git add -A && git commit` → resolve new `<hash>` →
     write `.explain-changes/<branch>/<hash>.md` (with comments folded in) →
     stop server → done.
   - **`request_changes`** → agent applies `generalComment` + `fileComments` as
     edits → **re-invoke from step 1** (fresh payload, re-review loop).
   - **`proceed`** → stop server, continue session, save nothing.

### Non-interactive

At session start the user states a cadence rule. At each trigger the agent runs
steps 1–2 then behaves as if `commit` was chosen (auto `git add -A && commit`, save
`<hash>.md`) — **no server, no browser, no polling**.

## Web UI

### Layout — single-scroll, sticky action bar on top

```
┌─────────────────────────────────────────────────────────────┐
│  feature/rate-limit · 3 files +46 −0   [Request changes]      │  ← sticky top bar
│                                  [Proceed] [Commit & proceed]  │
├─────────────────────────────────────────────────────────────┤
│  What changed & why   (explanation, rendered markdown)        │
│  ┌──── general comment ──────────────────────────────────────┐ │
│  └────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  src/auth/login.ts                            modified  +12   │  ← file header
│   [unified | split] toggle                                     │
│   + import { rateLimit } …       (green/red diff rows)         │
│  ┌──── comment on this file ─────────────────────────────────┐ │
│  └────────────────────────────────────────────────────────────┘ │
│  … next file …                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Routes (TanStack Router)

- `/` — the review screen above; fetches `/payload` once (static per invocation).
- `/history` — left list (branch → commits, newest first) + right reading pane that
  renders the selected `.md` via react-markdown; fetches `/api/history`. Read-only;
  no diff reconstruction in v1 (renders what's in the `.md`; frontmatter gives the
  at-a-glance summary).

### Behavior

- Diffs rendered GitHub-style: file status pills, line numbers, green/red rows,
  collapsible files, expand-context, and a **unified ↔ split** toggle. Uses the
  `diff` lib + a diff renderer (port orca's or a small custom component).
- Comments: one general box + one box per file (no per-line comments in v1).
- The three action buttons POST `/decision` with `action` + comments, then show a
  "you can return to your terminal" confirmation; the server shuts down afterward.
- The UI does not poll (payload is static); the **skill** polls for the decision.

### Theme

Apply the mandated shadcn theme:
`pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/cmmea3qbd000004jvb99v39cd`.

## Bridge server (`serve.mjs`)

- Zero dependency, uses `node:http` + `node:fs`.
- Picks a free port; writes `server-info.json` to the session dir; prints the URL.
- Routes:
  - `GET /` and all client routes → serve `web_dist/index.html` (SPA fallback).
  - static assets under `web_dist/` → served with correct content types.
  - `GET /payload` → returns the session `payload.json`.
  - `POST /decision` → writes `decision.json` to the session dir.
  - `GET /api/history` → reads `.explain-changes/<branch>/*.md`, returns parsed
    frontmatter summaries + raw markdown.
- Lifecycle: auto-exits after the decision is read or after an inactivity timeout —
  same robustness pattern as orca's / the visual-companion's servers.

## Error handling

- **No changes** to explain → skill reports it and skips the UI entirely.
- **Server fails to bind** → retry on the next free port; surface failure to the skill.
- **Browser closed without deciding** → skill polls until inactivity timeout, then
  reports "no decision received" and continues.
- **Commit fails** (hooks, conflicts) → skill surfaces git output and does **not**
  write the `.md`.

## Testing

1. **`serve.mjs`** (Node test runner, zero-dep): static serving, SPA fallback,
   `GET /payload`, `POST /decision`, `GET /api/history`, port selection.
2. **web**: component tests for the diff renderer (unified + split) and the
   `/decision` POST payload shape.
3. **skill contract**: assert the `payload.json` ↔ `decision.json` schemas.
4. **end-to-end smoke**: write a payload, start the server, POST a decision, assert
   the decision file is written and (on `commit`) the `.md` is produced.

## Out of scope (v1)

- Per-line diff comments.
- Diff reconstruction inside the history browser.
- Authentication, multi-repo, or remote/hosted serving.
- Vite dev server at runtime (the SPA is prebuilt and shipped as `web_dist`).
```

