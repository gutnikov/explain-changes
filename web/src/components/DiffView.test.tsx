import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DiffView } from "./DiffView"
import type { FileChange } from "@/lib/api"

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

describe("DiffView", () => {
  it("renders unified rows by default", () => {
    render(<DiffView file={file} mode="unified" />)
    expect(screen.getByText("-old")).toBeInTheDocument()
    expect(screen.getByText("+new")).toBeInTheDocument()
  })

  it("renders two columns in split mode", () => {
    const { container } = render(<DiffView file={file} mode="split" />)
    expect(container.querySelectorAll('[data-side="left"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-side="right"]').length).toBeGreaterThan(0)
  })
})
