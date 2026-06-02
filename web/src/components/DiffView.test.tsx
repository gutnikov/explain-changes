import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { DiffView } from "./DiffView"
import type { FileChange, LineComment } from "@/lib/api"

const file: FileChange = {
  path: "a.ts",
  status: "modified",
  additions: 1,
  deletions: 1,
  hunks: [
    {
      header: "@@ -1,2 +1,2 @@",
      lines: [
        { type: "context", content: " keep" },
        { type: "del", content: "-old" },
        { type: "add", content: "+new" },
      ],
    },
  ],
}
const noop = () => {}
const base = { file, comments: [] as LineComment[], onAddComment: noop, onRemoveComment: noop }

describe("DiffView", () => {
  it("renders unified rows by default", () => {
    render(<DiffView {...base} mode="unified" />)
    expect(screen.getByText("old")).toBeInTheDocument()
    expect(screen.getByText("new")).toBeInTheDocument()
  })

  it("renders two columns in split mode", () => {
    const { container } = render(<DiffView {...base} mode="split" />)
    expect(container.querySelectorAll('[data-side="left"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-side="right"]').length).toBeGreaterThan(0)
  })

  it("opens an editor on a line and emits onAddComment with the anchor + code", () => {
    const onAddComment = vi.fn()
    render(<DiffView {...base} onAddComment={onAddComment} mode="unified" />)
    fireEvent.click(screen.getByLabelText("comment on new line 2"))
    fireEvent.change(screen.getByPlaceholderText("Leave a comment…"), { target: { value: "needs work" } })
    fireEvent.click(screen.getByRole("button", { name: "Comment" }))
    expect(onAddComment).toHaveBeenCalledWith({ side: "new", line: 2 }, "+new", "needs work")
  })

  it("renders an existing comment inline and removes it", () => {
    const onRemoveComment = vi.fn()
    const comment: LineComment = { id: "c1", threadId: "c1", file: "a.ts", side: "new", line: 2, code: "+new", body: "existing note" }
    render(<DiffView {...base} comments={[comment]} onRemoveComment={onRemoveComment} mode="unified" />)
    expect(screen.getByText("existing note")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("remove comment on new line 2"))
    expect(onRemoveComment).toHaveBeenCalledWith(comment)
  })

  it("anchors a context line to the new side (line 1) with its real code", () => {
    const onAddComment = vi.fn()
    render(<DiffView {...base} onAddComment={onAddComment} mode="unified" />)
    fireEvent.click(screen.getByLabelText("comment on new line 1"))
    fireEvent.change(screen.getByPlaceholderText("Leave a comment…"), { target: { value: "ctx note" } })
    fireEvent.click(screen.getByRole("button", { name: "Comment" }))
    expect(onAddComment).toHaveBeenCalledWith({ side: "new", line: 1 }, " keep", "ctx note")
  })

  it("adds a comment in split mode on the right (new) side", () => {
    const onAddComment = vi.fn()
    render(<DiffView {...base} onAddComment={onAddComment} mode="split" />)
    fireEvent.click(screen.getByLabelText("comment on new line 2"))
    fireEvent.change(screen.getByPlaceholderText("Leave a comment…"), { target: { value: "split note" } })
    fireEvent.click(screen.getByRole("button", { name: "Comment" }))
    expect(onAddComment).toHaveBeenCalledWith({ side: "new", line: 2 }, "+new", "split note")
  })
})
