import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { History, FileText } from "lucide-react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { fetchHistory, type HistoryEntry } from "@/lib/api"
import { cn } from "@/lib/utils"

export function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory().then((e) => {
      setEntries(e)
      if (e.length) setSelected(e[0].commit)
    })
  }, [])

  const current = entries.find((e) => e.commit === selected)

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2 text-[11px] font-semibold text-[var(--fg-muted)]">
          <History className="size-3.5" />
          History
          {entries.length > 0 && <span className="font-normal">· {entries.length}</span>}
        </div>
        <ul>
          {entries.map((e) => (
            <li key={`${e.branch}/${e.commit}`}>
              <button
                onClick={() => setSelected(e.commit)}
                className={cn(
                  "w-full border-b border-[var(--border)] px-3 py-1.5 text-left text-[12px] hover:bg-[var(--subtle)]",
                  e.commit === selected && "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]",
                )}
              >
                <div className="font-mono">{e.commit}</div>
                <div className="text-[var(--fg-muted)] text-[11px]">
                  {e.branch} · {new Date(e.date).toLocaleString()} ·{" "}
                  <span className="text-[oklch(0.65_0.18_150)]">+{e.additions}</span>{" "}
                  <span className="text-[oklch(0.60_0.22_30)]">−{e.deletions}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-6">
        {current ? (
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-[12px] font-medium text-[var(--fg-muted)]">
              <FileText className="size-3.5" />
              Explanation
            </div>
            <div className="prose prose-sm max-w-none px-4 py-3 dark:prose-invert prose-headings:font-semibold prose-h1:text-base prose-h2:text-base prose-h3:text-sm prose-p:text-sm text-[13px]">
              <Markdown remarkPlugins={[remarkGfm]}>{current.markdown}</Markdown>
            </div>
          </div>
        ) : (
          <p className="text-[var(--fg-muted)]">No history yet.</p>
        )}
      </main>
    </div>
  )
}

export const Route = createFileRoute("/history")({ component: HistoryScreen })
