import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  fetchPayload,
  postDecision,
  fetchCheckpoints,
  fetchCheckpoint,
  type Payload,
  type DecisionAction,
  type LineComment,
  type CheckpointSummary,
} from "@/lib/api"
import { ReviewLayout } from "@/components/review/ReviewLayout"
import { CheckpointSelect } from "@/components/review/CheckpointSelect"

export function ReviewScreen() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<DecisionAction | null>(null)

  const [checkpoints, setCheckpoints] = useState<CheckpointSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null) // null = current
  const [cpPayload, setCpPayload] = useState<Payload | null>(null)
  const [cpLabel, setCpLabel] = useState<string>("")
  const [cpError, setCpError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayload().then(setPayload).catch((e) => setError(String(e)))
    fetchCheckpoints().then(setCheckpoints).catch(() => {})
  }, [])

  useEffect(() => {
    setCpError(null)
    if (selected === null) {
      setCpPayload(null)
      return
    }
    fetchCheckpoint(selected)
      .then((cp) => {
        setCpPayload({
          branch: payload?.branch ?? "",
          base: cp.commit,
          explanation: cp.hasDiff ? cp.explanation : `${cp.explanation}\n\n> Diff wasn't captured for this checkpoint.`,
          files: cp.files,
        })
        setCpLabel(`checkpoint ${cp.commit.slice(0, 7)}${cp.date ? ` · committed ${new Date(cp.date).toLocaleString()}` : ""}`)
      })
      .catch((e) => setCpError(String(e)))
  }, [selected, payload?.branch])

  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-[var(--danger)]">
        Failed to load: {error}
      </div>
    )
  if (!payload)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  if (done)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <div>
          Decision sent: <strong className="text-foreground">{done}</strong>.
          <br />
          You can return to your terminal.
        </div>
      </div>
    )

  const handleSubmit = async (action: DecisionAction, generalComment: string, lineComments: LineComment[]) => {
    try {
      await postDecision({ action, generalComment, lineComments })
      setDone(action)
    } catch (e) {
      setError(String(e))
      throw e
    }
  }

  const selector = (
    <CheckpointSelect checkpoints={checkpoints} selected={selected} onSelect={setSelected} />
  )

  const isCheckpoint = selected !== null
  const shown = isCheckpoint ? cpPayload : payload

  if (isCheckpoint && cpError)
    return <ReviewLayout payload={payload} onSubmit={handleSubmit} checkpointSlot={selector} />

  if (!shown)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Loading checkpoint…
      </div>
    )

  return (
    <ReviewLayout
      payload={shown}
      onSubmit={handleSubmit}
      readOnly={isCheckpoint}
      readOnlyLabel={isCheckpoint ? cpLabel : undefined}
      checkpointSlot={selector}
    />
  )
}

export const Route = createFileRoute("/")({ component: ReviewScreen })
