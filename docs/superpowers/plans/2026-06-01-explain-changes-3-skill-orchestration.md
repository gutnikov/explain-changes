# explain-changes Plan 3 — Skill Orchestration + Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tie the system together. Deterministic Node helpers gather the working-tree diff into `payload.json` and compose the saved `<hash>.md`; `SKILL.md` instructs the agent to run the interactive (browser) and non-interactive (headless) flows; a Codex mirror and an end-to-end test complete the plugin.

**Architecture:** The agent owns judgment (authoring the explanation, applying review comments, committing). Everything mechanical is a small, unit-tested Node CLI so the skill stays thin and reproducible: `parse-diff` (pure) → `gather` (git) → `build-payload` (CLI) and `compose-md` (pure) → `save-explanation` (CLI).

**Tech Stack:** Node ≥18 (`node:child_process`, `node:fs`, `node:test`), git. Skill is Markdown driven by Claude Code / Codex. No runtime deps.

**Reference:** orca's skill style at `/Users/agutnikov/work/orca/plugin/orca/skills/*/SKILL.md` and its Codex mirror `plugins/orca/`.

---

## File Structure

- `plugin/explain-changes/server/lib/parse-diff.mjs` — parse unified git diff → `FileChange[]`.
- `plugin/explain-changes/server/lib/gather.mjs` — run git, return `{ branch, files }` (tracked diff + untracked).
- `plugin/explain-changes/server/build-payload.mjs` — CLI: assemble `payload.json`.
- `plugin/explain-changes/server/lib/compose-md.mjs` — build the `<hash>.md` string.
- `plugin/explain-changes/server/save-explanation.mjs` — CLI: write `.explain-changes/<branch>/<hash>.md`.
- `plugin/explain-changes/skills/explain-changes/SKILL.md` — the orchestration skill.
- `plugins/explain-changes/.codex-plugin/plugin.json` + `plugins/explain-changes/skills/…` — Codex mirror.
- `plugin/explain-changes/server/test/parse-diff.test.mjs`, `gather.test.mjs`, `compose-md.test.mjs`, `e2e.test.mjs`.

---

## Task 1: Unified diff parser

**Files:**
- Create: `plugin/explain-changes/server/lib/parse-diff.mjs`
- Test: `plugin/explain-changes/server/test/parse-diff.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// plugin/explain-changes/server/test/parse-diff.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { parseGitDiff } from "../lib/parse-diff.mjs"

test("parses a modified file with one hunk and counts", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "index 111..222 100644",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -1,2 +1,2 @@",
    " keep",
    "-old",
    "+new",
  ].join("\n")

  const files = parseGitDiff(diff)
  assert.equal(files.length, 1)
  const f = files[0]
  assert.equal(f.path, "src/a.ts")
  assert.equal(f.status, "modified")
  assert.equal(f.additions, 1)
  assert.equal(f.deletions, 1)
  assert.equal(f.hunks.length, 1)
  assert.equal(f.hunks[0].header, "@@ -1,2 +1,2 @@")
  assert.deepEqual(f.hunks[0].lines, [
    { type: "context", content: " keep" },
    { type: "del", content: "-old" },
    { type: "add", content: "+new" },
  ])
})

test("detects added and deleted files", () => {
  const diff = [
    "diff --git a/new.ts b/new.ts",
    "new file mode 100644",
    "index 000..333",
    "--- /dev/null",
    "+++ b/new.ts",
    "@@ -0,0 +1 @@",
    "+hello",
    "diff --git a/gone.ts b/gone.ts",
    "deleted file mode 100644",
    "index 444..000",
    "--- a/gone.ts",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-bye",
  ].join("\n")

  const files = parseGitDiff(diff)
  assert.equal(files.length, 2)
  assert.equal(files[0].path, "new.ts")
  assert.equal(files[0].status, "added")
  assert.equal(files[1].path, "gone.ts")
  assert.equal(files[1].status, "deleted")
})

test("ignores 'No newline' markers", () => {
  const diff = [
    "diff --git a/x b/x",
    "--- a/x",
    "+++ b/x",
    "@@ -1 +1 @@",
    "-a",
    "\\ No newline at end of file",
    "+b",
    "\\ No newline at end of file",
  ].join("\n")
  const f = parseGitDiff(diff)[0]
  assert.deepEqual(f.hunks[0].lines, [
    { type: "del", content: "-a" },
    { type: "add", content: "+b" },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/parse-diff.test.mjs`
Expected: FAIL — cannot find `../lib/parse-diff.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// plugin/explain-changes/server/lib/parse-diff.mjs

/**
 * Parse `git diff` unified output into FileChange[]:
 *   { path, status, additions, deletions, hunks: [{ header, lines: [{type, content}] }] }
 * Lines inside a hunk: ' ' -> context, '+' -> add, '-' -> del.
 * Header lines (---, +++, @@), mode/index lines, and "\ No newline…" are not data rows.
 */
export function parseGitDiff(text) {
  const lines = text.split("\n")
  const files = []
  let file = null
  let hunk = null

  const startFile = () => {
    file = { path: "", status: "modified", additions: 0, deletions: 0, hunks: [] }
    hunk = null
    files.push(file)
  }

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      startFile()
      const m = /^diff --git a\/(.+) b\/(.+)$/.exec(line)
      if (m) file.path = m[2]
      continue
    }
    if (!file) continue

    if (line.startsWith("new file mode")) {
      file.status = "added"
      continue
    }
    if (line.startsWith("deleted file mode")) {
      file.status = "deleted"
      continue
    }
    if (line.startsWith("rename from") || line.startsWith("rename to")) {
      file.status = "renamed"
      if (line.startsWith("rename to")) file.path = line.slice("rename to ".length).trim()
      continue
    }
    if (line.startsWith("+++ b/")) {
      file.path = line.slice("+++ b/".length)
      continue
    }
    if (line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("index ")) {
      continue
    }
    if (line.startsWith("@@")) {
      const headerEnd = line.indexOf("@@", 2)
      const header = headerEnd !== -1 ? line.slice(0, headerEnd + 2) : line
      hunk = { header, lines: [] }
      file.hunks.push(hunk)
      continue
    }
    if (line.startsWith("\\")) continue // "\ No newline at end of file"
    if (!hunk) continue

    if (line.startsWith("+")) {
      hunk.lines.push({ type: "add", content: line })
      file.additions++
    } else if (line.startsWith("-")) {
      hunk.lines.push({ type: "del", content: line })
      file.deletions++
    } else {
      hunk.lines.push({ type: "context", content: line })
    }
  }
  return files
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/parse-diff.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add plugin/explain-changes/server/lib/parse-diff.mjs plugin/explain-changes/server/test/parse-diff.test.mjs
git commit -m "feat(server): parse unified git diff into file changes"
```

---

## Task 2: Gather working-tree changes (git)

**Files:**
- Create: `plugin/explain-changes/server/lib/gather.mjs`
- Test: `plugin/explain-changes/server/test/gather.test.mjs`

- [ ] **Step 1: Write the failing test** (uses a real temp git repo)

```js
// plugin/explain-changes/server/test/gather.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { gatherChanges } from "../lib/gather.mjs"

function git(cwd, ...args) {
  execFileSync("git", args, { cwd, stdio: "pipe" })
}

async function repo() {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-git-"))
  git(dir, "init", "-q")
  git(dir, "config", "user.email", "t@t.dev")
  git(dir, "config", "user.name", "T")
  git(dir, "config", "commit.gpgsign", "false")
  await writeFile(path.join(dir, "tracked.ts"), "line1\nline2\n")
  git(dir, "add", ".")
  git(dir, "commit", "-q", "-m", "init")
  return dir
}

test("captures modified tracked file and untracked file", async () => {
  const dir = await repo()
  await writeFile(path.join(dir, "tracked.ts"), "line1\nCHANGED\n")
  await writeFile(path.join(dir, "fresh.ts"), "brand new\n")

  const { branch, files } = await gatherChanges(dir)
  assert.ok(branch.length > 0)
  const paths = files.map((f) => f.path).sort()
  assert.deepEqual(paths, ["fresh.ts", "tracked.ts"])
  const fresh = files.find((f) => f.path === "fresh.ts")
  assert.equal(fresh.status, "added")
  assert.ok(fresh.additions >= 1)
})

test("returns no files in a clean repo", async () => {
  const dir = await repo()
  const { files } = await gatherChanges(dir)
  assert.deepEqual(files, [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/gather.test.mjs`
Expected: FAIL — cannot find `../lib/gather.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// plugin/explain-changes/server/lib/gather.mjs
import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { parseGitDiff } from "./parse-diff.mjs"

const run = promisify(execFile)

async function git(cwd, args) {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 })
  return stdout
}

/**
 * Gather uncommitted working-tree changes vs HEAD.
 * Tracked changes come from `git diff HEAD`; untracked files are synthesized as
 * "added" files (each line an add) so they appear without mutating the index.
 * Returns { branch, files }.
 */
export async function gatherChanges(cwd) {
  const branch = (await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])).trim()
  const diffText = await git(cwd, ["diff", "HEAD"])
  const files = parseGitDiff(diffText)

  const untracked = (await git(cwd, ["ls-files", "--others", "--exclude-standard"]))
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const rel of untracked) {
    let content = ""
    try {
      content = await readFile(path.join(cwd, rel), "utf8")
    } catch {
      continue // skip binary/unreadable
    }
    const rows = content.split("\n")
    if (rows.length && rows[rows.length - 1] === "") rows.pop()
    files.push({
      path: rel,
      status: "added",
      additions: rows.length,
      deletions: 0,
      hunks: [
        {
          header: `@@ -0,0 +1,${rows.length} @@`,
          lines: rows.map((r) => ({ type: "add", content: `+${r}` })),
        },
      ],
    })
  }

  return { branch, files }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/gather.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add plugin/explain-changes/server/lib/gather.mjs plugin/explain-changes/server/test/gather.test.mjs
git commit -m "feat(server): gather working-tree changes via git"
```

---

## Task 3: `build-payload.mjs` CLI

**Files:**
- Create: `plugin/explain-changes/server/build-payload.mjs`
- Test: extend `plugin/explain-changes/server/test/e2e.test.mjs` (created in Task 6); for now a focused test below.
- Test: `plugin/explain-changes/server/test/build-payload.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// plugin/explain-changes/server/test/build-payload.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const cli = path.join(here, "..", "build-payload.mjs")

function git(cwd, ...args) {
  execFileSync("git", args, { cwd, stdio: "pipe" })
}

test("writes payload.json with branch, base, explanation, files", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-bp-"))
  git(dir, "init", "-q")
  git(dir, "config", "user.email", "t@t.dev")
  git(dir, "config", "user.name", "T")
  await writeFile(path.join(dir, "a.ts"), "one\n")
  git(dir, "add", ".")
  git(dir, "commit", "-q", "-m", "init")
  await writeFile(path.join(dir, "a.ts"), "one\ntwo\n")

  const sessionDir = await mkdtemp(path.join(tmpdir(), "ec-bp-sess-"))
  const explFile = path.join(sessionDir, "explanation.md")
  await writeFile(explFile, "## What changed & why\nAdded a line.")

  execFileSync(process.execPath, [
    cli,
    "--session-dir", sessionDir,
    "--project-root", dir,
    "--explanation-file", explFile,
  ], { stdio: "pipe" })

  const payload = JSON.parse(await readFile(path.join(sessionDir, "payload.json"), "utf8"))
  assert.equal(payload.base, "HEAD")
  assert.ok(payload.branch.length > 0)
  assert.match(payload.explanation, /Added a line/)
  assert.equal(payload.files[0].path, "a.ts")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/build-payload.test.mjs`
Expected: FAIL — cannot find `../build-payload.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
#!/usr/bin/env node
// plugin/explain-changes/server/build-payload.mjs
import path from "node:path"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { gatherChanges } from "./lib/gather.mjs"

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main() {
  const sessionDir = path.resolve(arg("session-dir", ""))
  const projectRoot = path.resolve(arg("project-root", process.cwd()))
  const explanationFile = arg("explanation-file", "")
  if (!sessionDir) {
    console.error("--session-dir is required")
    process.exit(1)
  }
  await mkdir(sessionDir, { recursive: true })

  const { branch, files } = await gatherChanges(projectRoot)
  let explanation = ""
  if (explanationFile) {
    try {
      explanation = await readFile(explanationFile, "utf8")
    } catch {
      explanation = ""
    }
  }

  const payload = { branch, base: "HEAD", explanation, files }
  await writeFile(path.join(sessionDir, "payload.json"), JSON.stringify(payload, null, 2), "utf8")
  // Emit the file count so the skill can detect "no changes".
  console.log(JSON.stringify({ fileCount: files.length, branch }))
}

main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/build-payload.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add plugin/explain-changes/server/build-payload.mjs plugin/explain-changes/server/test/build-payload.test.mjs
git commit -m "feat(server): add build-payload CLI"
```

---

## Task 4: Compose the saved `.md`

**Files:**
- Create: `plugin/explain-changes/server/lib/compose-md.mjs`
- Test: `plugin/explain-changes/server/test/compose-md.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// plugin/explain-changes/server/test/compose-md.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { composeMarkdown } from "../lib/compose-md.mjs"

const payload = {
  branch: "feature/x",
  base: "HEAD",
  explanation: "## What changed & why\nAdded a line.",
  files: [
    { path: "a.ts", status: "modified", additions: 1, deletions: 0, hunks: [] },
    { path: "b.ts", status: "added", additions: 3, deletions: 0, hunks: [] },
  ],
}

test("includes frontmatter, explanation, and review comments", () => {
  const md = composeMarkdown({
    payload,
    decision: { action: "commit", generalComment: "ship it", fileComments: { "a.ts": "nit" } },
    commit: "9f2a1c7",
    date: "2026-06-01T10:00:00Z",
  })
  assert.match(md, /^---\n/)
  assert.match(md, /commit: 9f2a1c7/)
  assert.match(md, /branch: feature\/x/)
  assert.match(md, /files: \[a\.ts, b\.ts\]/)
  assert.match(md, /additions: 4/)
  assert.match(md, /deletions: 0/)
  assert.match(md, /## What changed & why/)
  assert.match(md, /## Review comments/)
  assert.match(md, /> general: ship it/)
  assert.match(md, /\*\*a\.ts\*\* — nit/)
})

test("omits review comments section when there are none", () => {
  const md = composeMarkdown({
    payload,
    decision: null,
    commit: "abc",
    date: "2026-06-01T10:00:00Z",
  })
  assert.doesNotMatch(md, /## Review comments/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/compose-md.test.mjs`
Expected: FAIL — cannot find `../lib/compose-md.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// plugin/explain-changes/server/lib/compose-md.mjs

/**
 * Compose the persisted explanation markdown:
 * frontmatter (from payload + commit/date) + the agent's explanation body +
 * an optional "Review comments" section folded in from the decision.
 */
export function composeMarkdown({ payload, decision, commit, date }) {
  const additions = payload.files.reduce((s, f) => s + f.additions, 0)
  const deletions = payload.files.reduce((s, f) => s + f.deletions, 0)
  const fileList = payload.files.map((f) => f.path).join(", ")

  const fm = [
    "---",
    `commit: ${commit}`,
    `branch: ${payload.branch}`,
    `date: ${date}`,
    `files: [${fileList}]`,
    `additions: ${additions}`,
    `deletions: ${deletions}`,
    "---",
  ].join("\n")

  let body = `\n\n${payload.explanation.trim()}\n`

  const general = decision?.generalComment?.trim()
  const fileComments = Object.entries(decision?.fileComments ?? {}).filter(([, v]) => v && v.trim())
  if (general || fileComments.length) {
    body += "\n## Review comments\n"
    if (general) body += `\n> general: ${general}\n`
    for (const [file, comment] of fileComments) {
      body += `\n- **${file}** — ${comment.trim()}\n`
    }
  }

  return fm + body
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/compose-md.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add plugin/explain-changes/server/lib/compose-md.mjs plugin/explain-changes/server/test/compose-md.test.mjs
git commit -m "feat(server): compose persisted explanation markdown"
```

---

## Task 5: `save-explanation.mjs` CLI

**Files:**
- Create: `plugin/explain-changes/server/save-explanation.mjs`
- Test: covered by the e2e test in Task 6.

- [ ] **Step 1: Write minimal implementation** (no separate unit test; exercised end-to-end in Task 6)

```js
#!/usr/bin/env node
// plugin/explain-changes/server/save-explanation.mjs
import path from "node:path"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { composeMarkdown } from "./lib/compose-md.mjs"

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch {
    return null
  }
}

async function main() {
  const sessionDir = path.resolve(arg("session-dir", ""))
  const projectRoot = path.resolve(arg("project-root", process.cwd()))
  const commit = arg("commit", "")
  if (!sessionDir || !commit) {
    console.error("--session-dir and --commit are required")
    process.exit(1)
  }

  const payload = await readJson(path.join(sessionDir, "payload.json"))
  if (!payload) {
    console.error("payload.json not found")
    process.exit(1)
  }
  const decision = await readJson(path.join(sessionDir, "decision.json")) // null in non-interactive mode

  const md = composeMarkdown({
    payload,
    decision,
    commit,
    date: new Date().toISOString(),
  })

  const outDir = path.join(projectRoot, ".explain-changes", payload.branch)
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, `${commit}.md`)
  await writeFile(outFile, md, "utf8")
  console.log(outFile)
}

main()
```

- [ ] **Step 2: Run the existing server suite to confirm nothing broke**

Run: `npm run test:server`
Expected: all previously-passing tests still PASS.

- [ ] **Step 3: Commit**

```bash
git add plugin/explain-changes/server/save-explanation.mjs
git commit -m "feat(server): add save-explanation CLI"
```

---

## Task 6: End-to-end pipeline test

**Files:**
- Create: `plugin/explain-changes/server/test/e2e.test.mjs`

- [ ] **Step 1: Write the test**

```js
// plugin/explain-changes/server/test/e2e.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, writeFile, readFile, readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const buildPayload = path.join(here, "..", "build-payload.mjs")
const saveExplanation = path.join(here, "..", "save-explanation.mjs")

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, stdio: "pipe" }).toString()
}

test("build-payload -> decision -> commit -> save-explanation produces <hash>.md", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-e2e-"))
  git(dir, "init", "-q")
  git(dir, "config", "user.email", "t@t.dev")
  git(dir, "config", "user.name", "T")
  git(dir, "config", "commit.gpgsign", "false")
  await writeFile(path.join(dir, "a.ts"), "one\n")
  git(dir, "add", ".")
  git(dir, "commit", "-q", "-m", "init")
  await writeFile(path.join(dir, "a.ts"), "one\ntwo\n")

  const sessionDir = await mkdtemp(path.join(tmpdir(), "ec-e2e-sess-"))
  const explFile = path.join(sessionDir, "explanation.md")
  await writeFile(explFile, "## What changed & why\nAdded a second line.")

  // 1. build payload
  execFileSync(process.execPath, [buildPayload, "--session-dir", sessionDir, "--project-root", dir, "--explanation-file", explFile], { stdio: "pipe" })

  // 2. simulate the browser writing a commit decision
  await writeFile(path.join(sessionDir, "decision.json"), JSON.stringify({ action: "commit", generalComment: "lgtm", fileComments: {} }), "utf8")

  // 3. agent commits
  git(dir, "add", "-A")
  git(dir, "commit", "-q", "-m", "Add a second line")
  const hash = git(dir, "rev-parse", "HEAD").trim()

  // 4. save explanation
  execFileSync(process.execPath, [saveExplanation, "--session-dir", sessionDir, "--project-root", dir, "--commit", hash], { stdio: "pipe" })

  const branchDir = path.join(dir, ".explain-changes", "master")
  let entries
  try {
    entries = await readdir(branchDir)
  } catch {
    // default branch may be "main"
    entries = await readdir(path.join(dir, ".explain-changes", "main"))
  }
  assert.ok(entries.some((f) => f === `${hash}.md`))
  const branchName = git(dir, "rev-parse", "--abbrev-ref", "HEAD").trim()
  const md = await readFile(path.join(dir, ".explain-changes", branchName, `${hash}.md`), "utf8")
  assert.match(md, /Added a second line/)
  assert.match(md, /> general: lgtm/)
})
```

- [ ] **Step 2: Run the test**

Run: `node --test plugin/explain-changes/server/test/e2e.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 3: Run the full server suite**

Run: `npm run test:server`
Expected: every test file PASS.

- [ ] **Step 4: Commit**

```bash
git add plugin/explain-changes/server/test/e2e.test.mjs
git commit -m "test(server): end-to-end payload->commit->save pipeline"
```

---

## Task 7: Author `SKILL.md`

**Files:**
- Create: `plugin/explain-changes/skills/explain-changes/SKILL.md`
- Modify: `plugin/explain-changes/.claude-plugin/plugin.json` (add `skills` pointer)

- [ ] **Step 1: Add the `skills` pointer to the Claude Code manifest**

Edit `plugin/explain-changes/.claude-plugin/plugin.json` to add the key (keep the existing keys):

```json
{
  "name": "explain-changes",
  "version": "0.1.0",
  "description": "Review a coding agent's uncommitted changes in a GitHub-PR-style web UI; save an explanation per commit.",
  "author": { "name": "Alex Gutnikov", "url": "https://github.com/gutnikov" },
  "license": "MIT",
  "keywords": ["claude-code", "codex", "code-review", "diff", "agents"],
  "skills": "./skills/"
}
```

- [ ] **Step 2: Create `plugin/explain-changes/skills/explain-changes/SKILL.md`**

````markdown
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
````

- [ ] **Step 3: Verify the skill is discoverable** (manifest references `./skills/`, the skill dir exists)

Run: `test -f plugin/explain-changes/skills/explain-changes/SKILL.md && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add plugin/explain-changes/.claude-plugin/plugin.json plugin/explain-changes/skills/explain-changes/SKILL.md
git commit -m "feat: add explain-changes skill"
```

---

## Task 8: Codex mirror

**Files:**
- Create: `plugins/explain-changes/.codex-plugin/plugin.json`
- Create: `plugins/explain-changes/skills/explain-changes/SKILL.md` (copy)
- Create: `plugins/explain-changes/README.md`

- [ ] **Step 1: Create `plugins/explain-changes/.codex-plugin/plugin.json`**

```json
{
  "name": "explain-changes",
  "version": "0.1.0",
  "description": "Review a coding agent's uncommitted changes in a GitHub-PR-style web UI; save an explanation per commit (Codex).",
  "author": { "name": "Alex Gutnikov", "url": "https://github.com/gutnikov" },
  "license": "MIT",
  "keywords": ["codex", "claude-code", "code-review", "diff", "agents"],
  "skills": "./skills/",
  "interface": {
    "displayName": "explain-changes",
    "shortDescription": "Review the agent's uncommitted changes in a GitHub-style UI.",
    "category": "Coding",
    "capabilities": ["Interactive", "Read", "Write"]
  }
}
```

- [ ] **Step 2: Mirror the skill and server into the Codex plugin.** The Codex plugin must be self-contained, so copy both the skill and the server:

```bash
mkdir -p plugins/explain-changes/skills
cp -R plugin/explain-changes/skills/explain-changes plugins/explain-changes/skills/explain-changes
cp -R plugin/explain-changes/server plugins/explain-changes/server
```

- [ ] **Step 3: Create `plugins/explain-changes/README.md`**

```markdown
# explain-changes (Codex)

Codex mirror of the explain-changes plugin. See the repo root for development.
The skill and the zero-dep Node bridge server are vendored under this directory
so the Codex plugin is self-contained.
```

- [ ] **Step 4: Commit**

```bash
git add plugins/explain-changes
git commit -m "feat: add Codex plugin mirror"
```

---

## Self-Review notes (resolved)

- **Spec coverage:** uncommitted-vs-HEAD scope (gather), payload/decision schemas
  (build-payload + handler from Plan 1), save-only-on-commit (`commit` branch of the
  skill), request-changes loop (step 5 restart), non-interactive auto-commit, `.md`
  frontmatter format (compose-md), error handling (no changes → stop; commit fails →
  don't save). History reading was delivered in Plan 1 + the UI in Plan 2.
- **Type consistency:** `parse-diff` emits exactly the `FileChange`/`Hunk`/`DiffLine`
  shape the web `lib/api.ts` defines (`type` ∈ context|add|del, `content` keeps the
  prefix). `compose-md` reads `payload.files[].additions/deletions/path` and
  `decision.generalComment/fileComments`, matching `build-payload` output and the
  `Decision` type.
- **Branch-name caveat:** `.explain-changes/<branch>/…` uses the raw branch name; a
  branch like `feature/x` creates a nested `feature/` directory. That is acceptable
  and consistent across `save-explanation` (write) and `history.mjs` (read iterates
  one level of branch dirs; nested-slash branches appear as their top segment dir).
  If flat names are later required, sanitize in both places. Out of scope for v1.

## Definition of Done (Plan 3)

- `npm run test:server` passes (parse-diff, gather, build-payload, compose-md, e2e,
  plus Plan 1's suites).
- `SKILL.md` exists and the Claude manifest points at `./skills/`.
- Codex mirror is self-contained.
- Manual check: in a repo with edits, invoking the skill builds a payload, opens the
  UI, and on "Commit & proceed" writes `.explain-changes/<branch>/<hash>.md`.
```
