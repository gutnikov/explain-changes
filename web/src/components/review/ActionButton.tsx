import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DecisionAction } from "@/lib/api"

interface ActionMeta {
  label: string
  hint: string
  variant: "primary" | "default" | "danger"
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

interface ActionButtonProps {
  hasComments: boolean
  onSubmit: (action: DecisionAction) => void
  disabled?: boolean
}

export function ActionButton({ hasComments, onSubmit, disabled }: ActionButtonProps) {
  return (
    <div className="flex flex-col gap-2">
      {(Object.keys(ACTIONS) as DecisionAction[]).map((action) => {
        const meta = ACTIONS[action]
        const isDisabled = disabled || (meta.disabled?.(hasComments) ?? false)
        const isPrimary = meta.variant === "primary"

        return (
          <button
            key={action}
            type="button"
            onClick={() => onSubmit(action)}
            disabled={isDisabled}
            className={cn(
              "w-full px-4 py-2.5 rounded-md text-[13px] font-semibold transition-colors text-left",
              "flex items-center gap-2",
              isPrimary && !isDisabled && "bg-[var(--success)] text-white hover:bg-[var(--success)]/90",
              !isPrimary && !isDisabled && "bg-[var(--subtle)] hover:bg-[var(--overlay)] border border-[var(--border)]",
              isDisabled && "opacity-50 cursor-not-allowed",
            )}
            title={isDisabled ? "Cannot perform this action with comments" : meta.hint}
          >
            {!isDisabled && isPrimary && <Check size={14} strokeWidth={2.5} />}
            <div className="flex-1">
              <div className="font-semibold">{meta.label}</div>
              <div className="text-[11px] opacity-80 font-normal">{meta.hint}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
