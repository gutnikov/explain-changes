import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const run = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, "..", "save-explanation.mjs")

test("writes a <hash>.json sidecar with explanation and files", async () => {
  const session = await mkdtemp(path.join(tmpdir(), "ec-sess-"))
  const project = await mkdtemp(path.join(tmpdir(), "ec-proj-"))
  const payload = {
    branch: "feature/x",
    base: "HEAD",
    explanation: "## Why\nbecause",
    files: [{ path: "a.ts", status: "modified", additions: 1, deletions: 0, hunks: [{ header: "@@", lines: [{ type: "add", content: "+x" }] }] }],
  }
  await writeFile(path.join(session, "payload.json"), JSON.stringify(payload), "utf8")

  await run("node", [script, "--session-dir", session, "--project-root", project, "--commit", "abc1234"])

  const sidecar = JSON.parse(await readFile(path.join(project, ".explain-changes", "feature-x", "abc1234.json"), "utf8"))
  assert.equal(sidecar.commit, "abc1234")
  assert.equal(sidecar.branch, "feature/x")
  assert.equal(sidecar.explanation, "## Why\nbecause")
  assert.equal(sidecar.files.length, 1)
  assert.equal(sidecar.files[0].path, "a.ts")
  assert.ok(typeof sidecar.date === "string" && sidecar.date.length > 0)

  // The .md is still written (unchanged behavior).
  const md = await readFile(path.join(project, ".explain-changes", "feature-x", "abc1234.md"), "utf8")
  assert.match(md, /because/)
})
