import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CommentBox } from "./CommentBox"

describe("CommentBox", () => {
  it("edits in Write mode via the textarea", () => {
    const onChange = vi.fn()
    render(<CommentBox value="" onChange={onChange} placeholder="Leave a general comment…" />)
    fireEvent.change(screen.getByPlaceholderText("Leave a general comment…"), { target: { value: "hi" } })
    expect(onChange).toHaveBeenCalledWith("hi")
  })

  it("shows the markdown preview when Preview is selected", () => {
    render(<CommentBox value={"## Heading"} onChange={() => {}} placeholder="x" />)
    expect(screen.getByPlaceholderText("x")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    expect(screen.queryByPlaceholderText("x")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument()
  })
})
