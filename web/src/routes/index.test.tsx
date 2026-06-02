import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ReviewScreen } from "./index"
import * as api from "@/lib/api"

const payload: api.Payload = {
  branch: "feature/x",
  base: "HEAD",
  explanation: "## Why\nbecause",
  files: [
    {
      path: "a.ts",
      status: "modified",
      additions: 1,
      deletions: 0,
      hunks: [{ header: "@@ -1 +1,2 @@", lines: [{ type: "add", content: "+x" }] }],
    },
  ],
}

beforeEach(() => {
  vi.spyOn(api, "fetchPayload").mockResolvedValue(payload)
  vi.spyOn(api, "postDecision").mockResolvedValue()
  vi.spyOn(api, "fetchCheckpoints").mockResolvedValue([])
})

describe("ReviewScreen", () => {
  it("loads payload and renders sidebar + explanation + file + actions", async () => {
    render(<ReviewScreen />)
    expect(await screen.findByText("feature/x")).toBeInTheDocument()
    expect(screen.getByText("because")).toBeInTheDocument()
    expect(screen.getByText("Code review")).toBeInTheDocument()
    expect(screen.getAllByText("a.ts").length).toBeGreaterThanOrEqual(1)
  })

  it("commits with empty comments when none are entered", async () => {
    render(<ReviewScreen />)
    await screen.findByText("feature/x")
    fireEvent.click(screen.getByRole("button", { name: /commit & proceed/i }))
    await waitFor(() =>
      expect(api.postDecision).toHaveBeenCalledWith({
        action: "commit",
        generalComment: "",
        lineComments: [],
      }),
    )
  })

  it("disables Commit/Proceed once a general comment is entered, and Request changes posts", async () => {
    render(<ReviewScreen />)
    await screen.findByText("feature/x")
    fireEvent.change(screen.getByPlaceholderText(/leave a general comment/i), { target: { value: "ship it" } })
    // Commit is the default selected action → the main split button is disabled with comments.
    expect(screen.getByRole("button", { name: /commit & proceed/i })).toBeDisabled()
    // Open the dropdown: Proceed is disabled in the menu, Request changes is allowed.
    fireEvent.click(screen.getByRole("button", { name: /pick another action/i }))
    expect(screen.getByRole("menuitemradio", { name: /proceed without commit/i })).toBeDisabled()
    fireEvent.click(screen.getByRole("menuitemradio", { name: /request changes/i }))
    // The main button now reflects the selected action; submit it.
    fireEvent.click(screen.getByRole("button", { name: /request changes/i }))
    await waitFor(() =>
      expect(api.postDecision).toHaveBeenCalledWith(
        expect.objectContaining({ action: "request_changes", generalComment: "ship it" }),
      ),
    )
  })

  it("loads checkpoints and switches to a read-only checkpoint", async () => {
    vi.spyOn(api, "fetchCheckpoints").mockResolvedValue([
      { commit: "abc1234", date: "2026-02-01T00:00:00Z", fileCount: 1, additions: 2, deletions: 0, hasDiff: true },
    ])
    vi.spyOn(api, "fetchCheckpoint").mockResolvedValue({
      commit: "abc1234", date: "2026-02-01T00:00:00Z", explanation: "## Past\nold work",
      files: [{ path: "old.ts", status: "modified", additions: 2, deletions: 0, hunks: [{ header: "@@ -1 +1 @@", lines: [{ type: "add", content: "+old" }] }] }],
      hasDiff: true,
    })
    render(<ReviewScreen />)
    await screen.findByText("feature/x")
    fireEvent.click(screen.getByRole("button", { name: /current changes/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /abc1234/i }))
    await screen.findByText(/read-only/i)
    expect(screen.getByText("old work")).toBeInTheDocument()
  })
})
