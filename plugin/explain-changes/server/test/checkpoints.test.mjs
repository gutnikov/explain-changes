import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { readCheckpoints, readCheckpoint } from "../lib/checkpoints.mjs"

async function setup() {
  const project = await mkdtemp(path.join(tmpdir(), "ec-proj-"))
  const dir = path.join(project, ".explain-changes", "feature-x")
  await mkdir(dir, { recursive: true })
  return { project, dir }
}

test("readCheckpoints lists current-branch sidecars newest-first", async () => {
  const { project, dir } = await setup()
  await writeFile(path.join(dir, "old.json"), JSON.stringify({
    commit: "old", branch: "feature/x", date: "2026-01-01T00:00:00Z",
    explanation: "e", files: [{ path: "a.ts", additions: 2, deletions: 1, hunks: [] }],
  }), "utf8")
  await writeFile(path.join(dir, "new.json"), JSON.stringify({
    commit: "new", branch: "feature/x", date: "2026-02-01T00:00:00Z",
    explanation: "e", files: [{ path: "b.ts", additions: 5, deletions: 0, hunks: [] }, { path: "c.ts", additions: 1, deletions: 0, hunks: [] }],
  }), "utf8")

  const list = await readCheckpoints(project, "feature/x")
  assert.deepEqual(list.map((c) => c.commit), ["new", "old"])
  assert.equal(list[0].fileCount, 2)
  assert.equal(list[0].additions, 6)
  assert.equal(list[0].deletions, 0)
  assert.equal(list[0].hasDiff, true)
})

test("readCheckpoints reports hasDiff:false for an .md without a sidecar", async () => {
  const { project, dir } = await setup()
  await writeFile(path.join(dir, "bare.md"), [
    "---", "commit: bare", "branch: feature/x", "date: 2026-03-01T00:00:00Z",
    "files: [a.ts]", "additions: 3", "deletions: 0", "---", "", "## Why", "x",
  ].join("\n"), "utf8")

  const list = await readCheckpoints(project, "feature/x")
  assert.equal(list.length, 1)
  assert.equal(list[0].commit, "bare")
  assert.equal(list[0].hasDiff, false)
  assert.equal(list[0].additions, 3)
})

test("readCheckpoints ignores other branches and returns [] when none", async () => {
  const { project } = await setup()
  assert.deepEqual(await readCheckpoints(project, "other/branch"), [])
})

test("readCheckpoint returns the sidecar payload; hasDiff:false when only .md", async () => {
  const { project, dir } = await setup()
  await writeFile(path.join(dir, "c1.json"), JSON.stringify({
    commit: "c1", branch: "feature/x", date: "2026-02-01T00:00:00Z",
    explanation: "## Why\nbecause", files: [{ path: "a.ts", additions: 1, deletions: 0, hunks: [] }],
  }), "utf8")
  const got = await readCheckpoint(project, "feature/x", "c1")
  assert.equal(got.explanation, "## Why\nbecause")
  assert.equal(got.files.length, 1)
  assert.equal(got.hasDiff, true)

  await writeFile(path.join(dir, "c2.md"), "---\ncommit: c2\n---\n\n## Why\nonly md", "utf8")
  const got2 = await readCheckpoint(project, "feature/x", "c2")
  assert.equal(got2.hasDiff, false)
  assert.deepEqual(got2.files, [])
  assert.match(got2.explanation, /only md/)
})

test("readCheckpoint returns null when neither file exists", async () => {
  const { project } = await setup()
  assert.equal(await readCheckpoint(project, "feature/x", "nope"), null)
})
