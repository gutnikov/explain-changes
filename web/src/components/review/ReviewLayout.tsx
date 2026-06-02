import { useCallback, useMemo, useState } from "react"
import { ChevronsDownUp, ChevronsUpDown, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Payload, DecisionAction, LineComment } from "@/lib/api"
import { ActionButton } from "./ActionButton"
import { DiffFileCard } from "./DiffFileCard"
import { FileTreeSidebar } from "./FileTreeSidebar"
import type { FileChange } from "./types"
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
}

export function ReviewLayout({ payload, onSubmit }: ReviewLayoutProps) {
  const [generalComment, setGeneralComment] = useState("")
  const [lineComments, setLineComments] = useState<LineComment[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Draft state for inline comments
  const [openDraftKey, setOpenDraftKey] = useState<string | null>(null)
  const [draftBody, setDraftBody] = useState("")

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
  }, [])

  const hasComments = generalComment.trim() !== "" || lineComments.length > 0

  const addLineComment = useCallback(
    (file: string, side: "old" | "new", line: number, code: string, body: string) => {
      setLineComments((cs) => [...cs, { file, side, line, code, body }])
    },
    [],
  )

  const removeLineComment = useCallback((file: string, side: "old" | "new", line: number, index: number) => {
    setLineComments((cs) => {
      const filtered = cs.filter((c) => c.file === file && c.side === side && c.line === line)
      const toRemove = filtered[index]
      if (!toRemove) return cs
      return cs.filter((c) => c !== toRemove)
    })
  }, [])

  const buildOverlay = useCallback(
    (file: FileChange): DiffViewOverlay => {
      const draftFileLineKey = (f: string, side: "old" | "new", line: number) => `${f}:${side}:${line}`

      return {
        commentsForLine: (f, side, line) => {
          return lineComments
            .filter((c) => c.file === f && c.side === side && c.line === line)
            .map((c, i) => ({
              id: `${c.file}:${c.side}:${c.line}:${i}`,
              file: c.file,
              line: c.line,
              side: c.side,
              body: c.body,
            }))
        },
        draftForLine: (f, side, line) => {
          const key = draftFileLineKey(f, side, line)
          return openDraftKey === key ? draftBody : undefined
        },
        onOpenDraft: (side, line) => {
          setOpenDraftKey(draftFileLineKey(file.path, side, line))
          setDraftBody("")
        },
        onUpdateDraft: (_side, _line, body) => {
          setDraftBody(body)
        },
        onSaveDraft: (side, line) => {
          if (draftBody.trim()) {
            const code = ""
            addLineComment(file.path, side, line, code, draftBody.trim())
          }
          setOpenDraftKey(null)
          setDraftBody("")
        },
        onCloseDraft: (_side, _line) => {
          setOpenDraftKey(null)
          setDraftBody("")
        },
        onDeleteComment: (f, side, line, index) => {
          removeLineComment(f, side, line, index)
        },
      }
    },
    [lineComments, openDraftKey, draftBody, addLineComment, removeLineComment],
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
            </div>
            <div className="shrink-0">
              <ActionButton hasComments={hasComments} onSubmit={handleSubmit} disabled={submitting} />
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
                />
              )
            })}
          </main>
        </div>
      </div>
    </div>
  )
}
