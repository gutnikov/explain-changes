import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CommentThread } from "./CommentThread"
import type { ReviewComment } from "./types"

const thread = (over: Partial<ReviewComment> = {}): ReviewComment => ({
  threadId: "t1",
  file: "a.ts",
  line: 1,
  side: "new",
  messages: [{ author: "user", body: "why this approach?", ts: 1 }],
  ...over,
})

describe("CommentThread", () => {
  it("renders the user message body", () => {
    render(<CommentThread comments={[thread()]} />)
    expect(screen.getByText("why this approach?")).toBeInTheDocument()
  })

  it("renders an Agent block for an agent message", () => {
    render(
      <CommentThread
        comments={[
          thread({
            messages: [
              { author: "user", body: "why?", ts: 1 },
              { author: "agent", body: "Because X is faster.", ts: 2 },
            ],
          }),
        ]}
      />,
    )
    expect(screen.getByText("Agent")).toBeInTheDocument()
    expect(screen.getByText("Because X is faster.")).toBeInTheDocument()
  })

  it("shows 'Agent typing…' when the last message is from the user", () => {
    render(<CommentThread comments={[thread()]} />)
    expect(screen.getByText(/agent typing/i)).toBeInTheDocument()
  })

  it("hides 'Agent typing…' once the agent has replied last", () => {
    render(
      <CommentThread
        comments={[
          thread({
            messages: [
              { author: "user", body: "why?", ts: 1 },
              { author: "agent", body: "answer", ts: 2 },
            ],
          }),
        ]}
      />,
    )
    expect(screen.queryByText(/agent typing/i)).not.toBeInTheDocument()
  })

  it("shows 'Agent typing…' again after a follow-up question, even with an earlier first answer", () => {
    // Turn-paired order as produced by buildThreadMessages: Q1, A1, Q2 (Q2 unanswered).
    render(
      <CommentThread
        comments={[
          thread({
            messages: [
              { author: "user", body: "Q1", ts: 1 },
              { author: "agent", body: "A1", ts: 5 },
              { author: "user", body: "Q2", ts: 3 },
            ],
          }),
        ]}
      />,
    )
    expect(screen.getByText(/agent typing/i)).toBeInTheDocument()
  })

  it("renders messages in the order given without re-sorting by ts", () => {
    render(
      <CommentThread
        comments={[
          thread({
            messages: [
              { author: "user", body: "Q1", ts: 1 },
              { author: "agent", body: "A1", ts: 5 },
              { author: "user", body: "Q2", ts: 3 },
              { author: "agent", body: "A2", ts: 6 },
            ],
          }),
        ]}
      />,
    )
    const texts = screen.getAllByText(/^[QA]\d$/).map((el) => el.textContent)
    expect(texts).toEqual(["Q1", "A1", "Q2", "A2"])
  })

  it("sends a follow-up reply via onReply", () => {
    const onReply = vi.fn()
    render(<CommentThread comments={[thread()]} onReply={onReply} />)
    fireEvent.change(screen.getByPlaceholderText(/reply/i), { target: { value: "follow up" } })
    fireEvent.click(screen.getByRole("button", { name: /reply/i }))
    expect(onReply).toHaveBeenCalledWith("t1", "follow up")
  })
})
