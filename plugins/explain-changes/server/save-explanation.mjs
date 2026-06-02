#!/usr/bin/env node
import path from "node:path"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { composeMarkdown } from "./lib/compose-md.mjs"

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch {
    return null
  }
}

async function main() {
  const sessionDirArg = arg("session-dir", "")
  const commit = arg("commit", "")
  if (!sessionDirArg || !commit) {
    console.error("--session-dir and --commit are required")
    process.exit(1)
  }
  const sessionDir = path.resolve(sessionDirArg)
  const projectRoot = path.resolve(arg("project-root", process.cwd()))

  const payload = await readJson(path.join(sessionDir, "payload.json"))
  if (!payload) {
    console.error("payload.json not found")
    process.exit(1)
  }
  const decision = await readJson(path.join(sessionDir, "decision.json")) // null in non-interactive mode

  const date = new Date().toISOString()
  const md = composeMarkdown({
    payload,
    decision,
    commit,
    date,
  })

  // Branch names can contain "/"; flatten to a single directory segment so the
  // history reader (which scans one level deep) can find the file. The real
  // branch name is preserved in the markdown frontmatter.
  const branchDirName = payload.branch.replace(/\//g, "-")
  const outDir = path.join(projectRoot, ".explain-changes", branchDirName)
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, `${commit}.md`)
  await writeFile(outFile, md, "utf8")

  // Sidecar: the reviewable payload (explanation + parsed diff) so the UI can
  // render this checkpoint read-only later. Mirrors payload.json's shape.
  const sidecar = {
    commit,
    branch: payload.branch,
    date,
    explanation: (payload.explanation ?? "").trim(),
    files: payload.files ?? [],
  }
  await writeFile(path.join(outDir, `${commit}.json`), JSON.stringify(sidecar), "utf8")
  console.log(outFile)
}

main()
