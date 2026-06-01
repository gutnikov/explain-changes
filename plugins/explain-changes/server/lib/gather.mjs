import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { parseGitDiff } from "./parse-diff.mjs"

const run = promisify(execFile)

async function git(cwd, args) {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 })
  return stdout
}

/**
 * Gather uncommitted working-tree changes vs HEAD.
 * Tracked changes come from `git diff HEAD`; untracked files are synthesized as
 * "added" files (each line an add) so they appear without mutating the index.
 * Returns { branch, files }.
 */
export async function gatherChanges(cwd) {
  const branch = (await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])).trim()
  const diffText = await git(cwd, ["diff", "HEAD"])
  const files = parseGitDiff(diffText)

  const untracked = (await git(cwd, ["ls-files", "--others", "--exclude-standard"]))
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const rel of untracked) {
    let content = ""
    try {
      content = await readFile(path.join(cwd, rel), "utf8")
    } catch {
      continue // skip unreadable
    }
    if (content.includes("\0")) continue // skip binary
    const rows = content.split("\n")
    if (rows.length && rows[rows.length - 1] === "") rows.pop()
    files.push({
      path: rel,
      status: "added",
      additions: rows.length,
      deletions: 0,
      hunks: [
        {
          header: rows.length === 0 ? "@@ -0,0 +0,0 @@" : `@@ -0,0 +1,${rows.length} @@`,
          lines: rows.map((r) => ({ type: "add", content: `+${r}` })),
        },
      ],
    })
  }

  return { branch, files }
}
