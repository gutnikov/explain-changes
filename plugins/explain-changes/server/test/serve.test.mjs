import test from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtemp, writeFile, readFile } from "node:fs/promises"
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
