import { describe, it, expect } from "vitest"
import { buildThreadMessages } from "./thread"

describe("buildThreadMessages", () => {
  it("interleaves by turn, not by timestamp", () => {
    // Realistic case: the agent answers Q1 only after the user has already
    // posted Q2, so the first answer's ts (5) is later than Q2's ts (3).
    const users = [
      { body: "Q1", ts: 1 },
      { body: "Q2", ts: 3 },
    ]
    const replies = [
      { body: "A1", ts: 5 },
      { body: "A2", ts: 6 },
    ]
    const msgs = buildThreadMessages(users, replies)
    expect(msgs.map((m) => `${m.author}:${m.body}`)).toEqual([
      "user:Q1",
      "agent:A1",
      "user:Q2",
      "agent:A2",
    ])
  })

  it("leaves the last user turn unanswered when there are fewer replies", () => {
    const msgs = buildThreadMessages(
      [{ body: "Q1", ts: 1 }, { body: "Q2", ts: 3 }],
      [{ body: "A1", ts: 5 }],
    )
    expect(msgs.map((m) => m.author)).toEqual(["user", "agent", "user"])
    expect(msgs[msgs.length - 1].body).toBe("Q2")
  })

  it("handles a single unanswered question", () => {
    const msgs = buildThreadMessages([{ body: "Q1", ts: 1 }], [])
    expect(msgs).toEqual([{ author: "user", body: "Q1", ts: 1 }])
  })

  it("falls back to turn index when a user ts is missing", () => {
    const msgs = buildThreadMessages([{ body: "Q1" }], [])
    expect(msgs[0].ts).toBe(0)
  })
})
