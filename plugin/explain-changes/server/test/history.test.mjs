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
  assert.equal(entries[0].commit, "1111111")
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

test("ignores non-.md files in a branch dir", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ec-hist-nonmd-"))
  const branchDir = path.join(root, ".explain-changes", "b")
  await mkdir(branchDir, { recursive: true })
  await writeFile(path.join(branchDir, "notes.txt"), "not markdown", "utf8")
  await writeFile(
    path.join(branchDir, "abc.md"),
    ["---", "commit: abc", "date: 2026-06-01T00:00:00Z", "---", "x"].join("\n"),
    "utf8",
  )
  const entries = await readHistory(root)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].commit, "abc")
})

test("falls back to file mtime when date frontmatter is absent", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ec-hist-nodate-"))
  const branchDir = path.join(root, ".explain-changes", "b")
  await mkdir(branchDir, { recursive: true })
  await writeFile(
    path.join(branchDir, "abc.md"),
    ["---", "commit: abc", "---", "body"].join("\n"),
    "utf8",
  )
  const entries = await readHistory(root)
  assert.equal(entries.length, 1)
  assert.match(entries[0].date, /^\d{4}-\d{2}-\d{2}T/)
})

test("reports branch from frontmatter (handles flattened slashed branch dirs)", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ec-hist-slash-"))
  const dir = path.join(root, ".explain-changes", "feature-x") // flattened on disk
  await mkdir(dir, { recursive: true })
  await writeFile(
    path.join(dir, "abc123.md"),
    ["---", "commit: abc123", "branch: feature/x", "date: 2026-06-01T00:00:00Z", "---", "body"].join("\n"),
    "utf8",
  )
  const entries = await readHistory(root)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].branch, "feature/x") // real name from frontmatter, not dir name
})
