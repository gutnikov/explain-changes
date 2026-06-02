import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const run = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, "..", "save-replies.mjs")

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"))
}

test("creates replies.json and seen.json when absent", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-rep-"))
  await run("node", [script, "--session-dir", dir,
    "--replies", JSON.stringify({ c1: { body: "answer", ts: 1 } }),
    "--seen", JSON.stringify(["c1"])])
  assert.deepEqual(await readJson(path.join(dir, "replies.json")), { c1: { body: "answer", ts: 1 } })
  assert.deepEqual(await readJson(path.join(dir, "seen.json")), ["c1"])
})

test("merges replies and unions seen into existing files", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-rep-"))
  await writeFile(path.join(dir, "replies.json"), JSON.stringify({ c1: { body: "a", ts: 1 } }), "utf8")
  await writeFile(path.join(dir, "seen.json"), JSON.stringify(["c1"]), "utf8")
  await run("node", [script, "--session-dir", dir,
    "--replies", JSON.stringify({ c2: { body: "b", ts: 2 } }),
    "--seen", JSON.stringify(["c1", "c2"])])
  assert.deepEqual(await readJson(path.join(dir, "replies.json")), {
    c1: { body: "a", ts: 1 }, c2: { body: "b", ts: 2 },
  })
  assert.deepEqual((await readJson(path.join(dir, "seen.json"))).sort(), ["c1", "c2"])
})

test("survives malformed existing files by treating them as empty", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-rep-"))
  await writeFile(path.join(dir, "replies.json"), "not json", "utf8")
  await writeFile(path.join(dir, "seen.json"), "not json", "utf8")
  await run("node", [script, "--session-dir", dir,
    "--replies", JSON.stringify({ c1: { body: "x", ts: 1 } }),
    "--seen", JSON.stringify(["c1"])])
  assert.deepEqual(await readJson(path.join(dir, "replies.json")), { c1: { body: "x", ts: 1 } })
  assert.deepEqual(await readJson(path.join(dir, "seen.json")), ["c1"])
})

test("only --seen provided still works (no replies arg)", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ec-rep-"))
  await run("node", [script, "--session-dir", dir, "--seen", JSON.stringify(["c9"])])
  assert.deepEqual(await readJson(path.join(dir, "seen.json")), ["c9"])
  assert.deepEqual(await readJson(path.join(dir, "replies.json")), {})
})
