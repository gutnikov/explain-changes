import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { parseFrontmatter } from "./frontmatter.mjs"

function branchDirName(branch) {
  return branch.replace(/\//g, "-")
}

function sumFiles(files) {
  let additions = 0
  let deletions = 0
  for (const f of files ?? []) {
    additions += f.additions ?? 0
    deletions += f.deletions ?? 0
  }
  return { additions, deletions, fileCount: (files ?? []).length }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch {
    return null
  }
}

/**
 * Summaries of all checkpoints for one branch, newest-first by date.
 * A `<hash>.json` sidecar gives the full counts and hasDiff:true; a bare
 * `<hash>.md` (pre-feature) is summarized from frontmatter with hasDiff:false.
 */
export async function readCheckpoints(projectRoot, branch) {
  const dir = path.join(projectRoot, ".explain-changes", branchDirName(branch))
  let names
  try {
    names = await readdir(dir)
  } catch {
    return []
  }

  const byCommit = new Map()
  for (const name of names) {
    if (name.endsWith(".json")) {
      const commit = path.basename(name, ".json")
      const data = await readJson(path.join(dir, name))
      if (!data) continue
      const { additions, deletions, fileCount } = sumFiles(data.files)
      byCommit.set(commit, { commit, date: data.date ?? "", fileCount, additions, deletions, hasDiff: true })
    }
  }
  for (const name of names) {
    if (!name.endsWith(".md")) continue
    const commit = path.basename(name, ".md")
    if (byCommit.has(commit)) continue // sidecar wins
    const md = await readFile(path.join(dir, name), "utf8").catch(() => "")
    const { data } = parseFrontmatter(md)
    byCommit.set(commit, {
      commit,
      date: data.date ?? "",
      fileCount: Array.isArray(data.files) ? data.files.length : 0,
      additions: data.additions ?? 0,
      deletions: data.deletions ?? 0,
      hasDiff: false,
    })
  }

  return [...byCommit.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

/**
 * Full payload for one checkpoint: { commit, date, explanation, files, hasDiff }.
 * Sidecar preferred; falls back to explanation-only from the .md; null if neither.
 */
export async function readCheckpoint(projectRoot, branch, commit) {
  const dir = path.join(projectRoot, ".explain-changes", branchDirName(branch))
  const sidecar = await readJson(path.join(dir, `${commit}.json`))
  if (sidecar) {
    return {
      commit,
      date: sidecar.date ?? "",
      explanation: sidecar.explanation ?? "",
      files: sidecar.files ?? [],
      hasDiff: true,
    }
  }
  const md = await readFile(path.join(dir, `${commit}.md`), "utf8").catch(() => null)
  if (md == null) return null
  const { data, body } = parseFrontmatter(md)
  return { commit, date: data.date ?? "", explanation: body, files: [], hasDiff: false }
}
