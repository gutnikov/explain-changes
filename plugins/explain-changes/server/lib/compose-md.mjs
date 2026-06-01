/**
 * Compose the persisted explanation markdown:
 * frontmatter (from payload + commit/date) + the agent's explanation body +
 * an optional "Review comments" section folded in from the decision
 * (general comment + per-line comments grouped by file).
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
  const lineComments = (decision?.lineComments ?? []).filter((c) => c.body && c.body.trim())

  if (general || lineComments.length) {
    body += "\n## Review comments\n"
    if (general) body += `\n> general: ${general}\n`

    const byFile = new Map()
    for (const c of lineComments) {
      if (!byFile.has(c.file)) byFile.set(c.file, [])
      byFile.get(c.file).push(c)
    }
    for (const [file, cs] of byFile) {
      body += `\n**${file}**\n`
      for (const c of cs) body += `- L${c.line}: ${c.body.trim()}\n`
    }
  }

  return fm + body
}
