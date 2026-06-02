import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { fetchPayload, postDecision, type Payload, type DecisionAction, type LineComment } from "@/lib/api"
import { ReviewLayout } from "@/components/review/ReviewLayout"

export function ReviewScreen() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<DecisionAction | null>(null)

  useEffect(() => {
    fetchPayload().then(setPayload).catch((e) => setError(String(e)))
  }, [])

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

  return <ReviewLayout payload={payload} onSubmit={handleSubmit} />
}

export const Route = createFileRoute("/")({ component: ReviewScreen })
