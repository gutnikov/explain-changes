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

test("exits non-zero when --session-dir is missing", async () => {
  const { spawnSync } = await import("node:child_process")
  const res = spawnSync(process.execPath, [cli], { encoding: "utf8" })
  assert.equal(res.status, 1)
  assert.match(res.stderr, /--session-dir is required/)
})
