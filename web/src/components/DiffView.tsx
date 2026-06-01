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

  const Plus = ({ anchor }: { anchor: LineAnchor }) => (
    <button
      aria-label={`comment on ${anchor.side} line ${anchor.line}`}
      className="w-4 select-none text-primary opacity-0 group-hover:opacity-100"
      onClick={() => openEditor(anchor)}
    >
      +
    </button>
  )

  const Below = ({ anchor, code }: { anchor: LineAnchor; code: string }) => {
    const mine = comments.filter((c) => c.side === anchor.side && c.line === anchor.line)
    const isOpen = openKey === keyOf(anchor)
    if (mine.length === 0 && !isOpen) return null
    return (
      <div className="border-y bg-muted/30 px-2 py-1" data-comment-area>
        {mine.map((c, i) => (
          <div key={i} className="flex items-start justify-between gap-2 py-0.5 text-xs" data-comment>
            <span className="whitespace-pre-wrap">{c.body}</span>
            <button aria-label="remove comment" className="text-muted-foreground hover:text-rose-600" onClick={() => onRemoveComment(c)}>
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
      {file.hunks.map((hunk, hi) => {
        const unifiedRows = toUnifiedRows(hunk)
        const splitRows = toSplitRows(hunk)

        // Build sequential 1-based line numbers per side for add/del rows only.
        // Context lines don't receive comment buttons (no anchor).
        let addSeq = 0
        let delSeq = 0
        const unifiedAnchors: (LineAnchor | null)[] = unifiedRows.map((r) => {
          if (r.type === "add") {
            addSeq++
            return { side: "new" as CommentSide, line: addSeq }
          } else if (r.type === "del") {
            delSeq++
            return { side: "old" as CommentSide, line: delSeq }
          } else {
            // context: no comment button
            return null
          }
        })

        return (
          <div key={hi}>
            <div className="bg-muted px-2 py-1 text-muted-foreground">{hunk.header}</div>
            {mode === "unified"
              ? unifiedRows.map((r, i) => {
                  const anchor = unifiedAnchors[i]
                  return (
                    <div key={i}>
                      <div className={cn("group flex whitespace-pre px-2", bg[r.type])}>
                        {anchor ? <Plus anchor={anchor} /> : <span className="w-4" />}
                        <Gutter n={r.oldNo} />
                        <Gutter n={r.newNo} />
                        <code className="flex-1">{r.content}</code>
                      </div>
                      {anchor && <Below anchor={anchor} code={r.content} />}
                    </div>
                  )
                })
              : splitRows.map((r, i) => {
                  const leftAnchor: LineAnchor | null = r.left ? { side: "old", line: r.left.no } : null
                  const rightAnchor: LineAnchor | null = r.right ? { side: "new", line: r.right.no } : null
                  return (
                    <div key={i}>
                      <div className="flex whitespace-pre">
                        <div data-side="left" className={cn("group flex w-1/2 px-2", r.left ? bg[r.left.type] : "")}>
                          {leftAnchor ? <Plus anchor={leftAnchor} /> : <span className="w-4" />}
                          <Gutter n={r.left?.no ?? null} />
                          <code className="flex-1">{r.left?.content ?? ""}</code>
                        </div>
                        <div data-side="right" className={cn("group flex w-1/2 border-l px-2", r.right ? bg[r.right.type] : "")}>
                          {rightAnchor ? <Plus anchor={rightAnchor} /> : <span className="w-4" />}
                          <Gutter n={r.right?.no ?? null} />
                          <code className="flex-1">{r.right?.content ?? ""}</code>
                        </div>
                      </div>
                      {leftAnchor && <Below anchor={leftAnchor} code={r.left!.content} />}
                      {rightAnchor && <Below anchor={rightAnchor} code={r.right!.content} />}
                    </div>
                  )
                })}
          </div>
        )
      })}
    </div>
  )
}
