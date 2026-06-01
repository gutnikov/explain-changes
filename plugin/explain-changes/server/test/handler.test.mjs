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
