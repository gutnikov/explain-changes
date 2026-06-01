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
