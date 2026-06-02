#!/usr/bin/env node
import path from "node:path"
import { readFile, writeFile, mkdir } from "node:fs/promises"

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function readJson(file, empty) {
  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch {
    return empty
  }
}

function parseArgJson(value, empty) {
  if (!value) return empty
  try {
    return JSON.parse(value)
  } catch {
    return empty
  }
}

async function main() {
  const sessionDirArg = arg("session-dir", "")
  if (!sessionDirArg) {
    console.error("--session-dir is required")
    process.exit(1)
  }
  const sessionDir = path.resolve(sessionDirArg)
  await mkdir(sessionDir, { recursive: true })

  const repliesFile = path.join(sessionDir, "replies.json")
  const seenFile = path.join(sessionDir, "seen.json")

  const existingReplies = await readJson(repliesFile, {})
  const existingSeen = await readJson(seenFile, [])
  const safeExistingReplies =
    existingReplies && typeof existingReplies === "object" && !Array.isArray(existingReplies) ? existingReplies : {}
  const safeExistingSeen = Array.isArray(existingSeen) ? existingSeen : []

  const newReplies = parseArgJson(arg("replies", ""), {})
  const newSeen = parseArgJson(arg("seen", ""), [])

  // Replies are keyed by threadId and hold an ordered array of agent answers, so
  // a new answer in an existing thread appends rather than overwrites.
  const mergedReplies = { ...safeExistingReplies }
  for (const [threadId, answers] of Object.entries(newReplies)) {
    const prev = Array.isArray(mergedReplies[threadId]) ? mergedReplies[threadId] : []
    const next = Array.isArray(answers) ? answers : [answers]
    mergedReplies[threadId] = [...prev, ...next]
  }
  const mergedSeen = Array.from(new Set([...safeExistingSeen, ...newSeen]))

  await writeFile(repliesFile, JSON.stringify(mergedReplies), "utf8")
  await writeFile(seenFile, JSON.stringify(mergedSeen), "utf8")
  console.log(JSON.stringify({ replies: Object.keys(mergedReplies).length, seen: mergedSeen.length }))
}

main()
