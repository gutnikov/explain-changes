import { useState } from "react"
import { MessageSquarePlus, X } from "lucide-react"
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
const marker: Record<string, string> = { add: "+", del: "−", context: "" }
const markerColor: Record<string, string> = {
  add: "text-emerald-500",
  del: "text-rose-500",
  context: "",
}

const keyOf = (a: LineAnchor) => `${a.side}:${a.line}`

function Gutter({ n }: { n: number | null }) {
  return <span className="inline-block w-10 shrink-0 select-none px-2 text-right text-muted-foreground">{n ?? ""}</span>
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

  const renderPlus = (anchor: LineAnchor) => (
    <button
      aria-label={`comment on ${anchor.side} line ${anchor.line}`}
      className="flex w-5 shrink-0 select-none items-center justify-center text-primary opacity-0 group-hover:opacity-100"
      onClick={() => openEditor(anchor)}
    >
      <MessageSquarePlus className="size-3.5" />
    </button>
  )

  const renderBelow = (anchor: LineAnchor, code: string) => {
    const mine = comments.filter((c) => c.side === anchor.side && c.line === anchor.line)
    const isOpen = openKey === keyOf(anchor)
    if (mine.length === 0 && !isOpen) return null
    return (
      <div className="border-y bg-muted/30 px-3 py-2" data-comment-area>
        {mine.map((c, i) => (
          <div key={`${c.side}:${c.line}:${i}`} className="mb-1 rounded-md border bg-card px-2.5 py-1.5 text-xs" data-comment>
            <div className="flex items-start justify-between gap-2">
              <span className="whitespace-pre-wrap font-sans">{c.body}</span>
              <button
                aria-label={`remove comment on ${c.side} line ${c.line}`}
                className="shrink-0 text-muted-foreground hover:text-rose-500"
                onClick={() => onRemoveComment(c)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {isOpen && (
          <div data-comment-editor>
            <textarea
              autoFocus
              className="w-full rounded-md border bg-background p-2 font-sans text-xs"
              rows={2}
              placeholder="Leave a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpenKey(null)
              }}
            />
            <div className="mt-1.5 flex gap-2">
              <button
                className="rounded-md border border-emerald-700/40 bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700"
                onClick={() => submit(anchor, code)}
              >
                Comment
              </button>
              <button className="rounded-md border px-2.5 py-1 text-xs" onClick={() => setOpenKey(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto font-mono text-xs leading-5">
      {file.hunks.map((hunk, hi) => (
        <div key={hi}>
          <div className="bg-primary/5 px-3 py-1 text-primary/80">{hunk.header}</div>
          {mode === "unified"
            ? toUnifiedRows(hunk).map((r, i) => {
                const anchor: LineAnchor =
                  r.type === "del" ? { side: "old", line: r.oldNo! } : { side: "new", line: r.newNo! }
                return (
                  <div key={i}>
                    <div className={cn("group flex whitespace-pre", bg[r.type])}>
                      {renderPlus(anchor)}
                      <Gutter n={r.oldNo} />
                      <Gutter n={r.newNo} />
                      <span className={cn("w-4 shrink-0 select-none text-center", markerColor[r.type])}>{marker[r.type]}</span>
                      <code className="flex-1 pr-3">{r.content.replace(/^[+\- ]/, "")}</code>
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
                      <div data-side="left" className={cn("group flex w-1/2", r.left ? bg[r.left.type] : "")}>
                        {leftAnchor ? renderPlus(leftAnchor) : <span className="w-5 shrink-0" />}
                        <Gutter n={r.left?.no ?? null} />
                        <span className={cn("w-4 shrink-0 select-none text-center", r.left ? markerColor[r.left.type] : "")}>
                          {r.left ? marker[r.left.type] : ""}
                        </span>
                        <code className="flex-1 pr-3">{r.left ? r.left.content.replace(/^[+\- ]/, "") : ""}</code>
                      </div>
                      <div data-side="right" className={cn("group flex w-1/2 border-l", r.right ? bg[r.right.type] : "")}>
                        {rightAnchor ? renderPlus(rightAnchor) : <span className="w-5 shrink-0" />}
                        <Gutter n={r.right?.no ?? null} />
                        <span className={cn("w-4 shrink-0 select-none text-center", r.right ? markerColor[r.right.type] : "")}>
                          {r.right ? marker[r.right.type] : ""}
                        </span>
                        <code className="flex-1 pr-3">{r.right ? r.right.content.replace(/^[+\- ]/, "") : ""}</code>
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
