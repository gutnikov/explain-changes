import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { fetchHistory, type HistoryEntry } from "@/lib/api"
import { Explanation } from "@/components/Explanation"
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
        <div className="border-b p-3 text-sm font-semibold">History</div>
        <ul>
          {entries.map((e) => (
            <li key={`${e.branch}/${e.commit}`}>
              <button
                onClick={() => setSelected(e.commit)}
                className={cn(
                  "w-full border-b px-3 py-2 text-left hover:bg-muted",
                  e.commit === selected && "bg-muted",
                )}
              >
                <div className="font-mono text-sm">{e.commit}</div>
                <div className="text-xs text-muted-foreground">
                  {e.branch} · {new Date(e.date).toLocaleString()} ·{" "}
                  <span className="text-emerald-600">+{e.additions}</span>{" "}
                  <span className="text-rose-600">−{e.deletions}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-6">
        {current ? <Explanation markdown={current.markdown} /> : <p className="text-muted-foreground">No history yet.</p>}
      </main>
    </div>
  )
}

export const Route = createFileRoute("/history")({ component: HistoryScreen })
