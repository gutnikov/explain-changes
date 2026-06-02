import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DecisionAction } from "@/lib/api"

interface ActionMeta {
  label: string
  hint: string
  variant: "primary" | "default"
  disabled?: (hasComments: boolean) => boolean
}

const ACTIONS: Record<DecisionAction, ActionMeta> = {
  commit: {
    label: "Commit & proceed",
    hint: "Commit these changes and continue",
    variant: "primary",
    disabled: (hasComments) => hasComments,
  },
  request_changes: {
    label: "Request changes",
    hint: "Send feedback and ask for modifications",
    variant: "default",
  },
  proceed: {
    label: "Proceed without commit",
    hint: "Continue without committing",
    variant: "default",
    disabled: (hasComments) => hasComments,
  },
}

const ACTION_ORDER: DecisionAction[] = ["commit", "request_changes", "proceed"]

interface ActionButtonProps {
  hasComments: boolean
  onSubmit: (action: DecisionAction) => void
  disabled?: boolean
}

export function ActionButton({ hasComments, onSubmit, disabled }: ActionButtonProps) {
  const [selected, setSelected] = useState<DecisionAction>("commit")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const meta = ACTIONS[selected]
  const isActionDisabled = disabled || (meta.disabled?.(hasComments) ?? false)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  const btnBase = meta.variant === "primary"
    ? "bg-[var(--success)] text-white hover:bg-[var(--success)]/90"
    : "bg-[var(--subtle)] text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--overlay)]"

  return (
    <div ref={containerRef} className="relative">
      <div className="inline-flex shadow-sm">
        <button
          type="button"
          onClick={() => onSubmit(selected)}
          disabled={isActionDisabled}
          className={cn(
            "inline-flex items-center gap-2 px-4 h-9 text-[13px] font-semibold tracking-tight rounded-l-md transition-colors",
            btnBase,
            isActionDisabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {meta.variant === "primary" && <Check size={14} strokeWidth={2.5} />}
          {meta.label}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Pick another action"
          className={cn(
            "inline-flex items-center px-2 h-9 rounded-r-md transition-colors border-l border-l-white/15",
            btnBase,
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <ChevronDown
            size={14}
            strokeWidth={2.5}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full mt-1.5 right-0 z-20 min-w-[280px]",
            "bg-[var(--overlay)] text-[var(--fg)] border border-[var(--border)] rounded-md shadow-lg",
            "py-1 overflow-hidden",
          )}
        >
          {ACTION_ORDER.map((action) => {
            const isSelected = action === selected
            const itemMeta = ACTIONS[action]
            const itemDisabled = itemMeta.disabled?.(hasComments) ?? false
            return (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                key={action}
                disabled={itemDisabled}
                onClick={() => {
                  if (!itemDisabled) {
                    setSelected(action)
                    setOpen(false)
                  }
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-[13px] flex items-start gap-2.5 cursor-pointer",
                  "hover:bg-[var(--accent-soft)] hover:text-[var(--fg)] transition-colors",
                  isSelected && "bg-[var(--accent-soft)]",
                  itemDisabled && "opacity-50 cursor-not-allowed",
                )}
              >
                <span className="w-3.5 shrink-0 mt-0.5 text-[var(--accent-fg)]">
                  {isSelected ? <Check size={14} strokeWidth={2.5} /> : null}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{itemMeta.label}</span>
                  <span className="block text-[11.5px] text-[var(--fg-muted)] mt-0.5 leading-snug">
                    {itemMeta.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
