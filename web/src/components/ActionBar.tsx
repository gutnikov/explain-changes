import type { DecisionAction } from "@/lib/api"
import { GitBranch, Check } from "lucide-react"
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
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-card/95 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-0.5 font-mono text-xs">
          <GitBranch className="size-3.5 text-muted-foreground" />
          {branch}
        </span>
        <span className="text-xs text-muted-foreground">
          {fileCount} files <span className="text-emerald-500">+{additions}</span>{" "}
          <span className="text-rose-500">−{deletions}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("request_changes")}>
          Request changes
        </Button>
        <Button size="sm" variant="outline" disabled={busy || hasComments} onClick={() => onAction("proceed")}>
          Proceed
        </Button>
        <Button
          size="sm"
          disabled={busy || hasComments}
          onClick={() => onAction("commit")}
          className="border border-emerald-700/40 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Check className="size-4" />
          Commit &amp; proceed
        </Button>
      </div>
    </div>
  )
}
