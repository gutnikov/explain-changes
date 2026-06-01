import type { FileChange, LineComment } from "@/lib/api"
import { DiffView, type DiffMode, type LineAnchor } from "./DiffView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function FileCard({
  file,
  mode,
  onSetMode,
  collapsed,
  onToggleCollapse,
  comments,
  onAddComment,
  onRemoveComment,
}: {
  file: FileChange
  mode: DiffMode
  onSetMode: (m: DiffMode) => void
  collapsed: boolean
  onToggleCollapse: () => void
  comments: LineComment[]
  onAddComment: (anchor: LineAnchor, code: string, body: string) => void
  onRemoveComment: (comment: LineComment) => void
}) {
  return (
    <div id={`file-${file.path}`} className="mb-4 scroll-mt-24 overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-2 font-mono text-sm">
          <button
            aria-label={collapsed ? "expand file" : "collapse file"}
            className="text-muted-foreground"
            onClick={onToggleCollapse}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <span>{file.path}</span>
          <Badge variant="secondary">{file.status}</Badge>
          {comments.length > 0 && <Badge>{comments.length}</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-600">+{file.additions}</span>
          <span className="text-rose-600">−{file.deletions}</span>
          <div className="ml-2 flex gap-1">
            <Button size="sm" variant={mode === "unified" ? "default" : "outline"} onClick={() => onSetMode("unified")}>
              Unified
            </Button>
            <Button size="sm" variant={mode === "split" ? "default" : "outline"} onClick={() => onSetMode("split")}>
              Split
            </Button>
          </div>
        </div>
      </div>
      {!collapsed && (
        <DiffView
          file={file}
          mode={mode}
          comments={comments}
          onAddComment={onAddComment}
          onRemoveComment={onRemoveComment}
        />
      )}
    </div>
  )
}
