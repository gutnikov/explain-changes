import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ActionBar } from "./ActionBar"

const base = {
  branch: "feature/x",
  fileCount: 1,
  additions: 1,
  deletions: 0,
  busy: false,
  hasComments: false,
  onAction: vi.fn(),
}

describe("ActionBar", () => {
  it("enables all actions when there are no comments", () => {
    render(<ActionBar {...base} />)
    expect(screen.getByRole("button", { name: /request changes/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /^proceed$/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /commit & proceed/i })).not.toBeDisabled()
  })

  it("disables Proceed and Commit when comments exist", () => {
    render(<ActionBar {...base} hasComments={true} />)
    expect(screen.getByRole("button", { name: /request changes/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /^proceed$/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /commit & proceed/i })).toBeDisabled()
  })
})
