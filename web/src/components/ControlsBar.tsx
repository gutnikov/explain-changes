import type { DiffMode } from "./DiffView"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "./SegmentedControl"
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
    <div className="flex items-center justify-between border-b px-4 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Button size="xs" variant="ghost" onClick={onExpandAll}>
          Expand all
        </Button>
        <Button size="xs" variant="ghost" onClick={onCollapseAll}>
          Collapse all
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span>Default view</span>
        <SegmentedControl
          options={[
            { value: "unified", label: "Unified" },
            { value: "split", label: "Split" },
          ]}
          value={defaultMode}
          onChange={onSetDefaultMode}
        />
        <ThemeToggle />
      </div>
    </div>
  )
}
