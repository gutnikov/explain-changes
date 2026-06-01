import { describe, it, expect } from "vitest"
import { parseHunkHeader, toUnifiedRows, toSplitRows } from "./diff"
import type { Hunk } from "./api"

const hunk: Hunk = {
  header: "@@ -10,3 +10,4 @@",
  lines: [
    { type: "context", content: " a()" },
    { type: "del", content: "-old()" },
    { type: "add", content: "+new()" },
    { type: "add", content: "+extra()" },
    { type: "context", content: " b()" },
  ],
}

describe("parseHunkHeader", () => {
  it("extracts old/new start", () => {
    expect(parseHunkHeader("@@ -10,3 +12,4 @@")).toEqual({ oldStart: 10, newStart: 12 })
  })
  it("falls back to 1 on malformed header", () => {
    expect(parseHunkHeader("garbage")).toEqual({ oldStart: 1, newStart: 1 })
  })
})

describe("toUnifiedRows", () => {
  it("assigns line numbers per type", () => {
    const rows = toUnifiedRows(hunk)
    expect(rows.map((r) => [r.type, r.oldNo, r.newNo, r.content])).toEqual([
      ["context", 10, 10, " a()"],
      ["del", 11, null, "-old()"],
      ["add", null, 11, "+new()"],
      ["add", null, 12, "+extra()"],
      ["context", 12, 13, " b()"],
    ])
  })
})

describe("toSplitRows", () => {
  it("pairs deletes with adds and keeps leftovers", () => {
    const rows = toSplitRows(hunk)
    expect(rows[0].left).toMatchObject({ type: "context", no: 10, content: " a()" })
    expect(rows[0].right).toMatchObject({ type: "context", no: 10, content: " a()" })
    expect(rows[1].left).toMatchObject({ type: "del", no: 11, content: "-old()" })
    expect(rows[1].right).toMatchObject({ type: "add", no: 11, content: "+new()" })
    expect(rows[2].left).toBeNull()
    expect(rows[2].right).toMatchObject({ type: "add", no: 12, content: "+extra()" })
    expect(rows[3].left).toMatchObject({ type: "context", no: 12 })
    expect(rows[3].right).toMatchObject({ type: "context", no: 13 })
  })
})
