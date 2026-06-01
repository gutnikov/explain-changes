import type { Hunk, LineType } from "./api"

export interface UnifiedRow {
  type: LineType
  oldNo: number | null
  newNo: number | null
  content: string
}

export interface SplitCell {
  type: LineType
  no: number
  content: string
}
export interface SplitRow {
  left: SplitCell | null
  right: SplitCell | null
}

export function parseHunkHeader(header: string): { oldStart: number; newStart: number } {
  const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(header)
  if (!m) return { oldStart: 1, newStart: 1 }
  return { oldStart: Number(m[1]), newStart: Number(m[2]) }
}

export function toUnifiedRows(hunk: Hunk): UnifiedRow[] {
  const { oldStart, newStart } = parseHunkHeader(hunk.header)
  let oldNo = oldStart
  let newNo = newStart
  const rows: UnifiedRow[] = []
  for (const line of hunk.lines) {
    if (line.type === "context") {
      rows.push({ type: "context", oldNo, newNo, content: line.content })
      oldNo++
      newNo++
    } else if (line.type === "del") {
      rows.push({ type: "del", oldNo, newNo: null, content: line.content })
      oldNo++
    } else {
      rows.push({ type: "add", oldNo: null, newNo, content: line.content })
      newNo++
    }
  }
  return rows
}

export function toSplitRows(hunk: Hunk): SplitRow[] {
  const { oldStart, newStart } = parseHunkHeader(hunk.header)
  let oldNo = oldStart
  let newNo = newStart
  const rows: SplitRow[] = []
  let pendingDel: SplitCell[] = []
  let pendingAdd: SplitCell[] = []

  const flush = () => {
    const n = Math.max(pendingDel.length, pendingAdd.length)
    for (let i = 0; i < n; i++) {
      rows.push({ left: pendingDel[i] ?? null, right: pendingAdd[i] ?? null })
    }
    pendingDel = []
    pendingAdd = []
  }

  for (const line of hunk.lines) {
    if (line.type === "context") {
      flush()
      rows.push({
        left: { type: "context", no: oldNo, content: line.content },
        right: { type: "context", no: newNo, content: line.content },
      })
      oldNo++
      newNo++
    } else if (line.type === "del") {
      pendingDel.push({ type: "del", no: oldNo, content: line.content })
      oldNo++
    } else {
      pendingAdd.push({ type: "add", no: newNo, content: line.content })
      newNo++
    }
  }
  flush()
  return rows
}
