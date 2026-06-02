export type FileStatus = "modified" | "added" | "deleted" | "renamed"
export type ViewMode = "changes" | "split"
export type LineType = "context" | "add" | "del"

export interface DiffLine {
  type: LineType
  content: string
}

export interface Hunk {
  header: string
  lines: DiffLine[]
}

export interface FileChange {
  path: string
  status: FileStatus
  additions: number
  deletions: number
  hunks: Hunk[]
}

export interface ThreadMessage {
  author: "user" | "agent"
  body: string
  ts: number
}

export interface ReviewComment {
  threadId: string
  file: string
  line: number
  side: "old" | "new"
  messages: ThreadMessage[]
}

export interface HunkRow {
  type: LineType
  oldLine: number | null
  newLine: number | null
  text: string
}
