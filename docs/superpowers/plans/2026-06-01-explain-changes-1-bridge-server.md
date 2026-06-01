# explain-changes Plan 1 — Plugin Scaffold + Node Bridge Server

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the plugin repo skeleton and a zero-dependency Node HTTP server that serves a prebuilt SPA and bridges the agent ↔ browser via `payload.json` / `decision.json`, plus a `/api/history` reader.

**Architecture:** A dumb static + file-drop server (`serve.mjs`) with no git or business logic. It serves `web_dist/` with SPA fallback, returns the session `payload.json`, accepts a `POST /decision`, and reads saved explanations from `.explain-changes/<branch>/*.md`. Logic is split into small, unit-tested modules (`frontmatter`, `history`, `handler`) wired together by a thin launcher.

**Tech Stack:** Node ≥18 (built-in `node:http`, `node:fs`, `node:test`), zero runtime dependencies. Distributed as a Claude Code / Codex plugin.

**Reference:** orca repo at `/Users/agutnikov/work/orca` — its `_SPAStaticFiles` (index.html fallback) and `_web_dist_dir` resolution in `src/orca/daemon/http_api.py`, and its plugin manifests under `.claude-plugin/` / `plugins/orca/.codex-plugin/`.

---

## File Structure

- `package.json` (root) — test script only; no deps.
- `.claude-plugin/marketplace.json` — marketplace entry.
- `plugin/explain-changes/.claude-plugin/plugin.json` — Claude Code manifest.
- `plugin/explain-changes/server/serve.mjs` — launcher (listen, server-info, inactivity timeout).
- `plugin/explain-changes/server/lib/frontmatter.mjs` — parse `.md` frontmatter.
- `plugin/explain-changes/server/lib/history.mjs` — read `.explain-changes/<branch>/*.md`.
- `plugin/explain-changes/server/lib/handler.mjs` — request router (payload / decision / history / static+SPA).
- `plugin/explain-changes/server/test/frontmatter.test.mjs`
- `plugin/explain-changes/server/test/history.test.mjs`
- `plugin/explain-changes/server/test/handler.test.mjs`
- `plugin/explain-changes/server/test/serve.test.mjs`

`server/web_dist/` is produced by Plan 2's build (copied from `web/dist`) and **committed** for distribution. Tests create their own temp `web_dist`, so Plan 1 does not need a real bundle.

---

## Task 1: Repo scaffold + manifests

**Files:**
- Create: `package.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `plugin/explain-changes/.claude-plugin/plugin.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "explain-changes",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test:server": "node --test plugin/explain-changes/server/test/"
  }
}
```

- [ ] **Step 2: Create `.claude-plugin/marketplace.json`**

```json
{
  "name": "explain-changes",
  "owner": {
    "name": "Alex Gutnikov",
    "url": "https://github.com/gutnikov"
  },
  "plugins": [
    {
      "name": "explain-changes",
      "source": "./plugin/explain-changes",
      "description": "GitHub-PR-style review surface for a coding agent's uncommitted changes, with a saved explanation per commit.",
      "version": "0.1.0",
      "license": "MIT",
      "keywords": ["claude-code", "codex", "code-review", "diff", "agents"]
    }
  ]
}
```

- [ ] **Step 3: Create `plugin/explain-changes/.claude-plugin/plugin.json`**

```json
{
  "name": "explain-changes",
  "version": "0.1.0",
  "description": "Review a coding agent's uncommitted changes in a GitHub-PR-style web UI; save an explanation per commit.",
  "author": {
    "name": "Alex Gutnikov",
    "url": "https://github.com/gutnikov"
  },
  "license": "MIT",
  "keywords": ["claude-code", "codex", "code-review", "diff", "agents"]
}
```

- [ ] **Step 4: Update `.gitignore`** — the Vite output `web/dist/` stays ignored, but the committed `server/web_dist/` must NOT be ignored. Replace the file contents with:

```gitignore
.superpowers/
node_modules/
web/dist/
.explain-changes/.session/
.DS_Store
```

- [ ] **Step 5: Commit**

```bash
git add package.json .claude-plugin/marketplace.json plugin/explain-changes/.claude-plugin/plugin.json .gitignore
git commit -m "chore: scaffold explain-changes plugin manifests"
```

---

## Task 2: Frontmatter parser

**Files:**
- Create: `plugin/explain-changes/server/lib/frontmatter.mjs`
- Test: `plugin/explain-changes/server/test/frontmatter.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// plugin/explain-changes/server/test/frontmatter.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { parseFrontmatter } from "../lib/frontmatter.mjs"

test("parses scalars, number, and inline array; returns body", () => {
  const md = [
    "---",
    "commit: 9f2a1c7",
    "branch: feature/rate-limit",
    "files: [src/a.ts, src/b.ts]",
    "additions: 46",
    "deletions: 0",
    "---",
    "## What changed",
    "Body text.",
  ].join("\n")

  const { data, body } = parseFrontmatter(md)
  assert.equal(data.commit, "9f2a1c7")
  assert.equal(data.branch, "feature/rate-limit")
  assert.deepEqual(data.files, ["src/a.ts", "src/b.ts"])
  assert.equal(data.additions, 46)
  assert.equal(data.deletions, 0)
  assert.equal(body, "## What changed\nBody text.")
})

test("returns empty data and full body when no frontmatter", () => {
  const { data, body } = parseFrontmatter("no fm here")
  assert.deepEqual(data, {})
  assert.equal(body, "no fm here")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/frontmatter.test.mjs`
Expected: FAIL — `Cannot find module '../lib/frontmatter.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// plugin/explain-changes/server/lib/frontmatter.mjs

/**
 * Parse a leading `---` frontmatter block. Supports scalars, integers, and
 * inline arrays (`[a, b]`). Anything unrecognized is kept as a trimmed string.
 * Returns { data, body }.
 */
export function parseFrontmatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(markdown)
  if (!match) return { data: {}, body: markdown }

  const [, raw, rest] = match
  const data = {}
  for (const line of raw.split("\n")) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]
    let value = m[2].trim()
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (/^-?\d+$/.test(value)) {
      value = Number(value)
    }
    data[key] = value
  }
  return { data, body: rest.trimStart() }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/frontmatter.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add plugin/explain-changes/server/lib/frontmatter.mjs plugin/explain-changes/server/test/frontmatter.test.mjs
git commit -m "feat(server): add frontmatter parser"
```

---

## Task 3: History reader

**Files:**
- Create: `plugin/explain-changes/server/lib/history.mjs`
- Test: `plugin/explain-changes/server/test/history.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// plugin/explain-changes/server/test/history.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { readHistory } from "../lib/history.mjs"

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "ec-hist-"))
  const branchDir = path.join(root, ".explain-changes", "feature_x")
  await mkdir(branchDir, { recursive: true })
  await writeFile(
    path.join(branchDir, "9f2a1c7.md"),
    [
      "---",
      "commit: 9f2a1c7",
      "branch: feature_x",
      "date: 2026-06-01T10:00:00Z",
      "files: [a.ts]",
      "additions: 5",
      "deletions: 1",
      "---",
      "## What changed",
      "Did a thing.",
    ].join("\n"),
    "utf8",
  )
  // a session dir must be ignored
  await mkdir(path.join(root, ".explain-changes", ".session", "abc"), { recursive: true })
  return root
}

test("reads committed explanations, ignores .session, newest first", async () => {
  const root = await fixture()
  const branchDir = path.join(root, ".explain-changes", "feature_x")
  await writeFile(
    path.join(branchDir, "1111111.md"),
    ["---", "commit: 1111111", "date: 2026-06-02T10:00:00Z", "---", "newer"].join("\n"),
    "utf8",
  )

  const entries = await readHistory(root)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].commit, "1111111") // newest first
  const old = entries.find((e) => e.commit === "9f2a1c7")
  assert.equal(old.branch, "feature_x")
  assert.deepEqual(old.files, ["a.ts"])
  assert.equal(old.additions, 5)
  assert.equal(old.markdown, "## What changed\nDid a thing.")
})

test("returns [] when .explain-changes is absent", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ec-empty-"))
  assert.deepEqual(await readHistory(root), [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/history.test.mjs`
Expected: FAIL — `Cannot find module '../lib/history.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// plugin/explain-changes/server/lib/history.mjs
import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { parseFrontmatter } from "./frontmatter.mjs"

/**
 * Read every committed explanation under `<projectRoot>/.explain-changes/<branch>/*.md`.
 * Dot-directories (e.g. `.session`) are skipped. Sorted newest-first by `date`.
 * Returns [{ branch, commit, date, files, additions, deletions, markdown }].
 */
export async function readHistory(projectRoot) {
  const root = path.join(projectRoot, ".explain-changes")
  let branches
  try {
    branches = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }

  const entries = []
  for (const b of branches) {
    if (!b.isDirectory() || b.name.startsWith(".")) continue
    const branchDir = path.join(root, b.name)
    let files
    try {
      files = await readdir(branchDir)
    } catch {
      continue
    }
    for (const f of files) {
      if (!f.endsWith(".md")) continue
      const full = path.join(branchDir, f)
      const md = await readFile(full, "utf8")
      const { data, body } = parseFrontmatter(md)
      const s = await stat(full)
      entries.push({
        branch: b.name,
        commit: data.commit ?? path.basename(f, ".md"),
        date: data.date ?? s.mtime.toISOString(),
        files: data.files ?? [],
        additions: data.additions ?? 0,
        deletions: data.deletions ?? 0,
        markdown: body,
      })
    }
  }
  entries.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  return entries
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/history.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add plugin/explain-changes/server/lib/history.mjs plugin/explain-changes/server/test/history.test.mjs
git commit -m "feat(server): add history reader"
```

---

## Task 4: Request handler (payload / decision / history / static + SPA)

**Files:**
- Create: `plugin/explain-changes/server/lib/handler.mjs`
- Test: `plugin/explain-changes/server/test/handler.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// plugin/explain-changes/server/test/handler.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createHandler } from "../lib/handler.mjs"

async function startServer() {
  const sessionDir = await mkdtemp(path.join(tmpdir(), "ec-sess-"))
  const projectRoot = await mkdtemp(path.join(tmpdir(), "ec-proj-"))
  const webDistDir = await mkdtemp(path.join(tmpdir(), "ec-dist-"))
  await writeFile(path.join(webDistDir, "index.html"), "<!doctype html><title>app</title>", "utf8")
  await mkdir(path.join(webDistDir, "assets"), { recursive: true })
  await writeFile(path.join(webDistDir, "assets", "app.js"), "console.log(1)", "utf8")

  let activity = 0
  const handler = createHandler({
    sessionDir,
    projectRoot,
    webDistDir,
    onActivity: () => activity++,
  })
  const server = http.createServer(handler)
  await new Promise((r) => server.listen(0, "127.0.0.1", r))
  const base = `http://127.0.0.1:${server.address().port}`
  return { base, sessionDir, projectRoot, webDistDir, close: () => server.close(), activity: () => activity }
}

test("GET /payload returns the session payload, 404 when missing", async () => {
  const s = await startServer()
  let res = await fetch(`${s.base}/payload`)
  assert.equal(res.status, 404)

  await writeFile(path.join(s.sessionDir, "payload.json"), JSON.stringify({ branch: "x" }), "utf8")
  res = await fetch(`${s.base}/payload`)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).branch, "x")
  s.close()
})

test("POST /decision writes decision.json", async () => {
  const s = await startServer()
  const body = JSON.stringify({ action: "commit", generalComment: "ok", fileComments: {} })
  const res = await fetch(`${s.base}/decision`, { method: "POST", body })
  assert.equal(res.status, 200)
  const written = JSON.parse(await readFile(path.join(s.sessionDir, "decision.json"), "utf8"))
  assert.equal(written.action, "commit")
  s.close()
})

test("GET /api/history returns [] for empty project", async () => {
  const s = await startServer()
  const res = await fetch(`${s.base}/api/history`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), [])
  s.close()
})

test("serves index.html at / and static assets", async () => {
  const s = await startServer()
  let res = await fetch(`${s.base}/`)
  assert.equal(res.status, 200)
  assert.match(await res.text(), /<title>app<\/title>/)

  res = await fetch(`${s.base}/assets/app.js`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get("content-type"), /javascript/)
  s.close()
})

test("SPA fallback: unknown extensionless route returns index.html; missing asset is 404", async () => {
  const s = await startServer()
  let res = await fetch(`${s.base}/history`)
  assert.equal(res.status, 200)
  assert.match(await res.text(), /<title>app<\/title>/)

  res = await fetch(`${s.base}/assets/missing.js`)
  assert.equal(res.status, 404)
  s.close()
})

test("onActivity fires on each request", async () => {
  const s = await startServer()
  await fetch(`${s.base}/`)
  await fetch(`${s.base}/api/history`)
  assert.ok(s.activity() >= 2)
  s.close()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/handler.test.mjs`
Expected: FAIL — `Cannot find module '../lib/handler.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// plugin/explain-changes/server/lib/handler.mjs
import { readFile, writeFile, stat } from "node:fs/promises"
import path from "node:path"
import { readHistory } from "./history.mjs"

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" })
  res.end(body)
}

async function sendJsonFile(res, file) {
  try {
    const data = await readFile(file, "utf8")
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" })
    res.end(data)
  } catch {
    sendJson(res, 404, { error: "not found" })
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (c) => (data += c))
    req.on("end", () => resolve(data))
    req.on("error", reject)
  })
}

async function serveStatic(res, webDistRoot, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "")
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "")
  let filePath = path.join(webDistRoot, safe)
  if (!filePath.startsWith(webDistRoot)) {
    return sendJson(res, 403, { error: "forbidden" })
  }
  try {
    const s = await stat(filePath)
    if (s.isDirectory()) filePath = path.join(filePath, "index.html")
  } catch {
    if (path.extname(safe)) return sendJson(res, 404, { error: "not found" })
    filePath = path.join(webDistRoot, "index.html") // SPA fallback
  }
  let data
  try {
    data = await readFile(filePath)
  } catch {
    return sendJson(res, 404, { error: "not found" })
  }
  res.writeHead(200, { "content-type": MIME[path.extname(filePath)] ?? "application/octet-stream" })
  res.end(data)
}

/**
 * Build the request handler. The server is "dumb": it only reads/writes the
 * session files and serves static assets. No git, no business logic.
 */
export function createHandler({ sessionDir, projectRoot, webDistDir, onActivity }) {
  const webDistRoot = path.resolve(webDistDir)
  return async function handle(req, res) {
    onActivity?.()
    const { pathname } = new URL(req.url, "http://localhost")
    try {
      if (req.method === "GET" && pathname === "/payload") {
        return await sendJsonFile(res, path.join(sessionDir, "payload.json"))
      }
      if (req.method === "POST" && pathname === "/decision") {
        const body = await readBody(req)
        await writeFile(path.join(sessionDir, "decision.json"), body, "utf8")
        return sendJson(res, 200, { ok: true })
      }
      if (req.method === "GET" && pathname === "/api/history") {
        return sendJson(res, 200, await readHistory(projectRoot))
      }
      return await serveStatic(res, webDistRoot, pathname)
    } catch (err) {
      return sendJson(res, 500, { error: String(err?.message ?? err) })
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/handler.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add plugin/explain-changes/server/lib/handler.mjs plugin/explain-changes/server/test/handler.test.mjs
git commit -m "feat(server): add request handler with SPA fallback"
```

---

## Task 5: Launcher (`serve.mjs`) + boot smoke test

**Files:**
- Create: `plugin/explain-changes/server/serve.mjs`
- Test: `plugin/explain-changes/server/test/serve.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// plugin/explain-changes/server/test/serve.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const serve = path.join(here, "..", "serve.mjs")

async function waitForFile(file, timeoutMs = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      return JSON.parse(await readFile(file, "utf8"))
    } catch {
      await new Promise((r) => setTimeout(r, 50))
    }
  }
  throw new Error(`timed out waiting for ${file}`)
}

test("serve.mjs boots, writes server-info.json, serves SPA, accepts a decision", async () => {
  const sessionDir = await mkdtemp(path.join(tmpdir(), "ec-serve-sess-"))
  const projectRoot = await mkdtemp(path.join(tmpdir(), "ec-serve-proj-"))
  const webDist = await mkdtemp(path.join(tmpdir(), "ec-serve-dist-"))
  await writeFile(path.join(webDist, "index.html"), "<!doctype html><title>app</title>", "utf8")
  await writeFile(path.join(sessionDir, "payload.json"), JSON.stringify({ branch: "x" }), "utf8")

  const child = spawn(process.execPath, [
    serve,
    "--session-dir", sessionDir,
    "--project-root", projectRoot,
    "--web-dist", webDist,
  ])
  try {
    const info = await waitForFile(path.join(sessionDir, "server-info.json"))
    assert.ok(info.port > 0)
    assert.match(info.url, /^http:\/\/localhost:\d+$/)

    const payload = await (await fetch(`${info.url}/payload`)).json()
    assert.equal(payload.branch, "x")

    const spa = await (await fetch(`${info.url}/some/route`)).text()
    assert.match(spa, /<title>app<\/title>/)

    const res = await fetch(`${info.url}/decision`, {
      method: "POST",
      body: JSON.stringify({ action: "proceed", generalComment: "", fileComments: {} }),
    })
    assert.equal(res.status, 200)
    const decision = JSON.parse(await readFile(path.join(sessionDir, "decision.json"), "utf8"))
    assert.equal(decision.action, "proceed")
  } finally {
    child.kill()
  }
})

test("serve.mjs exits 1 when --session-dir is missing", async () => {
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [serve])
    child.on("exit", (c) => resolve(c))
  })
  assert.equal(code, 1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugin/explain-changes/server/test/serve.test.mjs`
Expected: FAIL — spawn errors because `serve.mjs` does not exist (info file never appears → timeout / non-1 exit).

- [ ] **Step 3: Write minimal implementation**

```js
#!/usr/bin/env node
// plugin/explain-changes/server/serve.mjs
import http from "node:http"
import path from "node:path"
import { writeFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createHandler } from "./lib/handler.mjs"

const INACTIVITY_MS = 30 * 60 * 1000

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main() {
  const sessionDirArg = arg("session-dir", "")
  if (!sessionDirArg) {
    console.error("--session-dir is required")
    process.exit(1)
  }
  const sessionDir = path.resolve(sessionDirArg)
  const projectRoot = path.resolve(arg("project-root", process.cwd()))
  const here = path.dirname(fileURLToPath(import.meta.url))
  const webDistDir = path.resolve(arg("web-dist", path.join(here, "web_dist")))

  await mkdir(sessionDir, { recursive: true })

  let inactivityTimer
  const resetInactivity = () => {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      server.close()
      process.exit(0)
    }, INACTIVITY_MS)
  }

  const handler = createHandler({ sessionDir, projectRoot, webDistDir, onActivity: resetInactivity })
  const server = http.createServer(handler)

  server.listen(0, "127.0.0.1", async () => {
    const { port } = server.address()
    const info = { url: `http://localhost:${port}`, port, pid: process.pid }
    await writeFile(path.join(sessionDir, "server-info.json"), JSON.stringify(info), "utf8")
    console.log(JSON.stringify(info))
    resetInactivity()
  })
}

main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test plugin/explain-changes/server/test/serve.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the whole server suite**

Run: `npm run test:server`
Expected: PASS — all four test files green.

- [ ] **Step 6: Commit**

```bash
git add plugin/explain-changes/server/serve.mjs plugin/explain-changes/server/test/serve.test.mjs
git commit -m "feat(server): add serve.mjs launcher with inactivity timeout"
```

---

## Definition of Done (Plan 1)

- `npm run test:server` passes all tests.
- `node plugin/explain-changes/server/serve.mjs --session-dir <dir> --web-dist <dir>` boots, writes `server-info.json`, serves the SPA with fallback, returns `/payload`, accepts `POST /decision`, and returns `/api/history`.
- Plugin manifests exist for the Claude Code marketplace.
- Next: **Plan 2** builds the React `web/` app whose `dist` is copied into `server/web_dist`.
