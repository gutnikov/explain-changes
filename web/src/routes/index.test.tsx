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
  it("loads payload and renders explanation + file + actions", async () => {
    render(<ReviewScreen />)
    expect(await screen.findByText("feature/x")).toBeInTheDocument()
    expect(screen.getByText("because")).toBeInTheDocument()
    expect(screen.getByText("a.ts")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /commit & proceed/i })).toBeInTheDocument()
  })

  it("posts the decision with comments on commit", async () => {
    render(<ReviewScreen />)
    await screen.findByText("feature/x")
    fireEvent.change(screen.getByPlaceholderText(/leave a general comment/i), { target: { value: "ship it" } })
    fireEvent.click(screen.getByRole("button", { name: /commit & proceed/i }))
    await waitFor(() =>
      expect(api.postDecision).toHaveBeenCalledWith(
        expect.objectContaining({ action: "commit", generalComment: "ship it" }),
      ),
    )
  })
})
