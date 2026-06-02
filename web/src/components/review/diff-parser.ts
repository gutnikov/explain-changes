import type { Hunk, HunkRow } from "./types"

export function parseHunkHeader(header: string): { oldStart: number; newStart: number } {
  const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(header)
  if (!m) return { oldStart: 1, newStart: 1 }
  return { oldStart: Number(m[1]), newStart: Number(m[2]) }
}

export function hunksToUnifiedRows(hunks: Hunk[]): Array<
  | { kind: "hunk-header"; rowKey: string; header: string }
  | { kind: "row"; rowKey: string; row: HunkRow }
> {
  const result: Array<
    | { kind: "hunk-header"; rowKey: string; header: string }
    | { kind: "row"; rowKey: string; row: HunkRow }
  > = []

  for (let hi = 0; hi < hunks.length; hi++) {
    const hunk = hunks[hi]
    const { oldStart, newStart } = parseHunkHeader(hunk.header)
    result.push({ kind: "hunk-header", rowKey: `h${hi}`, header: hunk.header })

    let oldNo = oldStart
    let newNo = newStart

    for (let li = 0; li < hunk.lines.length; li++) {
      const line = hunk.lines[li]
      if (line.type === "context") {
        result.push({
          kind: "row",
          rowKey: `h${hi}:${li}`,
          row: { type: "context", oldLine: oldNo, newLine: newNo, text: line.content },
        })
        oldNo++
        newNo++
      } else if (line.type === "del") {
        result.push({
          kind: "row",
          rowKey: `h${hi}:${li}`,
          row: { type: "del", oldLine: oldNo, newLine: null, text: line.content },
        })
        oldNo++
      } else {
        result.push({
          kind: "row",
          rowKey: `h${hi}:${li}`,
          row: { type: "add", oldLine: null, newLine: newNo, text: line.content },
        })
        newNo++
      }
    }
  }
  return result
}

export function hunksToSplitRows(hunks: Hunk[]): Array<
  | { kind: "hunk-header"; rowKey: string; header: string }
  | { kind: "pair"; rowKey: string; pair: { rowKey: string; left: HunkRow | null; right: HunkRow | null } }
> {
  const result: Array<
    | { kind: "hunk-header"; rowKey: string; header: string }
    | { kind: "pair"; rowKey: string; pair: { rowKey: string; left: HunkRow | null; right: HunkRow | null } }
  > = []

  for (let hi = 0; hi < hunks.length; hi++) {
    const hunk = hunks[hi]
    const { oldStart, newStart } = parseHunkHeader(hunk.header)
    result.push({ kind: "hunk-header", rowKey: `h${hi}`, header: hunk.header })

    let oldNo = oldStart
    let newNo = newStart
    let pendingDel: HunkRow[] = []
    let pendingAdd: HunkRow[] = []

    const flush = () => {
      const n = Math.max(pendingDel.length, pendingAdd.length)
      for (let i = 0; i < n; i++) {
        const key = `h${hi}:pair${result.length}:${i}`
        result.push({
          kind: "pair",
          rowKey: key,
          pair: { rowKey: key, left: pendingDel[i] ?? null, right: pendingAdd[i] ?? null },
        })
      }
      pendingDel = []
      pendingAdd = []
    }

    for (let li = 0; li < hunk.lines.length; li++) {
      const line = hunk.lines[li]
      if (line.type === "context") {
        flush()
        const key = `h${hi}:${li}`
        result.push({
          kind: "pair",
          rowKey: key,
          pair: {
            rowKey: key,
            left: { type: "context", oldLine: oldNo, newLine: null, text: line.content },
            right: { type: "context", oldLine: null, newLine: newNo, text: line.content },
          },
        })
        oldNo++
        newNo++
      } else if (line.type === "del") {
        pendingDel.push({ type: "del", oldLine: oldNo, newLine: null, text: line.content })
        oldNo++
      } else {
        pendingAdd.push({ type: "add", oldLine: null, newLine: newNo, text: line.content })
        newNo++
      }
    }
    flush()
  }
  return result
}
