import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ThemeProvider } from "next-themes"
import { ControlsBar } from "./ControlsBar"

const base = {
  defaultMode: "unified" as const,
  onSetDefaultMode: () => {},
  onExpandAll: () => {},
  onCollapseAll: () => {},
}

function renderBar(props = {}) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light">
      <ControlsBar {...base} {...props} />
    </ThemeProvider>,
  )
}

describe("ControlsBar", () => {
  it("fires expand/collapse all", () => {
    const onExpandAll = vi.fn()
    const onCollapseAll = vi.fn()
    renderBar({ onExpandAll, onCollapseAll })
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))
    expect(onExpandAll).toHaveBeenCalled()
    expect(onCollapseAll).toHaveBeenCalled()
  })

  it("fires the default-mode toggle", () => {
    const onSetDefaultMode = vi.fn()
    renderBar({ onSetDefaultMode })
    fireEvent.click(screen.getByRole("button", { name: "Split" }))
    expect(onSetDefaultMode).toHaveBeenCalledWith("split")
  })
})
