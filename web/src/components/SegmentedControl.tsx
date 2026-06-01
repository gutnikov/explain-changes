import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border", className)} role="group">
      {options.map((opt, i) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-6 px-2.5 text-xs transition-colors",
              i > 0 && "border-l",
              selected ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
