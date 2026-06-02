import { useState } from "react"
import { X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import type { ReviewComment } from "./types"

interface CommentThreadProps {
  comments: ReviewComment[]
  onDelete?: (threadId: string) => void
  onReply?: (threadId: string, body: string) => void
  draft?: string
  onDraftChange?: (v: string) => void
  onDraftSave?: () => void
  onDraftCancel?: () => void
}

function AgentMessage({ body }: { body: string }) {
  return (
    <div className="mt-1 ml-3 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[12px]">
      <div className="mb-0.5 text-[11px] font-semibold text-primary">Agent</div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </div>
  )
}

function UserMessage({ body, onDelete }: { body: string; onDelete?: () => void }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[12px]">
      <div className="flex items-start justify-between gap-2">
        <span className="whitespace-pre-wrap font-sans">{body}</span>
        {onDelete && (
          <button
            type="button"
            aria-label="Remove comment"
            className="shrink-0 text-[var(--fg-muted)] hover:text-[var(--danger)]"
            onClick={onDelete}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ReplyBox({ threadId, onReply }: { threadId: string; onReply: (threadId: string, body: string) => void }) {
  const [value, setValue] = useState("")
  const send = () => {
    if (value.trim()) {
      onReply(threadId, value.trim())
      setValue("")
    }
  }
  return (
    <div className="mt-1.5">
      <textarea
        className={cn(
          "w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2 font-sans text-[12px]",
          "outline-none focus:border-primary/50 transition-colors",
        )}
        rows={1}
        placeholder="Reply…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send()
        }}
      />
      <div className="mt-1">
        <button
          type="button"
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold",
            "bg-[var(--success)] text-white hover:bg-[var(--success)]/90 transition-colors",
          )}
          onClick={send}
        >
          Reply
        </button>
      </div>
    </div>
  )
}

function Thread({
  comment,
  onDelete,
  onReply,
}: {
  comment: ReviewComment
  onDelete?: () => void
  onReply?: (threadId: string, body: string) => void
}) {
  // Messages already arrive in conversational order (paired by turn). Don't
  // re-sort by ts — the agent often answers turn N after the user has typed
  // turn N+1, so its reply ts can be later than the next question, which would
  // clump every answer after every question instead of threading them.
  const ordered = comment.messages
  const userTurns = ordered.filter((m) => m.author === "user").length
  const agentTurns = ordered.filter((m) => m.author === "agent").length
  const awaitingAgent = userTurns > agentTurns
  let userSeen = false
  return (
    <div className="mb-1.5 last:mb-0">
      {ordered.map((m, i) => {
        if (m.author === "agent") return <AgentMessage key={i} body={m.body} />
        // Only the first user message gets the delete affordance (removes the thread).
        const showDelete = !userSeen
        userSeen = true
        return <UserMessage key={i} body={m.body} onDelete={showDelete ? onDelete : undefined} />
      })}
      {awaitingAgent && (
        <div className="mt-1 ml-3 flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
          <span className="font-medium text-primary">Agent typing</span>
          <span className="inline-flex gap-0.5">
            <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="size-1 rounded-full bg-current animate-bounce" />
          </span>
        </div>
      )}
      {onReply && <ReplyBox threadId={comment.threadId} onReply={onReply} />}
    </div>
  )
}

export function CommentThread({
  comments,
  onDelete,
  onReply,
  draft,
  onDraftChange,
  onDraftSave,
  onDraftCancel,
}: CommentThreadProps) {
  return (
    <div className="border-y border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2">
      {comments.map((c) => (
        <Thread
          key={c.threadId}
          comment={c}
          onDelete={onDelete ? () => onDelete(c.threadId) : undefined}
          onReply={onReply}
        />
      ))}
      {draft !== undefined && (
        <div>
          <textarea
            autoFocus
            className={cn(
              "w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2 font-sans text-[12px]",
              "outline-none focus:border-primary/50 transition-colors",
            )}
            rows={2}
            placeholder="Leave a comment…"
            value={draft}
            onChange={(e) => onDraftChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onDraftCancel?.()
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim()) {
                onDraftSave?.()
              }
            }}
          />
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                "bg-[var(--success)] text-white hover:bg-[var(--success)]/90 transition-colors",
              )}
              onClick={onDraftSave}
            >
              Comment
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px]"
              onClick={onDraftCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
