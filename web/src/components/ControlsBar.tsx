import type { DiffMode } from "./DiffView"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"

export function ControlsBar({
  defaultMode,
  onSetDefaultMode,
  onExpandAll,
  onCollapseAll,
}: {
  defaultMode: DiffMode
  onSetDefaultMode: (m: DiffMode) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onExpandAll}>
          Expand all
        </Button>
        <Button size="sm" variant="outline" onClick={onCollapseAll}>
          Collapse all
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span>default:</span>
        <Button size="sm" variant={defaultMode === "unified" ? "default" : "outline"} onClick={() => onSetDefaultMode("unified")}>
          Unified
        </Button>
        <Button size="sm" variant={defaultMode === "split" ? "default" : "outline"} onClick={() => onSetDefaultMode("split")}>
          Split
        </Button>
        <ThemeToggle />
      </div>
    </div>
  )
}
