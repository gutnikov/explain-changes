import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { parseFrontmatter } from "./frontmatter.mjs"

/**
 * Read every committed explanation under `<projectRoot>/.explain-changes/<branch>/*.md`.
 * Dot-directories (e.g. `.session`) are skipped. Sorted newest-first by `date`.
 * Returns [{ branch, commit, date, files, additions, deletions, markdown }].
 */
export async function readHistory(projectRoot) {
  const root = path.join(projectRoot, ".explain-changes")
  let branches
  try {
    branches = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }

  const entries = []
  for (const b of branches) {
    if (!b.isDirectory() || b.name.startsWith(".")) continue
    const branchDir = path.join(root, b.name)
    let files
    try {
      files = await readdir(branchDir)
    } catch {
      continue
    }
    for (const f of files) {
      if (!f.endsWith(".md")) continue
      const full = path.join(branchDir, f)
      let md
      try {
        md = await readFile(full, "utf8")
      } catch {
        continue
      }
      const { data, body } = parseFrontmatter(md)
      entries.push({
        branch: b.name,
        commit: String(data.commit ?? path.basename(f, ".md")),
        date: data.date ?? (await stat(full)).mtime.toISOString(),
        files: data.files ?? [],
        additions: data.additions ?? 0,
        deletions: data.deletions ?? 0,
        markdown: body,
      })
    }
  }
  entries.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  return entries
}
