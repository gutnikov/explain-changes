import { readFile, writeFile, stat } from "node:fs/promises"
import path from "node:path"
import { readHistory } from "./history.mjs"

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" })
  res.end(body)
}

async function sendJsonFile(res, file) {
  try {
    const data = await readFile(file, "utf8")
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" })
    res.end(data)
  } catch {
    sendJson(res, 404, { error: "not found" })
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (c) => (data += c))
    req.on("end", () => resolve(data))
    req.on("error", reject)
  })
}

async function serveStatic(res, webDistRoot, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "")
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "")
  let filePath = path.join(webDistRoot, safe)
  if (!filePath.startsWith(webDistRoot)) {
    return sendJson(res, 403, { error: "forbidden" })
  }
  try {
    const s = await stat(filePath)
    if (s.isDirectory()) filePath = path.join(filePath, "index.html")
  } catch {
    if (path.extname(safe)) return sendJson(res, 404, { error: "not found" })
    filePath = path.join(webDistRoot, "index.html") // SPA fallback
  }
  let data
  try {
    data = await readFile(filePath)
  } catch {
    return sendJson(res, 404, { error: "not found" })
  }
  res.writeHead(200, { "content-type": MIME[path.extname(filePath)] ?? "application/octet-stream" })
  res.end(data)
}

/**
 * Build the request handler. The server is "dumb": it only reads/writes the
 * session files and serves static assets. No git, no business logic.
 */
export function createHandler({ sessionDir, projectRoot, webDistDir, onActivity }) {
  const webDistRoot = path.resolve(webDistDir)
  return async function handle(req, res) {
    onActivity?.()
    const { pathname } = new URL(req.url, "http://localhost")
    try {
      if (req.method === "GET" && pathname === "/payload") {
        return await sendJsonFile(res, path.join(sessionDir, "payload.json"))
      }
      if (req.method === "POST" && pathname === "/decision") {
        const body = await readBody(req)
        await writeFile(path.join(sessionDir, "decision.json"), body, "utf8")
        return sendJson(res, 200, { ok: true })
      }
      if (req.method === "GET" && pathname === "/api/history") {
        return sendJson(res, 200, await readHistory(projectRoot))
      }
      return await serveStatic(res, webDistRoot, pathname)
    } catch (err) {
      return sendJson(res, 500, { error: String(err?.message ?? err) })
    }
  }
}
