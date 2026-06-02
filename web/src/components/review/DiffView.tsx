import { useMemo } from "react"
import type { FileChange, ReviewComment, ViewMode } from "./types"
import { hunksToUnifiedRows, hunksToSplitRows } from "./diff-parser"
import { DiffRowView } from "./DiffRowView"
import { rowStyles } from "./diff-viewer-styles"
import { CommentThread } from "./CommentThread"

type CommentSide = "old" | "new"

export interface DiffViewOverlay {
  commentsForLine: (file: string, side: CommentSide, line: number) => ReviewComment[]
  draftForLine: (file: string, side: CommentSide, line: number) => string | undefined
  onOpenDraft: (side: CommentSide, line: number) => void
  onSaveDraft: (side: CommentSide, line: number) => void
  onCloseDraft: (side: CommentSide, line: number) => void
  onUpdateDraft: (side: CommentSide, line: number, body: string) => void
  onDeleteComment: (file: string, side: CommentSide, line: number, index: number) => void
}

export function DiffView({
  file,
  mode,
  overlay,
}: {
  file: FileChange
  mode: Exclude<ViewMode, "full">
  overlay: DiffViewOverlay
}) {
  const unifiedRows = useMemo(() => hunksToUnifiedRows(file.hunks), [file.hunks])
  const splitRows = useMemo(() => hunksToSplitRows(file.hunks), [file.hunks])

  const renderOverlay = (side: CommentSide, line: number) => {
    const comments = overlay.commentsForLine(file.path, side, line)
    const draft = overlay.draftForLine(file.path, side, line)
    if (comments.length === 0 && draft === undefined) return null
    return (
      <CommentThread
        comments={comments}
        onDelete={(idx) => overlay.onDeleteComment(file.path, side, line, idx)}
        draft={draft}
        onDraftChange={(v) => overlay.onUpdateDraft(side, line, v)}
        onDraftSave={() => overlay.onSaveDraft(side, line)}
        onDraftCancel={() => overlay.onCloseDraft(side, line)}
      />
    )
  }

  if (mode === "changes") {
    return (
      <div className="overflow-x-auto w-full">
        {unifiedRows.map((r) => {
          if (r.kind === "hunk-header") {
            return (
              <div key={r.rowKey} className={rowStyles.hunkHeader}>
                {r.header}
              </div>
            )
          }
          const side: CommentSide = r.row.type === "del" ? "old" : "new"
          const line = (r.row.type === "del" ? r.row.oldLine : r.row.newLine) ?? 0
          return (
            <div key={r.rowKey}>
              <DiffRowView row={r.row} onAddComment={() => overlay.onOpenDraft(side, line)} />
              {renderOverlay(side, line)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-[var(--border)] w-full">
      <div className="overflow-x-auto">
        {splitRows.map((r) => {
          if (r.kind === "hunk-header")
            return (
              <div key={`L-${r.rowKey}`} className={rowStyles.hunkHeader}>
                {r.header}
              </div>
            )
          const left = r.pair.left
          if (!left)
            return (
              <div key={`L-${r.pair.rowKey}`} className={`${rowStyles.base} ${rowStyles.context}`}>
                <span />
                <span />
                <span />
                <span />
              </div>
            )
          const line = left.oldLine ?? 0
          return (
            <div key={`L-${r.pair.rowKey}`}>
              <DiffRowView row={left} onAddComment={() => overlay.onOpenDraft("old", line)} />
              {renderOverlay("old", line)}
            </div>
          )
        })}
      </div>
      <div className="overflow-x-auto">
        {splitRows.map((r) => {
          if (r.kind === "hunk-header")
            return (
              <div key={`R-${r.rowKey}`} className={rowStyles.hunkHeader}>
                {r.header}
              </div>
            )
          const right = r.pair.right
          if (!right)
            return (
              <div key={`R-${r.pair.rowKey}`} className={`${rowStyles.base} ${rowStyles.context}`}>
                <span />
                <span />
                <span />
                <span />
              </div>
            )
          const line = right.newLine ?? 0
          return (
            <div key={`R-${r.pair.rowKey}`}>
              <DiffRowView row={right} onAddComment={() => overlay.onOpenDraft("new", line)} />
              {renderOverlay("new", line)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
