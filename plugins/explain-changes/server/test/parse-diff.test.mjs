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
