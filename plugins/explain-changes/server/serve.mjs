#!/usr/bin/env node
import http from "node:http"
import path from "node:path"
import { writeFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"
import { createHandler } from "./lib/handler.mjs"

const INACTIVITY_MS = 30 * 60 * 1000

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open"
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url]
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true })
    child.on("error", () => {}) // best-effort: never crash on a headless box
    child.unref()
  } catch {
    /* best-effort */
  }
}

async function main() {
  const sessionDirArg = arg("session-dir", "")
  if (!sessionDirArg) {
    console.error("--session-dir is required")
    process.exit(1)
  }
  const sessionDir = path.resolve(sessionDirArg)
  const projectRoot = path.resolve(arg("project-root", process.cwd()))
  const here = path.dirname(fileURLToPath(import.meta.url))
  const webDistDir = path.resolve(arg("web-dist", path.join(here, "web_dist")))
  const wantOpen = process.argv.includes("--open")

  await mkdir(sessionDir, { recursive: true })

  let inactivityTimer
  const resetInactivity = () => {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      server.close()
      process.exit(0)
    }, INACTIVITY_MS)
  }

  const handler = createHandler({ sessionDir, projectRoot, webDistDir, onActivity: resetInactivity })
  const server = http.createServer(handler)

  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address()
    const info = { url: `http://localhost:${port}`, port, pid: process.pid }
    writeFile(path.join(sessionDir, "server-info.json"), JSON.stringify(info), "utf8")
      .then(() => {
        console.log(JSON.stringify(info))
        resetInactivity()
        if (wantOpen) openBrowser(info.url)
      })
      .catch((err) => {
        console.error(err)
        process.exit(1)
      })
  })
}

main()
