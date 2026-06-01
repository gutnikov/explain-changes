import { useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

export function CommentBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [tab, setTab] = useState<"write" | "preview">("write")
  const tabCls = (active: boolean) =>
    cn(
      "border-b-2 px-3 py-1.5 text-xs",
      active ? "border-[#fd8c73] text-foreground" : "border-transparent text-muted-foreground",
    )
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex border-b bg-card">
        <button type="button" className={tabCls(tab === "write")} onClick={() => setTab("write")}>
          Write
        </button>
        <button type="button" className={tabCls(tab === "preview")} onClick={() => setTab("preview")}>
          Preview
        </button>
      </div>
      {tab === "write" ? (
        <textarea
          className="block w-full bg-background p-2.5 text-sm outline-none"
          rows={3}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="prose prose-sm max-w-none p-2.5 dark:prose-invert">
          {value.trim() ? <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown> : <p className="text-muted-foreground">Nothing to preview</p>}
        </div>
      )}
    </div>
  )
}
