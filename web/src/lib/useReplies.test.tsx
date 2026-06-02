import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useReplies } from "./useReplies"

afterEach(() => vi.restoreAllMocks())

describe("useReplies", () => {
  it("fetches replies on mount and returns the map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ t1: [{ body: "ans", ts: 1 }] }))),
    )
    const { result } = renderHook(() => useReplies(true))
    await waitFor(() => expect(result.current.t1?.[0].body).toBe("ans"))
  })

  it("returns empty map when disabled and does not fetch", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({})))
    vi.stubGlobal("fetch", spy)
    const { result } = renderHook(() => useReplies(false))
    expect(result.current).toEqual({})
    expect(spy).not.toHaveBeenCalled()
  })
})
