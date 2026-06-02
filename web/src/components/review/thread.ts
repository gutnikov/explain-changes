import type { Reply } from "@/lib/api"
import type { ThreadMessage } from "./types"

/**
 * Build a thread's message list by pairing each user turn with the agent reply
 * that answers it: the Nth agent reply answers the Nth user message (the agent
 * appends exactly one reply per user turn).
 *
 * We interleave by turn index rather than sorting by timestamp. The agent
 * typically writes its answer *after* the user has already typed the next
 * question, so its reply timestamps are later than both questions — sorting by
 * ts would clump every answer after every question (Q, Q, A, A) instead of
 * threading them as a conversation (Q, A, Q, A).
 */
export function buildThreadMessages(
  userMsgs: { body: string; ts?: number }[],
  agentReplies: Reply[],
): ThreadMessage[] {
  const messages: ThreadMessage[] = []
  const turns = Math.max(userMsgs.length, agentReplies.length)
  for (let t = 0; t < turns; t++) {
    const u = userMsgs[t]
    if (u) messages.push({ author: "user", body: u.body, ts: u.ts ?? t })
    const a = agentReplies[t]
    if (a) messages.push({ author: "agent", body: a.body, ts: a.ts })
  }
  return messages
}
