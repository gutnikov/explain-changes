import { useState } from "react"
import type { FileChange, LineComment, CommentSide } from "@/lib/api"
import { toSplitRows, toUnifiedRows } from "@/lib/diff"
import { cn } from "@/lib/utils"

export type DiffMode = "unified" | "split"
export interface LineAnchor {
  side: CommentSide
  line: number
}

const bg: Record<string, string> = {
  add: "bg-emerald-500/10",
  del: "bg-rose-500/10",
  context: "",
}

const keyOf = (a: LineAnchor) => `${a.side}:${a.line}`

function Gutter({ n }: { n: number | null }) {
  return <span className="inline-block w-10 select-none pr-2 text-right text-xs text-muted-foreground">{n ?? ""}</span>
}

export function DiffView({
  file,
  mode,
  comments,
  onAddComment,
  onRemoveComment,
}: {
  file: FileChange
  mode: DiffMode
  comments: LineComment[]
  onAddComment: (anchor: LineAnchor, code: string, body: string) => void
  onRemoveComment: (comment: LineComment) => void
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  const openEditor = (a: LineAnchor) => {
    setOpenKey(keyOf(a))
    setDraft("")
  }
  const submit = (a: LineAnchor, code: string) => {
    const body = draft.trim()
    if (body) onAddComment(a, code, body)
    setOpenKey(null)
    setDraft("")
  }

  // Plain render helpers (NOT components): calling them inlines their JSX into
  // DiffView's own tree, so the editor textarea is never remounted on keystroke.
  const renderPlus = (anchor: LineAnchor) => (
    <button
      aria-label={`comment on ${anchor.side} line ${anchor.line}`}
      className="w-4 select-none text-primary opacity-0 group-hover:opacity-100"
      onClick={() => openEditor(anchor)}
    >
      +
    </button>
  )

  const renderBelow = (anchor: LineAnchor, code: string) => {
    const mine = comments.filter((c) => c.side === anchor.side && c.line === anchor.line)
    const isOpen = openKey === keyOf(anchor)
    if (mine.length === 0 && !isOpen) return null
    return (
      <div className="border-y bg-muted/30 px-2 py-1" data-comment-area>
        {mine.map((c, i) => (
          <div key={`${c.side}:${c.line}:${i}`} className="flex items-start justify-between gap-2 py-0.5 text-xs" data-comment>
            <span className="whitespace-pre-wrap">{c.body}</span>
            <button
              aria-label={`remove comment on ${c.side} line ${c.line}`}
              className="text-muted-foreground hover:text-rose-600"
              onClick={() => onRemoveComment(c)}
            >
              ×
            </button>
          </div>
        ))}
        {isOpen && (
          <div className="mt-1" data-comment-editor>
            <textarea
              autoFocus
              className="w-full rounded-md border bg-background p-1 text-xs"
              rows={2}
              placeholder="Leave a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpenKey(null)
              }}
            />
            <div className="mt-1 flex gap-2">
              <button className="rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground" onClick={() => submit(anchor, code)}>
                Comment
              </button>
              <button className="rounded-md border px-2 py-0.5 text-xs" onClick={() => setOpenKey(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto font-mono text-xs leading-6">
      {file.hunks.map((hunk, hi) => (
        <div key={hi}>
          <div className="bg-muted px-2 py-1 text-muted-foreground">{hunk.header}</div>
          {mode === "unified"
            ? toUnifiedRows(hunk).map((r, i) => {
                const anchor: LineAnchor =
                  r.type === "del" ? { side: "old", line: r.oldNo! } : { side: "new", line: r.newNo! }
                return (
                  <div key={i}>
                    <div className={cn("group flex whitespace-pre px-2", bg[r.type])}>
                      {renderPlus(anchor)}
                      <Gutter n={r.oldNo} />
                      <Gutter n={r.newNo} />
                      <code className="flex-1">{r.content}</code>
                    </div>
                    {renderBelow(anchor, r.content)}
                  </div>
                )
              })
            : toSplitRows(hunk).map((r, i) => {
                const leftAnchor: LineAnchor | null = r.left ? { side: "old", line: r.left.no } : null
                const rightAnchor: LineAnchor | null = r.right ? { side: "new", line: r.right.no } : null
                return (
                  <div key={i}>
                    <div className="flex whitespace-pre">
                      <div data-side="left" className={cn("group flex w-1/2 px-2", r.left ? bg[r.left.type] : "")}>
                        {leftAnchor ? renderPlus(leftAnchor) : <span className="w-4" />}
                        <Gutter n={r.left?.no ?? null} />
                        <code className="flex-1">{r.left?.content ?? ""}</code>
                      </div>
                      <div data-side="right" className={cn("group flex w-1/2 border-l px-2", r.right ? bg[r.right.type] : "")}>
                        {rightAnchor ? renderPlus(rightAnchor) : <span className="w-4" />}
                        <Gutter n={r.right?.no ?? null} />
                        <code className="flex-1">{r.right?.content ?? ""}</code>
                      </div>
                    </div>
                    {leftAnchor && renderBelow(leftAnchor, r.left!.content)}
                    {rightAnchor && renderBelow(rightAnchor, r.right!.content)}
                  </div>
                )
              })}
        </div>
      ))}
    </div>
  )
}
