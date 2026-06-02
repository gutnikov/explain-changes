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

  it("disables Proceed/Commit once a general comment is entered, and Request changes posts", async () => {
    render(<ReviewScreen />)
    await screen.findByText("feature/x")
    fireEvent.change(screen.getByPlaceholderText(/leave a general comment/i), { target: { value: "ship it" } })
    expect(screen.getByRole("button", { name: /proceed without commit/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /commit & proceed/i })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: /request changes/i }))
    await waitFor(() =>
      expect(api.postDecision).toHaveBeenCalledWith(
        expect.objectContaining({ action: "request_changes", generalComment: "ship it" }),
      ),
    )
  })
})
