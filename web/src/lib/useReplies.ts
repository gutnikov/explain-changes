import { useEffect, useState } from "react"
import { fetchReplies, type Replies } from "./api"

const POLL_MS = 3000

/**
 * Poll GET /replies while `enabled`. Returns the latest replies map
 * ({ commentId: { body, ts } }). Stops polling when disabled/unmounted.
 */
export function useReplies(enabled: boolean): Replies {
  const [replies, setReplies] = useState<Replies>({})

  useEffect(() => {
    if (!enabled) return
    let active = true
    const tick = () => {
      fetchReplies()
        .then((r) => {
          if (active) setReplies(r)
        })
        .catch(() => {})
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [enabled])

  return replies
}
