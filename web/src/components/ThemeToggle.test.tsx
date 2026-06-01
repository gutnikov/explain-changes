import { describe, it, expect } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ThemeProvider } from "next-themes"
import { ThemeToggle } from "./ThemeToggle"

describe("ThemeToggle", () => {
  it("toggles the dark class on the document root", async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    )
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    fireEvent.click(screen.getByLabelText("toggle theme"))
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true))
  })
})
