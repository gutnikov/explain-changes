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
      <aside className="w-72 shrink-0 border-r">
        <div className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
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
                  "w-full border-b px-3 py-1.5 text-left text-xs hover:bg-muted",
                  e.commit === selected && "bg-primary/10 shadow-[inset_2px_0_0_var(--color-primary)]",
                )}
              >
                <div className="font-mono">{e.commit}</div>
                <div className="text-muted-foreground">
                  {e.branch} · {new Date(e.date).toLocaleString()} ·{" "}
                  <span className="text-emerald-500">+{e.additions}</span>{" "}
                  <span className="text-rose-500">−{e.deletions}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-6">
        {current ? (
          <div className="overflow-hidden rounded-md border">
            <div className="flex items-center gap-1.5 border-b bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" />
              Explanation
            </div>
            <div className="prose prose-sm max-w-none px-4 py-3 dark:prose-invert prose-headings:font-semibold prose-h1:text-base prose-h2:text-base prose-h3:text-sm prose-p:text-sm">
              <Markdown remarkPlugins={[remarkGfm]}>{current.markdown}</Markdown>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No history yet.</p>
        )}
      </main>
    </div>
  )
}

export const Route = createFileRoute("/history")({ component: HistoryScreen })
