import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SegmentedControl } from "./SegmentedControl"

const opts = [
  { value: "unified", label: "Unified" },
  { value: "split", label: "Split" },
]

describe("SegmentedControl", () => {
  it("renders options and marks the selected one with aria-pressed", () => {
    render(<SegmentedControl options={opts} value="unified" onChange={() => {}} />)
    const unified = screen.getByRole("button", { name: "Unified" })
    const split = screen.getByRole("button", { name: "Split" })
    expect(unified).toHaveAttribute("aria-pressed", "true")
    expect(split).toHaveAttribute("aria-pressed", "false")
  })

  it("fires onChange with the clicked value", () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={opts} value="unified" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Split" }))
    expect(onChange).toHaveBeenCalledWith("split")
  })
})
