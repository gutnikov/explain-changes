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
const noop = () => {}
const base = {
  file,
  mode: "unified" as const,
  onSetMode: noop,
  collapsed: false,
  onToggleCollapse: noop,
  comments: [],
  onAddComment: noop,
  onRemoveComment: noop,
}

describe("FileCard", () => {
  it("shows the path, status pill, and counts", () => {
    render(<FileCard {...base} />)
    expect(screen.getByText("a.ts")).toBeInTheDocument()
    expect(screen.getByText("src/")).toBeInTheDocument()
    expect(screen.getByText("modified")).toBeInTheDocument()
    expect(screen.getByText("+2")).toBeInTheDocument()
  })

  it("hides the diff when collapsed", () => {
    const { rerender } = render(<FileCard {...base} collapsed={false} />)
    expect(screen.getByText("x")).toBeInTheDocument()
    rerender(<FileCard {...base} collapsed={true} />)
    expect(screen.queryByText("x")).not.toBeInTheDocument()
  })

  it("fires onSetMode from the per-file toggle", () => {
    const onSetMode = vi.fn()
    render(<FileCard {...base} onSetMode={onSetMode} />)
    fireEvent.click(screen.getByRole("button", { name: "Split" }))
    expect(onSetMode).toHaveBeenCalledWith("split")
  })
})
