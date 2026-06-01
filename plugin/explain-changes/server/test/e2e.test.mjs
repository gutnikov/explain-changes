import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, writeFile, readFile, readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const buildPayload = path.join(here, "..", "build-payload.mjs")
const saveExplanation = path.join(here, "..", "save-explanation.mjs")

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, stdio: "pipe" }).toString()
}

test("build-payload -> decision -> commit -> save-explanation produces <hash>.md", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-e2e-"))
  git(dir, "init", "-q")
  git(dir, "config", "user.email", "t@t.dev")
  git(dir, "config", "user.name", "T")
  git(dir, "config", "commit.gpgsign", "false")
  await writeFile(path.join(dir, "a.ts"), "one\n")
  git(dir, "add", ".")
  git(dir, "commit", "-q", "-m", "init")
  await writeFile(path.join(dir, "a.ts"), "one\ntwo\n")

  const sessionDir = await mkdtemp(path.join(tmpdir(), "ec-e2e-sess-"))
  const explFile = path.join(sessionDir, "explanation.md")
  await writeFile(explFile, "## What changed & why\nAdded a second line.")

  // 1. build payload
  execFileSync(process.execPath, [buildPayload, "--session-dir", sessionDir, "--project-root", dir, "--explanation-file", explFile], { stdio: "pipe" })

  // 2. simulate the browser writing a commit decision
  await writeFile(path.join(sessionDir, "decision.json"), JSON.stringify({ action: "commit", generalComment: "lgtm", fileComments: {} }), "utf8")

  // 3. agent commits
  git(dir, "add", "-A")
  git(dir, "commit", "-q", "-m", "Add a second line")
  const hash = git(dir, "rev-parse", "HEAD").trim()

  // 4. save explanation
  execFileSync(process.execPath, [saveExplanation, "--session-dir", sessionDir, "--project-root", dir, "--commit", hash], { stdio: "pipe" })

  const branchName = git(dir, "rev-parse", "--abbrev-ref", "HEAD").trim()
  const branchDir = branchName.replace(/\//g, "-")
  const mdPath = path.join(dir, ".explain-changes", branchDir, `${hash}.md`)
  const md = await readFile(mdPath, "utf8")
  assert.match(md, /Added a second line/)
  assert.match(md, /> general: lgtm/)
  assert.match(md, new RegExp(`commit: ${hash}`))
})
