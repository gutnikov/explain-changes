import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MessageSquare } from "lucide-react"

export function Explanation({ markdown }: { markdown: string }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center gap-1.5 border-b bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
        <MessageSquare className="size-3.5" />
        Explanation
      </div>
      <div className="prose prose-sm max-w-none px-4 py-3 dark:prose-invert prose-headings:font-semibold prose-h1:text-base prose-h2:text-base prose-h3:text-sm prose-p:text-sm">
        <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      </div>
    </div>
  )
}
