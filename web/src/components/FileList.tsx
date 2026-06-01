import { useState } from "react"
import { FileText } from "lucide-react"
import type { FileChange } from "@/lib/api"
import { cn } from "@/lib/utils"

function splitPath(path: string) {
  const i = path.lastIndexOf("/")
  return i === -1 ? { dir: "", name: path } : { dir: path.slice(0, i + 1), name: path.slice(i + 1) }
}

export function FileList({ files, onSelect }: { files: FileChange[]; onSelect: (path: string) => void }) {
  const [active, setActive] = useState<string | null>(null)
  return (
    <aside className="w-56 shrink-0 border-r">
      <div className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
        Files changed <span className="font-normal">· {files.length}</span>
      </div>
      <ul>
        {files.map((f) => {
          const { dir, name } = splitPath(f.path)
          return (
            <li key={f.path}>
              <button
                title={f.path}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted",
                  active === f.path && "bg-primary/10 shadow-[inset_2px_0_0_var(--color-primary)]",
                )}
                onClick={() => {
                  setActive(f.path)
                  onSelect(f.path)
                }}
              >
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono">
                  <span className="text-muted-foreground">{dir}</span>
                  {name}
                </span>
                <span className="shrink-0 font-mono">
                  <span className="text-emerald-500">+{f.additions}</span>{" "}
                  <span className="text-rose-500">−{f.deletions}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
