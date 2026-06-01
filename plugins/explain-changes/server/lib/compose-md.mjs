/**
 * Compose the persisted explanation markdown:
 * frontmatter (from payload + commit/date) + the agent's explanation body +
 * an optional "Review comments" section folded in from the decision.
 */
export function composeMarkdown({ payload, decision, commit, date }) {
  const additions = payload.files.reduce((s, f) => s + f.additions, 0)
  const deletions = payload.files.reduce((s, f) => s + f.deletions, 0)
  const fileList = payload.files.map((f) => f.path).join(", ")

  const fm = [
    "---",
    `commit: ${commit}`,
    `branch: ${payload.branch}`,
    `date: ${date}`,
    `files: [${fileList}]`,
    `additions: ${additions}`,
    `deletions: ${deletions}`,
    "---",
  ].join("\n")

  let body = `\n\n${payload.explanation.trim()}\n`

  const general = decision?.generalComment?.trim()
  const fileComments = Object.entries(decision?.fileComments ?? {}).filter(([, v]) => v && v.trim())
  if (general || fileComments.length) {
    body += "\n## Review comments\n"
    if (general) body += `\n> general: ${general}\n`
    for (const [file, comment] of fileComments) {
      body += `\n- **${file}** — ${comment.trim()}\n`
    }
  }

  return fm + body
}
