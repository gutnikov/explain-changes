import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ChevronsDownUp, ChevronsUpDown, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Payload, DecisionAction, LineComment } from "@/lib/api"
import { postComment } from "@/lib/api"
import { useReplies } from "@/lib/useReplies"
import { ActionButton } from "./ActionButton"
import { DiffFileCard } from "./DiffFileCard"
import { FileTreeSidebar } from "./FileTreeSidebar"
import type { FileChange, ReviewComment, ThreadMessage } from "./types"
import type { DiffViewOverlay } from "./DiffView"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function anchorForId(id: string): string {
  return "file-" + id.replace(/[^a-zA-Z0-9_-]+/g, "-")
}

function toFileChange(f: Payload["files"][number]): FileChange {
  return {
    path: f.path,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    hunks: f.hunks,
  }
}

interface ReviewLayoutProps {
  payload: Payload
  onSubmit: (action: DecisionAction, generalComment: string, lineComments: LineComment[]) => Promise<void>
  readOnly?: boolean
  readOnlyLabel?: string
  checkpointSlot?: ReactNode
}

export function ReviewLayout({ payload, onSubmit, readOnly = false, readOnlyLabel, checkpointSlot }: ReviewLayoutProps) {
  const [generalComment, setGeneralComment] = useState("")
  const [lineComments, setLineComments] = useState<LineComment[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Draft state for inline comments
  const [openDraftKey, setOpenDraftKey] = useState<string | null>(null)
  const [draftBody, setDraftBody] = useState("")
  const [draftCode, setDraftCode] = useState("")

  const replies = useReplies(!readOnly)

  const files = useMemo(() => payload.files.map(toFileChange), [payload.files])
  const allFileIds = useMemo(() => files.map((f) => f.path), [files])

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const allCollapsed = allFileIds.length > 0 && allFileIds.every((id) => collapsedIds.has(id))

  const toggleCollapsed = useCallback(
    (id: string) =>
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [],
  )
  const collapseAll = useCallback(() => setCollapsedIds(new Set(allFileIds)), [allFileIds])
  const expandAll = useCallback(() => setCollapsedIds(new Set()), [])

  const [selectedId, setSelectedId] = useState<string>(files[0]?.path ?? "")

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    const el = document.getElementById(anchorForId(id))
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    // Keep the URL hash in sync so the current file is a copy-pasteable deeplink.
    if (typeof history !== "undefined") {
      history.replaceState(null, "", "#" + anchorForId(id))
    }
  }, [])

  // Deeplink: on load, if the URL hash names a file anchor, scroll to it.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    if (!hash) return
    const match = allFileIds.find((id) => anchorForId(id) === hash)
    if (!match) return
    setSelectedId(match)
    document.getElementById(hash)?.scrollIntoView({ block: "start" })
  }, [allFileIds])

  const hasComments = generalComment.trim() !== "" || lineComments.length > 0

  const addLineComment = useCallback(
    (file: string, side: "old" | "new", line: number, code: string, body: string) => {
      const id = crypto.randomUUID()
      const c = { id, threadId: id, file, side, line, code, body, ts: Math.floor(Date.now() / 1000) }
      setLineComments((cs) => [...cs, c])
      postComment(c).catch(() => {})
    },
    [],
  )

  // A follow-up message reuses the original comment's threadId (and its anchor)
  // with a fresh id, so the agent treats it as the next turn in the same thread.
  const addReply = useCallback(
    (threadId: string, body: string) => {
      setLineComments((cs) => {
        const root = cs.find((c) => c.threadId === threadId)
        if (!root) return cs
        const id = crypto.randomUUID()
        const c = {
          id,
          threadId,
          file: root.file,
          side: root.side,
          line: root.line,
          code: root.code,
          body,
          ts: Math.floor(Date.now() / 1000),
        }
        postComment(c).catch(() => {})
        return [...cs, c]
      })
    },
    [],
  )

  const removeLineComment = useCallback((threadId: string) => {
    setLineComments((cs) => cs.filter((c) => c.threadId !== threadId))
  }, [])

  const buildOverlay = useCallback(
    (file: FileChange): DiffViewOverlay => {
      const draftFileLineKey = (f: string, side: "old" | "new", line: number) => `${f}:${side}:${line}`

      return {
        commentsForLine: (f, side, line) => {
          const here = lineComments.filter((c) => c.file === f && c.side === side && c.line === line)
          // One ReviewComment per thread; messages interleave the user's comments
          // (in insertion order) with the agent's replies for that thread.
          const seen = new Set<string>()
          const threads: ReviewComment[] = []
          for (const c of here) {
            if (seen.has(c.threadId)) continue
            seen.add(c.threadId)
            const userMsgs = here.filter((x) => x.threadId === c.threadId)
            const messages: ThreadMessage[] = userMsgs.map((x, i) => ({
              author: "user" as const,
              body: x.body,
              ts: x.ts ?? i,
            }))
            const agentMsgs = replies[c.threadId] ?? []
            for (const a of agentMsgs) {
              messages.push({ author: "agent", body: a.body, ts: a.ts })
            }
            threads.push({ threadId: c.threadId, file: c.file, line: c.line, side: c.side, messages })
          }
          return threads
        },
        draftForLine: (f, side, line) => {
          const key = draftFileLineKey(f, side, line)
          return openDraftKey === key ? draftBody : undefined
        },
        onOpenDraft: (side, line, code) => {
          if (readOnly) return
          setOpenDraftKey(draftFileLineKey(file.path, side, line))
          setDraftBody("")
          setDraftCode(code)
        },
        onUpdateDraft: (_side, _line, body) => {
          if (readOnly) return
          setDraftBody(body)
        },
        onSaveDraft: (side, line) => {
          if (readOnly) return
          if (draftBody.trim()) {
            addLineComment(file.path, side, line, draftCode, draftBody.trim())
          }
          setOpenDraftKey(null)
          setDraftBody("")
          setDraftCode("")
        },
        onCloseDraft: (_side, _line) => {
          if (readOnly) return
          setOpenDraftKey(null)
          setDraftBody("")
        },
        onDeleteComment: (threadId) => {
          if (readOnly) return
          removeLineComment(threadId)
        },
        onReply: (threadId, body) => {
          if (readOnly) return
          addReply(threadId, body)
        },
      }
    },
    [readOnly, lineComments, openDraftKey, draftBody, draftCode, replies, addLineComment, removeLineComment, addReply],
  )

  const handleSubmit = async (action: DecisionAction) => {
    setSubmitting(true)
    try {
      await onSubmit(action, generalComment, lineComments)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        {/* Header card */}
        <header className="rounded-lg border border-border bg-card p-5 mb-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight">Code review</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground font-mono">
                <span className="text-foreground/85">{payload.branch}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>
                  base{" "}
                  <span className="text-foreground bg-muted px-1.5 py-0.5 rounded">{payload.base.slice(0, 8)}</span>
                </span>
              </div>
              {checkpointSlot ? <div className="mt-2">{checkpointSlot}</div> : null}
            </div>
            <div className="shrink-0">
              {readOnly ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--subtle)] px-2.5 py-1 text-[11px] text-[var(--fg-muted)]">
                  Read-only{readOnlyLabel ? ` — ${readOnlyLabel}` : ""}
                </span>
              ) : (
                <ActionButton hasComments={hasComments} onSubmit={handleSubmit} disabled={submitting} />
              )}
            </div>
          </div>
        </header>

        {/* Two-pane layout */}
        <div className="flex gap-5 items-start">
          <div className="w-[260px] shrink-0 sticky top-6 h-[calc(100vh-3rem)] overflow-hidden">
            <FileTreeSidebar
              files={files.map((f) => ({
                path: f.path,
                status: f.status,
                commentCount: lineComments.filter((c) => c.file === f.path).length,
              }))}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
          <main className="flex-1 min-w-0 space-y-4">
            {/* Stacked file feed toolbar */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2">
              <div className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">{allFileIds.length}</span>{" "}
                {allFileIds.length === 1 ? "file" : "files"}
              </div>
              <button
                type="button"
                onClick={allCollapsed ? expandAll : collapseAll}
                className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                {allCollapsed ? (
                  <>
                    <ChevronsUpDown size={13} />
                    Expand all
                  </>
                ) : (
                  <>
                    <ChevronsDownUp size={13} />
                    Collapse all
                  </>
                )}
              </button>
            </div>

            {/* Explanation card */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                <MessageSquare size={14} className="text-muted-foreground shrink-0" />
                <span className="text-[13px] font-semibold">Explanation</span>
              </div>
              <div className="px-4 py-3 prose prose-sm dark:prose-invert max-w-none text-[13px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{payload.explanation}</ReactMarkdown>
              </div>
            </div>

            {/* Overall feedback */}
            {!readOnly && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                  <MessageSquare size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-[13px] font-semibold">General comment</span>
                  <span className="text-[11px] text-muted-foreground/80">optional</span>
                  {generalComment.trim().length > 0 ? (
                    <span className="ml-auto text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                      {generalComment.trim().length} chars
                    </span>
                  ) : null}
                </div>
                <div className="px-4 py-3">
                  <textarea
                    value={generalComment}
                    onChange={(e) => setGeneralComment(e.target.value)}
                    rows={3}
                    placeholder="Leave a general comment about the changes…"
                    className={cn(
                      "w-full px-3 py-2 text-[13px] font-sans resize-y",
                      "bg-background border border-border rounded-md",
                      "placeholder:text-muted-foreground/70",
                      "outline-none focus:border-primary/50 focus-visible:ring-0 transition-colors",
                    )}
                  />
                </div>
              </div>
            )}

            {/* File cards */}
            {files.map((file) => {
              const overlay = buildOverlay(file)
              const commentCount = lineComments.filter((c) => c.file === file.path).length
              return (
                <DiffFileCard
                  key={file.path}
                  anchorId={anchorForId(file.path)}
                  file={file}
                  overlay={overlay}
                  collapsed={collapsedIds.has(file.path)}
                  onToggleCollapsed={() => toggleCollapsed(file.path)}
                  commentCount={commentCount}
                  readOnly={readOnly}
                />
              )
            })}
          </main>
        </div>
      </div>
    </div>
  )
}
