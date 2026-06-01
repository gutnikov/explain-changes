import type { FileChange } from "@/lib/api"
import { DiffView, type DiffMode } from "./DiffView"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export function FileCard({
  file,
  comment,
  onComment,
  mode,
}: {
  file: FileChange
  comment: string
  onComment: (v: string) => void
  mode: DiffMode
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span>{file.path}</span>
          <Badge variant="secondary">{file.status}</Badge>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-emerald-600">+{file.additions}</span>
          <span className="text-rose-600">−{file.deletions}</span>
        </div>
      </div>
      <DiffView file={file} mode={mode} />
      <div className="border-t p-2">
        <Textarea
          placeholder="Comment on this file…"
          value={comment}
          onChange={(e) => onComment(e.target.value)}
        />
      </div>
    </div>
  )
}
