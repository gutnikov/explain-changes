import { useState } from "react"
import type { FileChange } from "@/lib/api"
import { cn } from "@/lib/utils"

export function FileList({ files, onSelect }: { files: FileChange[]; onSelect: (path: string) => void }) {
  const [active, setActive] = useState<string | null>(null)
  return (
    <aside className="w-56 shrink-0 border-r">
      <div className="border-b p-3 text-xs font-semibold uppercase text-muted-foreground">Files changed</div>
      <ul>
        {files.map((f) => (
          <li key={f.path}>
            <button
              className={cn(
                "flex w-full justify-between gap-2 px-3 py-1.5 text-left font-mono text-xs hover:bg-muted",
                active === f.path && "bg-muted",
              )}
              onClick={() => {
                setActive(f.path)
                onSelect(f.path)
              }}
            >
              <span className="truncate">{f.path}</span>
              <span className="shrink-0">
                <span className="text-emerald-600">+{f.additions}</span> <span className="text-rose-600">−{f.deletions}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
