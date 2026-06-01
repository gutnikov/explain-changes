/**
 * Parse `git diff` unified output into FileChange[]:
 *   { path, status, additions, deletions, hunks: [{ header, lines: [{type, content}] }] }
 * Lines inside a hunk: ' ' -> context, '+' -> add, '-' -> del.
 * Header lines (---, +++, @@), mode/index lines, and "\ No newline…" are not data rows.
 */
export function parseGitDiff(text) {
  const lines = text.split("\n")
  const files = []
  let file = null
  let hunk = null

  const startFile = () => {
    file = { path: "", status: "modified", additions: 0, deletions: 0, hunks: [] }
    hunk = null
    files.push(file)
  }

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      startFile()
      const m = /^diff --git a\/(.+) b\/(.+)$/.exec(line)
      if (m) file.path = m[2]
      continue
    }
    if (!file) continue

    if (line.startsWith("new file mode")) {
      file.status = "added"
      continue
    }
    if (line.startsWith("deleted file mode")) {
      file.status = "deleted"
      continue
    }
    if (line.startsWith("rename from") || line.startsWith("rename to")) {
      file.status = "renamed"
      if (line.startsWith("rename to")) file.path = line.slice("rename to ".length).trim()
      continue
    }
    if (line.startsWith("+++ b/")) {
      file.path = line.slice("+++ b/".length)
      continue
    }
    if (line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("index ")) {
      continue
    }
    if (line.startsWith("@@")) {
      const headerEnd = line.indexOf("@@", 2)
      const header = headerEnd !== -1 ? line.slice(0, headerEnd + 2) : line
      hunk = { header, lines: [] }
      file.hunks.push(hunk)
      continue
    }
    if (line.startsWith("\\")) continue // "\ No newline at end of file"
    if (!hunk) continue

    if (line.startsWith("+")) {
      hunk.lines.push({ type: "add", content: line })
      file.additions++
    } else if (line.startsWith("-")) {
      hunk.lines.push({ type: "del", content: line })
      file.deletions++
    } else {
      hunk.lines.push({ type: "context", content: line })
    }
  }
  return files
}
