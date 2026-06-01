import type { DecisionAction } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function ActionBar({
  branch,
  fileCount,
  additions,
  deletions,
  busy,
  hasComments,
  onAction,
}: {
  branch: string
  fileCount: number
  additions: number
  deletions: number
  busy: boolean
  hasComments: boolean
  onAction: (a: DecisionAction) => void
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
      <div className="text-sm">
        <span className="font-mono font-semibold">{branch}</span>
        <span className="ml-2 text-muted-foreground">
          {fileCount} files <span className="text-emerald-600">+{additions}</span>{" "}
          <span className="text-rose-600">−{deletions}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={busy} onClick={() => onAction("request_changes")}>
          Request changes
        </Button>
        <Button variant="secondary" disabled={busy || hasComments} onClick={() => onAction("proceed")}>
          Proceed
        </Button>
        <Button disabled={busy || hasComments} onClick={() => onAction("commit")}>
          Commit &amp; proceed
        </Button>
      </div>
    </div>
  )
}
