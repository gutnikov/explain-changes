import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function Explanation({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  )
}
