export type LineType = "context" | "add" | "del"
export interface DiffLine {
  type: LineType
  content: string
}
export interface Hunk {
  header: string
  lines: DiffLine[]
}
export type FileStatus = "modified" | "added" | "deleted" | "renamed"
export interface FileChange {
  path: string
  status: FileStatus
  additions: number
  deletions: number
  hunks: Hunk[]
}
export interface Payload {
  branch: string
  base: string
  explanation: string
  files: FileChange[]
}

export type DecisionAction = "commit" | "request_changes" | "proceed"
export type CommentSide = "old" | "new"
export interface LineComment {
  id: string
  file: string
  side: CommentSide
  line: number
  code: string
  body: string
}
export interface Comment {
  id: string
  file: string
  side: CommentSide
  line: number
  code: string
  body: string
  ts?: number
}
export type Replies = Record<string, { body: string; ts: number }>
export interface Decision {
  action: DecisionAction
  generalComment: string
  lineComments: LineComment[]
}

export interface HistoryEntry {
  branch: string
  commit: string
  date: string
  files: string[]
  additions: number
  deletions: number
  markdown: string
}

export async function fetchPayload(): Promise<Payload> {
  const res = await fetch("/payload")
  if (!res.ok) throw new Error(`payload ${res.status}`)
  return res.json()
}

export async function postDecision(decision: Decision): Promise<void> {
  const res = await fetch("/decision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(decision),
  })
  if (!res.ok) throw new Error(`decision ${res.status}`)
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const res = await fetch("/api/history")
  if (!res.ok) throw new Error(`history ${res.status}`)
  return res.json()
}

export async function postComment(comment: Comment): Promise<void> {
  const res = await fetch("/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ts: Math.floor(Date.now() / 1000), ...comment }),
  })
  if (!res.ok) throw new Error(`comment ${res.status}`)
}

export async function fetchReplies(): Promise<Replies> {
  const res = await fetch("/replies")
  if (!res.ok) throw new Error(`replies ${res.status}`)
  return res.json()
}
