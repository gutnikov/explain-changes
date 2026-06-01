import type { FileChange } from "@/lib/api"
import { toSplitRows, toUnifiedRows } from "@/lib/diff"
import { cn } from "@/lib/utils"

export type DiffMode = "unified" | "split"

const bg: Record<string, string> = {
  add: "bg-emerald-500/10",
  del: "bg-rose-500/10",
  context: "",
}

function Gutter({ n }: { n: number | null }) {
  return <span className="inline-block w-10 select-none pr-2 text-right text-xs text-muted-foreground">{n ?? ""}</span>
}

export function DiffView({ file, mode }: { file: FileChange; mode: DiffMode }) {
  return (
    <div className="overflow-x-auto font-mono text-xs leading-6">
      {file.hunks.map((hunk, hi) => (
        <div key={hi}>
          <div className="bg-muted px-2 py-1 text-muted-foreground">{hunk.header}</div>
          {mode === "unified"
            ? toUnifiedRows(hunk).map((r, i) => (
                <div key={i} className={cn("flex whitespace-pre px-2", bg[r.type])}>
                  <Gutter n={r.oldNo} />
                  <Gutter n={r.newNo} />
                  <code className="flex-1">{r.content}</code>
                </div>
              ))
            : toSplitRows(hunk).map((r, i) => (
                <div key={i} className="flex whitespace-pre">
                  <div data-side="left" className={cn("flex w-1/2 px-2", r.left ? bg[r.left.type] : "")}>
                    <Gutter n={r.left?.no ?? null} />
                    <code className="flex-1">{r.left?.content ?? ""}</code>
                  </div>
                  <div data-side="right" className={cn("flex w-1/2 border-l px-2", r.right ? bg[r.right.type] : "")}>
                    <Gutter n={r.right?.no ?? null} />
                    <code className="flex-1">{r.right?.content ?? ""}</code>
                  </div>
                </div>
              ))}
        </div>
      ))}
    </div>
  )
}
