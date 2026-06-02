import { MessageSquarePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { rowStyles } from "./diff-viewer-styles"
import type { HunkRow } from "./types"

type Props = {
  row: HunkRow
  onAddComment?: () => void
  showGutterButton?: boolean
}

export function DiffRowView({ row, onAddComment, showGutterButton = true }: Props) {
  const styleBucket =
    row.type === "add" ? rowStyles.added : row.type === "del" ? rowStyles.removed : rowStyles.context
  const sign = row.type === "add" ? "+" : row.type === "del" ? "−" : ""

  return (
    <div className={cn(rowStyles.base, styleBucket)}>
      <span className={cn(rowStyles.gutterNumber, "left-0")}>{row.oldLine ?? ""}</span>
      <span className={cn(rowStyles.gutterNumber, "left-[3rem]")}>{row.newLine ?? ""}</span>
      <span className={cn(rowStyles.gutterSign, "left-[6rem]")}>
        {showGutterButton && onAddComment ? (
          <button
            type="button"
            onClick={onAddComment}
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "opacity-0 group-hover/row:opacity-100 transition-opacity",
              "text-primary hover:bg-primary/10 rounded",
            )}
            aria-label="Add comment"
          >
            <MessageSquarePlus size={12} />
          </button>
        ) : null}
        <span className="opacity-100 group-hover/row:opacity-0 transition-opacity pointer-events-none">
          {sign}
        </span>
      </span>
      <span className={rowStyles.content}>{row.text.replace(/^[+\- ]/, "")}</span>
    </div>
  )
}
