import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FileCard } from "./FileCard"
import type { FileChange } from "@/lib/api"

const file: FileChange = {
  path: "src/a.ts",
  status: "modified",
  additions: 2,
  deletions: 0,
  hunks: [{ header: "@@ -1 +1,2 @@", lines: [{ type: "add", content: "+x" }] }],
}

describe("FileCard", () => {
  it("shows the path, status pill, and counts", () => {
    render(<FileCard file={file} comment="" onComment={() => {}} mode="unified" />)
    expect(screen.getByText("src/a.ts")).toBeInTheDocument()
    expect(screen.getByText("modified")).toBeInTheDocument()
    expect(screen.getByText("+2")).toBeInTheDocument()
  })

  it("emits comment changes", () => {
    const onComment = vi.fn()
    render(<FileCard file={file} comment="" onComment={onComment} mode="unified" />)
    fireEvent.change(screen.getByPlaceholderText(/comment on this file/i), { target: { value: "looks good" } })
    expect(onComment).toHaveBeenCalledWith("looks good")
  })
})
