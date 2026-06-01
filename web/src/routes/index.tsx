import { useEffect, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  fetchPayload,
  postDecision,
  type DecisionAction,
  type Payload,
  type LineComment,
} from "@/lib/api"
import { Explanation } from "@/components/Explanation"
import { FileCard } from "@/components/FileCard"
import { ActionBar } from "@/components/ActionBar"
import { ControlsBar } from "@/components/ControlsBar"
import { FileList } from "@/components/FileList"
import { CommentBox } from "@/components/CommentBox"
import type { DiffMode, LineAnchor } from "@/components/DiffView"

export function ReviewScreen() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [general, setGeneral] = useState("")
  const [lineComments, setLineComments] = useState<LineComment[]>([])
  const [defaultMode, setDefaultMode] = useState<DiffMode>("unified")
  const [fileModes, setFileModes] = useState<Record<string, DiffMode>>({})
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<DecisionAction | null>(null)

  useEffect(() => {
    fetchPayload().then(setPayload).catch((e) => setError(String(e)))
  }, [])

  const totals = useMemo(() => {
    const files = payload?.files ?? []
    return {
      count: files.length,
      additions: files.reduce((s, f) => s + f.additions, 0),
      deletions: files.reduce((s, f) => s + f.deletions, 0),
    }
  }, [payload])

  if (error)
    return <div className="flex min-h-screen items-center justify-center p-6 text-sm text-rose-500">Failed to load: {error}</div>
  if (!payload)
    return <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">Loading…</div>
  if (done)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <div>
          Decision sent: <strong className="text-foreground">{done}</strong>.
          <br />You can return to your terminal.
        </div>
      </div>
    )

  const hasComments = general.trim() !== "" || lineComments.length > 0

  const addLineComment = (file: string, anchor: LineAnchor, code: string, body: string) =>
    setLineComments((cs) => [...cs, { file, side: anchor.side, line: anchor.line, code, body }])
  const removeLineComment = (comment: LineComment) => setLineComments((cs) => cs.filter((c) => c !== comment))

  const expandAll = () => setCollapsed(new Set())
  const collapseAll = () => setCollapsed(new Set(payload.files.map((f) => f.path)))
  const toggleCollapse = (path: string) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  const scrollTo = (path: string) =>
    document.getElementById(`file-${path}`)?.scrollIntoView({ behavior: "smooth" })

  const submit = async (action: DecisionAction) => {
    setBusy(true)
    try {
      await postDecision({ action, generalComment: general, lineComments })
      setDone(action)
    } catch (e) {
      setError(String(e))
      setBusy(false)
    }
  }

  return (
    <div>
      <ActionBar
        branch={payload.branch}
        fileCount={totals.count}
        additions={totals.additions}
        deletions={totals.deletions}
        busy={busy}
        hasComments={hasComments}
        onAction={submit}
      />
      <ControlsBar
        defaultMode={defaultMode}
        onSetDefaultMode={setDefaultMode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
      <div className="flex">
        <FileList files={payload.files} onSelect={scrollTo} />
        <div className="mx-auto min-w-0 max-w-5xl flex-1 p-4">
          <div className="mb-4">
            <Explanation markdown={payload.explanation} />
          </div>
          <div className="mb-4">
            <CommentBox value={general} onChange={setGeneral} placeholder="Leave a general comment…" />
          </div>
          {payload.files.map((f) => (
            <FileCard
              key={f.path}
              file={f}
              mode={fileModes[f.path] ?? defaultMode}
              onSetMode={(m) => setFileModes((fm) => ({ ...fm, [f.path]: m }))}
              collapsed={collapsed.has(f.path)}
              onToggleCollapse={() => toggleCollapse(f.path)}
              comments={lineComments.filter((c) => c.file === f.path)}
              onAddComment={(anchor, code, body) => addLineComment(f.path, anchor, code, body)}
              onRemoveComment={removeLineComment}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: ReviewScreen })
