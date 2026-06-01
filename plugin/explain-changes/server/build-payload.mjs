#!/usr/bin/env node
import path from "node:path"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { gatherChanges } from "./lib/gather.mjs"

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main() {
  const sessionDir = path.resolve(arg("session-dir", ""))
  const projectRoot = path.resolve(arg("project-root", process.cwd()))
  const explanationFile = arg("explanation-file", "")
  if (!sessionDir) {
    console.error("--session-dir is required")
    process.exit(1)
  }
  await mkdir(sessionDir, { recursive: true })

  const { branch, files } = await gatherChanges(projectRoot)
  let explanation = ""
  if (explanationFile) {
    try {
      explanation = await readFile(explanationFile, "utf8")
    } catch {
      explanation = ""
    }
  }

  const payload = { branch, base: "HEAD", explanation, files }
  await writeFile(path.join(sessionDir, "payload.json"), JSON.stringify(payload, null, 2), "utf8")
  console.log(JSON.stringify({ fileCount: files.length, branch }))
}

main()
