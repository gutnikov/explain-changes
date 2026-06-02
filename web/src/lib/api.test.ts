import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchPayload, postDecision, fetchHistory, postComment, fetchReplies, fetchCheckpoints, fetchCheckpoint } from "./api"

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
      lineComments: [{ id: "c1", threadId: "c1", file: "a.ts", side: "new", line: 1, code: "+x", body: "c" }],
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

  it("postComment POSTs the comment JSON to /comments", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal("fetch", spy)
    await postComment({ id: "c1", threadId: "c1", file: "a.ts", side: "new", line: 1, code: "+x", body: "why?" })
    const [url, init] = spy.mock.calls[0] as unknown as [string, { method: string; body: string }]
    expect(url).toBe("/comments")
    expect(init.method).toBe("POST")
    const sent = JSON.parse(init.body)
    expect(sent.id).toBe("c1")
    expect(sent.threadId).toBe("c1")
    expect(sent.body).toBe("why?")
    expect(typeof sent.ts).toBe("number")
  })

  it("fetchReplies returns the threadId -> answers map", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ t1: [{ body: "ans", ts: 1 }] })))
    vi.stubGlobal("fetch", spy)
    const r = await fetchReplies()
    expect(spy).toHaveBeenCalledWith("/replies")
    expect(r.t1[0].body).toBe("ans")
  })

  it("fetchHistory returns the entry array", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify([{ branch: "b", commit: "c", date: "d", files: [], additions: 0, deletions: 0, markdown: "m" }])))
    vi.stubGlobal("fetch", spy)
    const h = await fetchHistory()
    expect(spy).toHaveBeenCalledWith("/api/history")
    expect(h[0].commit).toBe("c")
  })

  it("fetchCheckpoints GETs /api/checkpoints", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify([{ commit: "c1", date: "d", fileCount: 1, additions: 2, deletions: 0, hasDiff: true }])))
    vi.stubGlobal("fetch", spy)
    const list = await fetchCheckpoints()
    expect(spy).toHaveBeenCalledWith("/api/checkpoints")
    expect(list[0].commit).toBe("c1")
  })

  it("fetchCheckpoint GETs /api/checkpoints/:commit", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ commit: "c1", date: "d", explanation: "e", files: [], hasDiff: true })))
    vi.stubGlobal("fetch", spy)
    const got = await fetchCheckpoint("c1")
    expect(spy).toHaveBeenCalledWith("/api/checkpoints/c1")
    expect(got.commit).toBe("c1")
  })
})
