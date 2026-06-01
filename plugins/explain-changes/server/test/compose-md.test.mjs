import test from "node:test"
import assert from "node:assert/strict"
import { composeMarkdown } from "../lib/compose-md.mjs"

const payload = {
  branch: "feature/x",
  base: "HEAD",
  explanation: "## What changed & why\nAdded a line.",
  files: [
    { path: "a.ts", status: "modified", additions: 1, deletions: 0, hunks: [] },
    { path: "b.ts", status: "added", additions: 3, deletions: 0, hunks: [] },
  ],
}

test("includes frontmatter, explanation, and review comments", () => {
  const md = composeMarkdown({
    payload,
    decision: { action: "commit", generalComment: "ship it", fileComments: { "a.ts": "nit" } },
    commit: "9f2a1c7",
    date: "2026-06-01T10:00:00Z",
  })
  assert.match(md, /^---\n/)
  assert.match(md, /commit: 9f2a1c7/)
  assert.match(md, /branch: feature\/x/)
  assert.match(md, /files: \[a\.ts, b\.ts\]/)
  assert.match(md, /additions: 4/)
  assert.match(md, /deletions: 0/)
  assert.match(md, /## What changed & why/)
  assert.match(md, /## Review comments/)
  assert.match(md, /> general: ship it/)
  assert.match(md, /\*\*a\.ts\*\* — nit/)
})

test("omits review comments section when there are none", () => {
  const md = composeMarkdown({
    payload,
    decision: null,
    commit: "abc",
    date: "2026-06-01T10:00:00Z",
  })
  assert.doesNotMatch(md, /## Review comments/)
})
