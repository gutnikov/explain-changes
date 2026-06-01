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
