import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileStatus } from "./types"

const STATUS_DOT: Record<FileStatus, string> = {
  added: "bg-[oklch(0.65_0.18_150)]",
  modified: "bg-[oklch(0.55_0.20_260)]",
  deleted: "bg-[oklch(0.60_0.22_30)]",
  renamed: "bg-[var(--fg-muted)]",
}

export interface FileEntry {
  path: string
  status: FileStatus
  commentCount: number
}

export function FileTreeSidebar({
  files,
  selectedId,
  onSelect,
}: {
  files: FileEntry[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [filter, setFilter] = useState("")
  const q = filter.trim().toLowerCase()

  const matchesQ = (s: string) => !q || s.toLowerCase().includes(q)

  const filteredFiles = useMemo(
    () => files.filter((f) => matchesQ(f.path)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, q],
  )

  return (
    <aside className="w-full h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Filter input */}
      <div className="relative shrink-0">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter files…"
          className={cn(
            "w-full h-8 pl-8 pr-2 text-[13px]",
            "bg-[var(--canvas)] border border-[var(--border)] rounded-md",
            "placeholder:text-[var(--fg-muted)]",
            "outline-none focus:border-primary/50 focus-visible:ring-0 transition-colors",
          )}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3">
        {filteredFiles.length > 0 ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] px-2 pb-1.5 font-semibold flex items-center justify-between">
              <span>Files</span>
              <span className="text-[var(--fg-muted)] tabular-nums">{filteredFiles.length}</span>
            </div>
            <ul className="space-y-0.5">
              {filteredFiles.map((f) => {
                const segments = f.path.split("/")
                const filename = segments.at(-1) ?? f.path
                const dir = segments.slice(0, -1).join("/")
                const active = selectedId === f.path
                return (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => onSelect(f.path)}
                      className={cn(
                        "w-full text-left rounded-md px-2 py-1.5 flex items-center gap-2 cursor-pointer",
                        "transition-colors",
                        active ? "bg-primary/10 text-[var(--fg)]" : "hover:bg-[var(--subtle)] text-[var(--fg)]",
                      )}
                      title={f.path}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[f.status])} />
                      <span className="font-mono text-[12px] truncate min-w-0 flex-1">
                        {dir ? <span className="text-[var(--fg-muted)]">{dir}/</span> : null}
                        <span className="font-semibold">{filename}</span>
                      </span>
                      {f.commentCount > 0 ? (
                        <span className="ml-1 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold shrink-0 tabular-nums">
                          {f.commentCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="px-2 py-4 text-[12px] text-[var(--fg-muted)] italic">
            No files match &quot;{filter}&quot;
          </div>
        )}
      </div>
    </aside>
  )
}
