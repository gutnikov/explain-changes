/**
 * Parse a leading `---` frontmatter block. Supports scalars, integers, and
 * inline arrays (`[a, b]`). Anything unrecognized is kept as a trimmed string.
 * Returns { data, body }.
 */
export function parseFrontmatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(markdown)
  if (!match) return { data: {}, body: markdown }

  const [, raw, rest] = match
  const data = {}
  for (const line of raw.split("\n")) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]
    let value = m[2].trim()
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (/^-?\d+$/.test(value)) {
      value = Number(value)
    }
    data[key] = value
  }
  return { data, body: rest.trimStart() }
}
