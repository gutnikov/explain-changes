import { useEffect, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  fetchPayload,
  postDecision,
  type DecisionAction,
  type Payload,
} from "@/lib/api"
import { Explanation } from "@/components/Explanation"
import { FileCard } from "@/components/FileCard"
import { ActionBar } from "@/components/ActionBar"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { DiffMode } from "@/components/DiffView"

export function ReviewScreen() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [general, setGeneral] = useState("")
  const [fileComments, setFileComments] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<DiffMode>("unified")
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

  if (error) return <div className="p-6 text-rose-600">Failed to load: {error}</div>
  if (!payload) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (done)
    return (
      <div className="p-6 text-muted-foreground">
        Decision sent: <strong>{done}</strong>. You can return to your terminal.
      </div>
    )

  const submit = async (action: DecisionAction) => {
    setBusy(true)
    try {
      await postDecision({ action, generalComment: general, fileComments })
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
        onAction={submit}
      />
      <div className="mx-auto max-w-5xl p-4">
        <section className="mb-4 rounded-md border p-4">
          <Explanation markdown={payload.explanation} />
        </section>
        <Textarea
          className="mb-4"
          placeholder="Leave a general comment…"
          value={general}
          onChange={(e) => setGeneral(e.target.value)}
        />
        <div className="mb-3 flex gap-2">
          <Button size="sm" variant={mode === "unified" ? "default" : "outline"} onClick={() => setMode("unified")}>
            Unified
          </Button>
          <Button size="sm" variant={mode === "split" ? "default" : "outline"} onClick={() => setMode("split")}>
            Split
          </Button>
        </div>
        {payload.files.map((f) => (
          <FileCard
            key={f.path}
            file={f}
            mode={mode}
            comment={fileComments[f.path] ?? ""}
            onComment={(v) => setFileComments((c) => ({ ...c, [f.path]: v }))}
          />
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: ReviewScreen })
