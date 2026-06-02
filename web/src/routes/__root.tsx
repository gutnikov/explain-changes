import { Outlet, createRootRoute } from "@tanstack/react-router"
import { ThemeProvider } from "next-themes"

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-[var(--canvas)] text-[var(--fg)]">
        <Outlet />
      </div>
    </ThemeProvider>
  ),
})
