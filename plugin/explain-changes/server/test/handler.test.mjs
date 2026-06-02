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

test("index.html is no-cache; hashed assets are immutable", async () => {
  const s = await startServer()
  const html = await fetch(`${s.base}/`)
  assert.equal(html.headers.get("cache-control"), "no-cache")
  // SPA fallback (extensionless route) also serves index.html → must be no-cache
  const spa = await fetch(`${s.base}/history`)
  assert.equal(spa.headers.get("cache-control"), "no-cache")
  const asset = await fetch(`${s.base}/assets/app.js`)
  assert.match(asset.headers.get("cache-control"), /immutable/)
  s.close()
})

test("POST /decision writes decision.json", async () => {
  const s = await startServer()
  const body = JSON.stringify({ action: "commit", generalComment: "ok", lineComments: [] })
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

test("POST /comments appends a line to comments.jsonl", async () => {
  const s = await startServer()
  const c1 = { id: "c1", file: "a.ts", side: "new", line: 1, code: "+x", body: "why?", ts: 1 }
  let res = await fetch(`${s.base}/comments`, { method: "POST", body: JSON.stringify(c1) })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).ok, true)

  const c2 = { id: "c2", file: "b.ts", side: "old", line: 2, code: "-y", body: "rename", ts: 2 }
  await fetch(`${s.base}/comments`, { method: "POST", body: JSON.stringify(c2) })

  const raw = await readFile(path.join(s.sessionDir, "comments.jsonl"), "utf8")
  const lines = raw.trim().split("\n").map((l) => JSON.parse(l))
  assert.equal(lines.length, 2)
  assert.equal(lines[0].id, "c1")
  assert.equal(lines[1].id, "c2")
  s.close()
})

test("GET /comments returns parsed array, [] when missing", async () => {
  const s = await startServer()
  let res = await fetch(`${s.base}/comments`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), [])

  await fetch(`${s.base}/comments`, { method: "POST", body: JSON.stringify({ id: "c1", body: "hi" }) })
  res = await fetch(`${s.base}/comments`)
  const arr = await res.json()
  assert.equal(arr.length, 1)
  assert.equal(arr[0].id, "c1")
  s.close()
})

test("GET /replies returns {} when missing and the map when present", async () => {
  const s = await startServer()
  let res = await fetch(`${s.base}/replies`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), {})

  await writeFile(path.join(s.sessionDir, "replies.json"), JSON.stringify({ c1: { body: "ans", ts: 1 } }), "utf8")
  res = await fetch(`${s.base}/replies`)
  assert.deepEqual(await res.json(), { c1: { body: "ans", ts: 1 } })
  s.close()
})

test("GET /api/checkpoints returns current-branch checkpoints from payload.branch", async () => {
  const s = await startServer()
  await writeFile(path.join(s.sessionDir, "payload.json"), JSON.stringify({ branch: "feature/x" }), "utf8")
  const dir = path.join(s.projectRoot, ".explain-changes", "feature-x")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, "c1.json"), JSON.stringify({
    commit: "c1", branch: "feature/x", date: "2026-02-01T00:00:00Z",
    explanation: "e", files: [{ path: "a.ts", additions: 2, deletions: 0, hunks: [] }],
  }), "utf8")

  const res = await fetch(`${s.base}/api/checkpoints`)
  assert.equal(res.status, 200)
  const list = await res.json()
  assert.equal(list.length, 1)
  assert.equal(list[0].commit, "c1")
  assert.equal(list[0].hasDiff, true)
  s.close()
})

test("GET /api/checkpoints returns [] when payload.json is missing", async () => {
  const s = await startServer()
  const res = await fetch(`${s.base}/api/checkpoints`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), [])
  s.close()
})

test("GET /api/checkpoints/:commit returns the sidecar payload, 404 when missing", async () => {
  const s = await startServer()
  await writeFile(path.join(s.sessionDir, "payload.json"), JSON.stringify({ branch: "feature/x" }), "utf8")
  const dir = path.join(s.projectRoot, ".explain-changes", "feature-x")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, "c1.json"), JSON.stringify({
    commit: "c1", branch: "feature/x", date: "2026-02-01T00:00:00Z",
    explanation: "## Why\nbecause", files: [{ path: "a.ts", additions: 1, deletions: 0, hunks: [] }],
  }), "utf8")

  let res = await fetch(`${s.base}/api/checkpoints/c1`)
  assert.equal(res.status, 200)
  const got = await res.json()
  assert.equal(got.hasDiff, true)
  assert.match(got.explanation, /because/)

  res = await fetch(`${s.base}/api/checkpoints/nope`)
  assert.equal(res.status, 404)
  s.close()
})

test("GET /api/checkpoints/:commit rejects path traversal with 404", async () => {
  const s = await startServer()
  await writeFile(path.join(s.sessionDir, "payload.json"), JSON.stringify({ branch: "feature/x" }), "utf8")
  // A secret one directory above the branch dir; must NOT be readable via traversal.
  await mkdir(path.join(s.projectRoot, ".explain-changes"), { recursive: true })
  await writeFile(path.join(s.projectRoot, ".explain-changes", "secret.json"), JSON.stringify({ commit: "secret" }), "utf8")

  const res = await fetch(`${s.base}/api/checkpoints/${encodeURIComponent("../secret")}`)
  assert.equal(res.status, 404)
  s.close()
})
