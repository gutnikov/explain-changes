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

test("includes frontmatter, explanation, and grouped line comments", () => {
  const md = composeMarkdown({
    payload,
    decision: {
      action: "commit",
      generalComment: "ship it",
      lineComments: [
        { file: "a.ts", side: "new", line: 11, code: "+x", body: "nit" },
        { file: "a.ts", side: "new", line: 20, code: "+y", body: "rename" },
        { file: "b.ts", side: "new", line: 1, code: "+z", body: "good" },
      ],
    },
    commit: "9f2a1c7",
    date: "2026-06-01T10:00:00Z",
  })
  assert.match(md, /^---\n/)
  assert.match(md, /commit: 9f2a1c7/)
  assert.match(md, /files: \[a\.ts, b\.ts\]/)
  assert.match(md, /additions: 4/)
  assert.match(md, /## What changed & why/)
  assert.match(md, /## Review comments/)
  assert.match(md, /> general: ship it/)
  assert.match(md, /\*\*a\.ts\*\*/)
  assert.match(md, /- L11: nit/)
  assert.match(md, /- L20: rename/)
  assert.match(md, /\*\*b\.ts\*\*/)
  assert.match(md, /- L1: good/)
})

test("general comment alone still renders the section", () => {
  const md = composeMarkdown({
    payload,
    decision: { action: "commit", generalComment: "lgtm", lineComments: [] },
    commit: "abc",
    date: "2026-06-01T10:00:00Z",
  })
  assert.match(md, /## Review comments/)
  assert.match(md, /> general: lgtm/)
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
