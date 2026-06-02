import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReviewComment } from "./types"

interface CommentThreadProps {
  comments: ReviewComment[]
  onDelete?: (index: number) => void
  draft?: string
  onDraftChange?: (v: string) => void
  onDraftSave?: () => void
  onDraftCancel?: () => void
}

export function CommentThread({
  comments,
  onDelete,
  draft,
  onDraftChange,
  onDraftSave,
  onDraftCancel,
}: CommentThreadProps) {
  return (
    <div className="border-y border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2">
      {comments.map((c, i) => (
        <div
          key={`${c.file}:${c.line}:${i}`}
          className="mb-1.5 last:mb-0 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[12px]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="whitespace-pre-wrap font-sans">{c.body}</span>
            {onDelete && (
              <button
                type="button"
                aria-label="Remove comment"
                className="shrink-0 text-[var(--fg-muted)] hover:text-[var(--danger)]"
                onClick={() => onDelete(i)}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
      {draft !== undefined && (
        <div>
          <textarea
            autoFocus
            className={cn(
              "w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2 font-sans text-[12px]",
              "outline-none focus:border-primary/50 transition-colors",
            )}
            rows={2}
            placeholder="Leave a comment…"
            value={draft}
            onChange={(e) => onDraftChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onDraftCancel?.()
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim()) {
                onDraftSave?.()
              }
            }}
          />
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                "bg-[var(--success)] text-white hover:bg-[var(--success)]/90 transition-colors",
              )}
              onClick={onDraftSave}
            >
              Comment
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px]"
              onClick={onDraftCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
