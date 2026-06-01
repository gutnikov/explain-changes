import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { HistoryScreen } from "./history"
import * as api from "@/lib/api"

const entries: api.HistoryEntry[] = [
  { branch: "feature/x", commit: "9f2a1c7", date: "2026-06-01T10:00:00Z", files: ["a.ts"], additions: 5, deletions: 1, markdown: "## What changed\nFirst." },
  { branch: "feature/x", commit: "1111111", date: "2026-06-02T10:00:00Z", files: ["b.ts"], additions: 2, deletions: 0, markdown: "## What changed\nSecond." },
]

beforeEach(() => {
  vi.spyOn(api, "fetchHistory").mockResolvedValue(entries)
})

describe("HistoryScreen", () => {
  it("lists commits and renders the selected explanation", async () => {
    render(<HistoryScreen />)
    expect(await screen.findByText("9f2a1c7")).toBeInTheDocument()
    expect(screen.getByText("1111111")).toBeInTheDocument()
    expect(screen.getByText("First.")).toBeInTheDocument()
    fireEvent.click(screen.getByText("1111111"))
    expect(screen.getByText("Second.")).toBeInTheDocument()
  })
})
