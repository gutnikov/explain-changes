import { Outlet, createRootRoute } from "@tanstack/react-router"
import { ThemeProvider } from "next-themes"

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    </ThemeProvider>
  ),
})
