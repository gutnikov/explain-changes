import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <Button size="sm" variant="outline" aria-label="toggle theme" onClick={() => setTheme(isDark ? "light" : "dark")}>
      {isDark ? "☀" : "🌙"}
    </Button>
  )
}
