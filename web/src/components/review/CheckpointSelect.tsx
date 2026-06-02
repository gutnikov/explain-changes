import { useEffect, useRef, useState } from "react"
import { ChevronDown, GitCommitHorizontal, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CheckpointSummary } from "@/lib/api"

interface CheckpointSelectProps {
  checkpoints: CheckpointSummary[]
  selected: string | null // null = current/live changes
  onSelect: (commit: string | null) => void
}

function shortHash(commit: string) {
  return commit.slice(0, 7)
}

function label(checkpoints: CheckpointSummary[], selected: string | null) {
  if (selected === null) return "Current changes"
  const cp = checkpoints.find((c) => c.commit === selected)
  return cp ? shortHash(cp.commit) : shortHash(selected)
}

export function CheckpointSelect({ checkpoints, selected, onSelect }: CheckpointSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const choose = (commit: string | null) => {
    onSelect(commit)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors",
          "bg-[var(--subtle)] text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--overlay)]",
        )}
      >
        <GitCommitHorizontal size={13} />
        {label(checkpoints, selected)}
        <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full mt-1.5 left-0 z-20 min-w-[260px]",
            "bg-[var(--overlay)] text-[var(--fg)] border border-[var(--border)] rounded-md shadow-lg py-1 overflow-hidden",
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(null)}
            className={cn(
              "w-full text-left px-3 py-2 text-[12px] flex items-start gap-2.5 hover:bg-[var(--accent-soft)] transition-colors",
              selected === null && "bg-[var(--accent-soft)]",
            )}
          >
            <span className="w-3.5 shrink-0 mt-0.5 text-[var(--accent-fg)]">
              {selected === null ? <Check size={13} strokeWidth={2.5} /> : null}
            </span>
            <span className="font-semibold">Current changes</span>
          </button>
          {checkpoints.map((c) => (
            <button
              key={c.commit}
              type="button"
              role="menuitem"
              onClick={() => choose(c.commit)}
              className={cn(
                "w-full text-left px-3 py-2 text-[12px] flex items-start gap-2.5 hover:bg-[var(--accent-soft)] transition-colors",
                selected === c.commit && "bg-[var(--accent-soft)]",
              )}
            >
              <span className="w-3.5 shrink-0 mt-0.5 text-[var(--accent-fg)]">
                {selected === c.commit ? <Check size={13} strokeWidth={2.5} /> : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-mono font-semibold">{shortHash(c.commit)}</span>
                <span className="block text-[11px] text-[var(--fg-muted)] mt-0.5">
                  {c.date ? new Date(c.date).toLocaleString() : "—"} ·{" "}
                  <span className="text-[oklch(0.65_0.18_150)]">+{c.additions}</span>{" "}
                  <span className="text-[oklch(0.60_0.22_30)]">−{c.deletions}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
