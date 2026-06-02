import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CheckpointSelect } from "./CheckpointSelect"
import type { CheckpointSummary } from "@/lib/api"

const checkpoints: CheckpointSummary[] = [
  { commit: "abc1234", date: "2026-02-01T00:00:00Z", fileCount: 2, additions: 5, deletions: 1, hasDiff: true },
]

describe("CheckpointSelect", () => {
  it("shows 'Current changes' as the trigger when selected is null", () => {
    render(<CheckpointSelect checkpoints={checkpoints} selected={null} onSelect={vi.fn()} />)
    expect(screen.getByRole("button", { name: /current changes/i })).toBeInTheDocument()
  })

  it("lists Current changes and each checkpoint when opened", () => {
    render(<CheckpointSelect checkpoints={checkpoints} selected={null} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /current changes/i }))
    expect(screen.getByRole("menuitem", { name: /current changes/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /abc1234/i })).toBeInTheDocument()
  })

  it("calls onSelect with the commit when a checkpoint is chosen", () => {
    const onSelect = vi.fn()
    render(<CheckpointSelect checkpoints={checkpoints} selected={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole("button", { name: /current changes/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /abc1234/i }))
    expect(onSelect).toHaveBeenCalledWith("abc1234")
  })

  it("calls onSelect with null when Current changes is chosen", () => {
    const onSelect = vi.fn()
    render(<CheckpointSelect checkpoints={checkpoints} selected="abc1234" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole("button", { name: /abc1234/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /current changes/i }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
