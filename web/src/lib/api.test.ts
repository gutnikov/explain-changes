import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchPayload, postDecision, fetchHistory } from "./api"

afterEach(() => vi.restoreAllMocks())

describe("api", () => {
  it("fetchPayload returns parsed payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ branch: "x", base: "HEAD", explanation: "y", files: [] }))))
    const p = await fetchPayload()
    expect(p.branch).toBe("x")
    expect(p.files).toEqual([])
  })

  it("postDecision POSTs JSON to /decision", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal("fetch", spy)
    await postDecision({
      action: "commit",
      generalComment: "hi",
      lineComments: [{ file: "a.ts", side: "new", line: 1, code: "+x", body: "c" }],
    })
    const call = spy.mock.calls[0] as unknown as [string, { method: string; body: string }]
    expect(call).toBeDefined()
    const [url, init] = call
    expect(url).toBe("/decision")
    expect(init.method).toBe("POST")
    const sent = JSON.parse(init.body as string)
    expect(sent.action).toBe("commit")
    expect(sent.lineComments).toHaveLength(1)
    expect(sent.lineComments[0].line).toBe(1)
  })

  it("fetchHistory returns the entry array", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify([{ branch: "b", commit: "c", date: "d", files: [], additions: 0, deletions: 0, markdown: "m" }])))
    vi.stubGlobal("fetch", spy)
    const h = await fetchHistory()
    expect(spy).toHaveBeenCalledWith("/api/history")
    expect(h[0].commit).toBe("c")
  })
})
