export const rowStyles = {
  base: "grid grid-cols-[3rem_3rem_2rem_minmax(0,1fr)] text-[12px] leading-5 font-mono group/row",
  hunkHeader: "px-3 py-1.5 text-[11px] font-mono text-[var(--fg-muted)] bg-[var(--subtle)] border-y border-[var(--border)]",
  gutterNumber: "sticky px-2 text-right select-none text-[var(--fg-muted)] tabular-nums",
  gutterSign: "sticky px-1 text-center select-none text-[var(--fg-muted)] relative",
  content: "px-3 whitespace-pre min-w-0",
  context: "hover:bg-[var(--subtle)]/50",
  added: "bg-[oklch(0.65_0.18_150)]/10 hover:bg-[oklch(0.65_0.18_150)]/15",
  removed: "bg-[oklch(0.60_0.22_30)]/10 hover:bg-[oklch(0.60_0.22_30)]/15",
}

export const wordDiff = {
  added: "bg-[oklch(0.65_0.18_150)]/25 font-semibold",
  removed: "bg-[oklch(0.60_0.22_30)]/25 font-semibold",
}
