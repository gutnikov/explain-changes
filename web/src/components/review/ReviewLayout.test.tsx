import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ReviewLayout } from "./ReviewLayout"
import type { Payload } from "@/lib/api"

const payload: Payload = {
  branch: "feat/x",
  base: "HEAD",
  explanation: "why",
  files: [
    { path: "a.ts", status: "modified", additions: 1, deletions: 0, hunks: [{ header: "@@ -1 +1 @@", lines: [{ type: "add", content: "+a" }] }] },
    { path: "b.ts", status: "modified", additions: 1, deletions: 0, hunks: [{ header: "@@ -1 +1 @@", lines: [{ type: "add", content: "+b" }] }] },
  ],
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}))))
})
afterEach(() => {
  vi.restoreAllMocks()
  window.location.hash = ""
})

describe("ReviewLayout deeplinks", () => {
  it("scrolls to the file named in the URL hash on load", () => {
    window.location.hash = "#file-b-ts"
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView")
    render(<ReviewLayout payload={payload} onSubmit={vi.fn()} />)
    expect(scrollSpy).toHaveBeenCalled()
  })

  it("updates the URL hash when a file is selected in the sidebar", () => {
    render(<ReviewLayout payload={payload} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "b.ts" }))
    expect(window.location.hash).toBe("#file-b-ts")
  })
})
