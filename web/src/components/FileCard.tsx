import { ChevronDown, ChevronRight, FileText } from "lucide-react"
import type { FileChange, LineComment } from "@/lib/api"
import { DiffView, type DiffMode, type LineAnchor } from "./DiffView"
import { Badge } from "@/components/ui/badge"
import { SegmentedControl } from "./SegmentedControl"

function splitPath(path: string) {
  const i = path.lastIndexOf("/")
  return i === -1 ? { dir: "", name: path } : { dir: path.slice(0, i + 1), name: path.slice(i + 1) }
}

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
  const { dir, name } = splitPath(file.path)
  return (
    <div id={`file-${file.path}`} className="mb-4 scroll-mt-24 overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-card px-3 py-1.5">
        <div className="flex items-center gap-2 text-sm">
          <button
            aria-label={collapsed ? "expand file" : "collapse file"}
            className="text-muted-foreground hover:text-foreground"
            onClick={onToggleCollapse}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-xs">
            <span className="text-muted-foreground">{dir}</span>
            {name}
          </span>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {file.status}
          </Badge>
          {comments.length > 0 && <Badge className="rounded-full text-[10px]">{comments.length}</Badge>}
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-emerald-500">+{file.additions}</span>
          <span className="text-rose-500">−{file.deletions}</span>
          <SegmentedControl
            className="ml-1"
            options={[
              { value: "unified", label: "Unified" },
              { value: "split", label: "Split" },
            ]}
            value={mode}
            onChange={onSetMode}
          />
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
