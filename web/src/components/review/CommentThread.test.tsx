import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CommentThread } from "./CommentThread"
import type { ReviewComment } from "./types"

const comment = (over: Partial<ReviewComment> = {}): ReviewComment => ({
  id: "c1",
  file: "a.ts",
  line: 1,
  side: "new",
  body: "why this approach?",
  ...over,
})

describe("CommentThread", () => {
  it("renders the user comment body", () => {
    render(<CommentThread comments={[comment()]} />)
    expect(screen.getByText("why this approach?")).toBeInTheDocument()
  })

  it("renders an agent reply block when reply is present", () => {
    render(<CommentThread comments={[comment({ reply: "Because X is faster." })]} />)
    expect(screen.getByText("Agent")).toBeInTheDocument()
    expect(screen.getByText("Because X is faster.")).toBeInTheDocument()
  })

  it("does not render an Agent block when no reply", () => {
    render(<CommentThread comments={[comment()]} />)
    expect(screen.queryByText("Agent")).not.toBeInTheDocument()
  })
})
