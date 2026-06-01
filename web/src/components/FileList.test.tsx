import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FileList } from "./FileList"
import type { FileChange } from "@/lib/api"

const files: FileChange[] = [
  { path: "src/a.ts", status: "modified", additions: 5, deletions: 1, hunks: [] },
  { path: "src/b.ts", status: "added", additions: 3, deletions: 0, hunks: [] },
]

describe("FileList", () => {
  it("lists files with counts and calls onSelect on click", () => {
    const onSelect = vi.fn()
    render(<FileList files={files} onSelect={onSelect} />)
    expect(screen.getByTitle("src/a.ts")).toBeInTheDocument()
    expect(screen.getByTitle("src/b.ts")).toBeInTheDocument()
    expect(screen.getByText("+5")).toBeInTheDocument()
    fireEvent.click(screen.getByTitle("src/b.ts"))
    expect(onSelect).toHaveBeenCalledWith("src/b.ts")
  })
})
