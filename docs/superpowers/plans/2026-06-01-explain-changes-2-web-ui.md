# explain-changes Plan 2 — React Web UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the GitHub-PR-style single-page app: a review screen (`/`) that renders the explanation + per-file diffs (unified ↔ split toggle) with comment boxes and three action buttons, plus a read-only history browser (`/history`). Build output is copied into `plugin/explain-changes/server/web_dist/` for distribution.

**Architecture:** Vite SPA. Pure data transforms (`lib/diff.ts`, `lib/api.ts`) are unit-tested; presentational components render those transforms; routes compose components and own the decision state. The app talks to the Plan 1 server only through `/payload`, `/decision`, `/api/history`.

**Tech Stack:** React 19, `@tanstack/react-router`, Vite 6, Tailwind 4 + `@tailwindcss/vite`, shadcn (radix-ui, `new-york` style) with the tweakcn theme, `react-markdown` + `remark-gfm`, `diff`, `lucide-react`, `next-themes`. Tests: Vitest + `@testing-library/react` + jsdom.

**Reference:** orca's `web/` (`vite.config.ts`, `components.json`, `index.html`, `src/main.tsx`, `src/router.tsx`, `src/routes/__root.tsx`, `hooks/`, `lib/utils.ts`) at `/Users/agutnikov/work/orca`.

---

## File Structure

- `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`, `web/components.json`, `web/index.html`
- `web/src/main.tsx` — React entry.
- `web/src/router.tsx` + `web/src/routeTree.gen.ts` (generated) — router setup.
- `web/src/styles/globals.css` — Tailwind + theme variables (tweakcn writes here).
- `web/src/lib/utils.ts` — `cn()` helper (from shadcn).
- `web/src/lib/api.ts` — typed fetchers + shared types (`Payload`, `FileChange`, `Hunk`, `Decision`).
- `web/src/lib/diff.ts` — `parseHunkHeader`, `toUnifiedRows`, `toSplitRows` (pure).
- `web/src/components/ui/*` — shadcn components (button, textarea, badge, separator, tabs).
- `web/src/components/Explanation.tsx` — renders markdown.
- `web/src/components/DiffView.tsx` — renders one file's hunks, unified or split.
- `web/src/components/FileCard.tsx` — file header + DiffView + per-file comment box.
- `web/src/components/ActionBar.tsx` — sticky top bar + 3 buttons.
- `web/src/routes/__root.tsx` — layout shell + theme provider.
- `web/src/routes/index.tsx` — review screen (owns decision state).
- `web/src/routes/history.tsx` — history browser.
- `web/src/test/setup.ts` — testing-library/jest-dom setup.
- `scripts/build-web.sh` — `pnpm build` then copy `web/dist` → `plugin/explain-changes/server/web_dist`.

---

## Task 1: Scaffold the Vite app + shadcn theme

**Files:**
- Create: `web/package.json`, `web/index.html`, `web/vite.config.ts`, `web/tsconfig.json`, `web/tsconfig.node.json`, `web/components.json`, `web/src/main.tsx`, `web/src/styles/globals.css`, `web/src/lib/utils.ts`, `web/src/test/setup.ts`, `web/src/router.tsx`, `web/src/routes/__root.tsx`, `web/src/routes/index.tsx`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "explain-changes-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.95.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "diff": "^9.0.0",
    "lucide-react": "^0.469.0",
    "next-themes": "^0.4.6",
    "radix-ui": "^1.4.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@tanstack/router-plugin": "^1.95.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4.0.0",
    "tw-animate-css": "^1.2.0",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>explain-changes</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `web/vite.config.ts`** — note `base: "./"` so the bundle works when served from the plugin dir, and a `/payload`+`/decision`+`/api` proxy for `pnpm dev`.

```ts
/// <reference types="vitest/config" />
import path from "node:path"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  base: "./",
  plugins: [
    tanstackRouter({
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/payload": "http://127.0.0.1:7900",
      "/decision": "http://127.0.0.1:7900",
      "/api": "http://127.0.0.1:7900",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
})
```

- [ ] **Step 4: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `web/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 6: Create `web/src/styles/globals.css`** (baseline; the tweakcn theme command appends/overrides the `:root` / `.dark` variable blocks)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.5rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

body {
  @apply bg-background text-foreground;
}
```

- [ ] **Step 7: Create `web/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 8: Create `web/src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest"
```

- [ ] **Step 9: Create `web/src/router.tsx`**

```tsx
import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
```

- [ ] **Step 10: Create `web/src/main.tsx`**

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"
import "./styles/globals.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

- [ ] **Step 11: Create `web/src/routes/__root.tsx`**

```tsx
import { Outlet, createRootRoute } from "@tanstack/react-router"

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  ),
})
```

- [ ] **Step 12: Create a placeholder `web/src/routes/index.tsx`** (replaced in Task 6; lets the route tree generate now)

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: () => <div className="p-6">explain-changes</div>,
})
```

- [ ] **Step 13: Install deps and apply the shadcn theme + components**

```bash
cd web
pnpm install
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/cmmea3qbd000004jvb99v39cd
pnpm dlx shadcn@latest add button textarea badge separator tabs
```

Expected: theme writes CSS variables into `src/styles/globals.css`; components land in `src/components/ui/`. If `shadcn` prompts to overwrite `globals.css`, accept (it merges the theme variables).

- [ ] **Step 14: Verify the app builds**

Run: `cd web && pnpm build`
Expected: `tsc --noEmit` passes and `vite build` emits `web/dist/` with `index.html` + `assets/`.

- [ ] **Step 15: Commit**

```bash
git add web
git commit -m "feat(web): scaffold vite + tanstack + shadcn app with tweakcn theme"
```

---

## Task 2: API layer + shared types

**Files:**
- Create: `web/src/lib/api.ts`
- Test: `web/src/lib/api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// web/src/lib/api.test.ts
import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchPayload, postDecision, fetchHistory } from "./api"

afterEach(() => vi.restoreAllMocks())

describe("api", () => {
  it("fetchPayload returns parsed payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ branch: "x", base: "HEAD", explanation: "y", files: [] }))))
    const p = await fetchPayload()
    expect(p.branch).toBe("x")
    expect(p.files).toEqual([])
  })

  it("postDecision POSTs JSON to /decision", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal("fetch", spy)
    await postDecision({ action: "commit", generalComment: "hi", fileComments: { "a.ts": "c" } })
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe("/decision")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body).action).toBe("commit")
  })

  it("fetchHistory returns the entry array", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ branch: "b", commit: "c", date: "d", files: [], additions: 0, deletions: 0, markdown: "m" }]))))
    const h = await fetchHistory()
    expect(h[0].commit).toBe("c")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm test src/lib/api.test.ts`
Expected: FAIL — cannot resolve `./api`.

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/lib/api.ts

export type LineType = "context" | "add" | "del"
export interface DiffLine {
  type: LineType
  content: string
}
export interface Hunk {
  header: string
  lines: DiffLine[]
}
export type FileStatus = "modified" | "added" | "deleted" | "renamed"
export interface FileChange {
  path: string
  status: FileStatus
  additions: number
  deletions: number
  hunks: Hunk[]
}
export interface Payload {
  branch: string
  base: string
  explanation: string
  files: FileChange[]
}

export type DecisionAction = "commit" | "request_changes" | "proceed"
export interface Decision {
  action: DecisionAction
  generalComment: string
  fileComments: Record<string, string>
}

export interface HistoryEntry {
  branch: string
  commit: string
  date: string
  files: string[]
  additions: number
  deletions: number
  markdown: string
}

export async function fetchPayload(): Promise<Payload> {
  const res = await fetch("/payload")
  if (!res.ok) throw new Error(`payload ${res.status}`)
  return res.json()
}

export async function postDecision(decision: Decision): Promise<void> {
  const res = await fetch("/decision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(decision),
  })
  if (!res.ok) throw new Error(`decision ${res.status}`)
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const res = await fetch("/api/history")
  if (!res.ok) throw new Error(`history ${res.status}`)
  return res.json()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm test src/lib/api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/api.ts web/src/lib/api.test.ts
git commit -m "feat(web): add typed api layer and shared types"
```

---

## Task 3: Diff transforms (unified + split) — full TDD

**Files:**
- Create: `web/src/lib/diff.ts`
- Test: `web/src/lib/diff.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// web/src/lib/diff.test.ts
import { describe, it, expect } from "vitest"
import { parseHunkHeader, toUnifiedRows, toSplitRows } from "./diff"
import type { Hunk } from "./api"

const hunk: Hunk = {
  header: "@@ -10,3 +10,4 @@",
  lines: [
    { type: "context", content: " a()" },
    { type: "del", content: "-old()" },
    { type: "add", content: "+new()" },
    { type: "add", content: "+extra()" },
    { type: "context", content: " b()" },
  ],
}

describe("parseHunkHeader", () => {
  it("extracts old/new start", () => {
    expect(parseHunkHeader("@@ -10,3 +12,4 @@")).toEqual({ oldStart: 10, newStart: 12 })
  })
  it("falls back to 1 on malformed header", () => {
    expect(parseHunkHeader("garbage")).toEqual({ oldStart: 1, newStart: 1 })
  })
})

describe("toUnifiedRows", () => {
  it("assigns line numbers per type", () => {
    const rows = toUnifiedRows(hunk)
    expect(rows.map((r) => [r.type, r.oldNo, r.newNo, r.content])).toEqual([
      ["context", 10, 10, " a()"],
      ["del", 11, null, "-old()"],
      ["add", null, 11, "+new()"],
      ["add", null, 12, "+extra()"],
      ["context", 12, 13, " b()"],
    ])
  })
})

describe("toSplitRows", () => {
  it("pairs deletes with adds and keeps leftovers", () => {
    const rows = toSplitRows(hunk)
    // context row
    expect(rows[0].left).toMatchObject({ type: "context", no: 10, content: " a()" })
    expect(rows[0].right).toMatchObject({ type: "context", no: 10, content: " a()" })
    // del paired with first add
    expect(rows[1].left).toMatchObject({ type: "del", no: 11, content: "-old()" })
    expect(rows[1].right).toMatchObject({ type: "add", no: 11, content: "+new()" })
    // leftover add: left empty
    expect(rows[2].left).toBeNull()
    expect(rows[2].right).toMatchObject({ type: "add", no: 12, content: "+extra()" })
    // trailing context
    expect(rows[3].left).toMatchObject({ type: "context", no: 12 })
    expect(rows[3].right).toMatchObject({ type: "context", no: 13 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm test src/lib/diff.test.ts`
Expected: FAIL — cannot resolve `./diff`.

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/lib/diff.ts
import type { Hunk, LineType } from "./api"

export interface UnifiedRow {
  type: LineType
  oldNo: number | null
  newNo: number | null
  content: string
}

export interface SplitCell {
  type: LineType
  no: number
  content: string
}
export interface SplitRow {
  left: SplitCell | null
  right: SplitCell | null
}

export function parseHunkHeader(header: string): { oldStart: number; newStart: number } {
  const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(header)
  if (!m) return { oldStart: 1, newStart: 1 }
  return { oldStart: Number(m[1]), newStart: Number(m[2]) }
}

export function toUnifiedRows(hunk: Hunk): UnifiedRow[] {
  const { oldStart, newStart } = parseHunkHeader(hunk.header)
  let oldNo = oldStart
  let newNo = newStart
  const rows: UnifiedRow[] = []
  for (const line of hunk.lines) {
    if (line.type === "context") {
      rows.push({ type: "context", oldNo, newNo, content: line.content })
      oldNo++
      newNo++
    } else if (line.type === "del") {
      rows.push({ type: "del", oldNo, newNo: null, content: line.content })
      oldNo++
    } else {
      rows.push({ type: "add", oldNo: null, newNo, content: line.content })
      newNo++
    }
  }
  return rows
}

export function toSplitRows(hunk: Hunk): SplitRow[] {
  const { oldStart, newStart } = parseHunkHeader(hunk.header)
  let oldNo = oldStart
  let newNo = newStart
  const rows: SplitRow[] = []
  let pendingDel: SplitCell[] = []
  let pendingAdd: SplitCell[] = []

  const flush = () => {
    const n = Math.max(pendingDel.length, pendingAdd.length)
    for (let i = 0; i < n; i++) {
      rows.push({ left: pendingDel[i] ?? null, right: pendingAdd[i] ?? null })
    }
    pendingDel = []
    pendingAdd = []
  }

  for (const line of hunk.lines) {
    if (line.type === "context") {
      flush()
      rows.push({
        left: { type: "context", no: oldNo, content: line.content },
        right: { type: "context", no: newNo, content: line.content },
      })
      oldNo++
      newNo++
    } else if (line.type === "del") {
      pendingDel.push({ type: "del", no: oldNo, content: line.content })
      oldNo++
    } else {
      pendingAdd.push({ type: "add", no: newNo, content: line.content })
      newNo++
    }
  }
  flush()
  return rows
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm test src/lib/diff.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/diff.ts web/src/lib/diff.test.ts
git commit -m "feat(web): add unified and split diff transforms"
```

---

## Task 4: DiffView component

**Files:**
- Create: `web/src/components/DiffView.tsx`
- Test: `web/src/components/DiffView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/DiffView.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DiffView } from "./DiffView"
import type { FileChange } from "@/lib/api"

const file: FileChange = {
  path: "a.ts",
  status: "modified",
  additions: 1,
  deletions: 1,
  hunks: [
    {
      header: "@@ -1,2 +1,2 @@",
      lines: [
        { type: "context", content: " keep" },
        { type: "del", content: "-old" },
        { type: "add", content: "+new" },
      ],
    },
  ],
}

describe("DiffView", () => {
  it("renders unified rows by default", () => {
    render(<DiffView file={file} mode="unified" />)
    expect(screen.getByText("-old")).toBeInTheDocument()
    expect(screen.getByText("+new")).toBeInTheDocument()
  })

  it("renders two columns in split mode", () => {
    const { container } = render(<DiffView file={file} mode="split" />)
    // split rows expose data-side cells
    expect(container.querySelectorAll('[data-side="left"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-side="right"]').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm test src/components/DiffView.test.tsx`
Expected: FAIL — cannot resolve `./DiffView`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// web/src/components/DiffView.tsx
import type { FileChange } from "@/lib/api"
import { toSplitRows, toUnifiedRows } from "@/lib/diff"
import { cn } from "@/lib/utils"

export type DiffMode = "unified" | "split"

const bg: Record<string, string> = {
  add: "bg-emerald-500/10",
  del: "bg-rose-500/10",
  context: "",
}

function Gutter({ n }: { n: number | null }) {
  return <span className="inline-block w-10 select-none pr-2 text-right text-xs text-muted-foreground">{n ?? ""}</span>
}

export function DiffView({ file, mode }: { file: FileChange; mode: DiffMode }) {
  return (
    <div className="overflow-x-auto font-mono text-xs leading-6">
      {file.hunks.map((hunk, hi) => (
        <div key={hi}>
          <div className="bg-muted px-2 py-1 text-muted-foreground">{hunk.header}</div>
          {mode === "unified"
            ? toUnifiedRows(hunk).map((r, i) => (
                <div key={i} className={cn("flex whitespace-pre px-2", bg[r.type])}>
                  <Gutter n={r.oldNo} />
                  <Gutter n={r.newNo} />
                  <code className="flex-1">{r.content}</code>
                </div>
              ))
            : toSplitRows(hunk).map((r, i) => (
                <div key={i} className="flex whitespace-pre">
                  <div data-side="left" className={cn("flex w-1/2 px-2", r.left ? bg[r.left.type] : "")}>
                    <Gutter n={r.left?.no ?? null} />
                    <code className="flex-1">{r.left?.content ?? ""}</code>
                  </div>
                  <div data-side="right" className={cn("flex w-1/2 border-l px-2", r.right ? bg[r.right.type] : "")}>
                    <Gutter n={r.right?.no ?? null} />
                    <code className="flex-1">{r.right?.content ?? ""}</code>
                  </div>
                </div>
              ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm test src/components/DiffView.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/DiffView.tsx web/src/components/DiffView.test.tsx
git commit -m "feat(web): add DiffView with unified and split rendering"
```

---

## Task 5: Explanation, FileCard, ActionBar components

**Files:**
- Create: `web/src/components/Explanation.tsx`
- Create: `web/src/components/FileCard.tsx`
- Create: `web/src/components/ActionBar.tsx`
- Test: `web/src/components/FileCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/FileCard.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FileCard } from "./FileCard"
import type { FileChange } from "@/lib/api"

const file: FileChange = {
  path: "src/a.ts",
  status: "modified",
  additions: 2,
  deletions: 0,
  hunks: [{ header: "@@ -1 +1,2 @@", lines: [{ type: "add", content: "+x" }] }],
}

describe("FileCard", () => {
  it("shows the path, status pill, and counts", () => {
    render(<FileCard file={file} comment="" onComment={() => {}} mode="unified" />)
    expect(screen.getByText("src/a.ts")).toBeInTheDocument()
    expect(screen.getByText("modified")).toBeInTheDocument()
    expect(screen.getByText("+2")).toBeInTheDocument()
  })

  it("emits comment changes", () => {
    const onComment = vi.fn()
    render(<FileCard file={file} comment="" onComment={onComment} mode="unified" />)
    fireEvent.change(screen.getByPlaceholderText(/comment on this file/i), { target: { value: "looks good" } })
    expect(onComment).toHaveBeenCalledWith("looks good")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm test src/components/FileCard.test.tsx`
Expected: FAIL — cannot resolve `./FileCard`.

- [ ] **Step 3: Write the three components**

```tsx
// web/src/components/Explanation.tsx
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function Explanation({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  )
}
```

```tsx
// web/src/components/FileCard.tsx
import type { FileChange } from "@/lib/api"
import { DiffView, type DiffMode } from "./DiffView"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export function FileCard({
  file,
  comment,
  onComment,
  mode,
}: {
  file: FileChange
  comment: string
  onComment: (v: string) => void
  mode: DiffMode
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span>{file.path}</span>
          <Badge variant="secondary">{file.status}</Badge>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-emerald-600">+{file.additions}</span>
          <span className="text-rose-600">−{file.deletions}</span>
        </div>
      </div>
      <DiffView file={file} mode={mode} />
      <div className="border-t p-2">
        <Textarea
          placeholder="Comment on this file…"
          value={comment}
          onChange={(e) => onComment(e.target.value)}
        />
      </div>
    </div>
  )
}
```

```tsx
// web/src/components/ActionBar.tsx
import type { DecisionAction } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function ActionBar({
  branch,
  fileCount,
  additions,
  deletions,
  busy,
  onAction,
}: {
  branch: string
  fileCount: number
  additions: number
  deletions: number
  busy: boolean
  onAction: (a: DecisionAction) => void
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
      <div className="text-sm">
        <span className="font-mono font-semibold">{branch}</span>
        <span className="ml-2 text-muted-foreground">
          {fileCount} files <span className="text-emerald-600">+{additions}</span>{" "}
          <span className="text-rose-600">−{deletions}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={busy} onClick={() => onAction("request_changes")}>
          Request changes
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => onAction("proceed")}>
          Proceed
        </Button>
        <Button disabled={busy} onClick={() => onAction("commit")}>
          Commit &amp; proceed
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm test src/components/FileCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Explanation.tsx web/src/components/FileCard.tsx web/src/components/ActionBar.tsx web/src/components/FileCard.test.tsx
git commit -m "feat(web): add Explanation, FileCard, ActionBar components"
```

---

## Task 6: Review screen route (`/`)

**Files:**
- Modify: `web/src/routes/index.tsx` (replace placeholder)
- Test: `web/src/routes/index.test.tsx`

- [ ] **Step 1: Write the failing test** — render the inner component with mocked api.

```tsx
// web/src/routes/index.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ReviewScreen } from "./index"
import * as api from "@/lib/api"

const payload: api.Payload = {
  branch: "feature/x",
  base: "HEAD",
  explanation: "## Why\nbecause",
  files: [
    {
      path: "a.ts",
      status: "modified",
      additions: 1,
      deletions: 0,
      hunks: [{ header: "@@ -1 +1,2 @@", lines: [{ type: "add", content: "+x" }] }],
    },
  ],
}

beforeEach(() => {
  vi.spyOn(api, "fetchPayload").mockResolvedValue(payload)
  vi.spyOn(api, "postDecision").mockResolvedValue()
})

describe("ReviewScreen", () => {
  it("loads payload and renders explanation + file + actions", async () => {
    render(<ReviewScreen />)
    expect(await screen.findByText("feature/x")).toBeInTheDocument()
    expect(screen.getByText("because")).toBeInTheDocument()
    expect(screen.getByText("a.ts")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /commit & proceed/i })).toBeInTheDocument()
  })

  it("posts the decision with comments on commit", async () => {
    render(<ReviewScreen />)
    await screen.findByText("feature/x")
    fireEvent.change(screen.getByPlaceholderText(/leave a general comment/i), { target: { value: "ship it" } })
    fireEvent.click(screen.getByRole("button", { name: /commit & proceed/i }))
    await waitFor(() =>
      expect(api.postDecision).toHaveBeenCalledWith(
        expect.objectContaining({ action: "commit", generalComment: "ship it" }),
      ),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm test src/routes/index.test.tsx`
Expected: FAIL — `ReviewScreen` is not exported.

- [ ] **Step 3: Write the route + screen**

```tsx
// web/src/routes/index.tsx
import { useEffect, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  fetchPayload,
  postDecision,
  type DecisionAction,
  type Payload,
} from "@/lib/api"
import { Explanation } from "@/components/Explanation"
import { FileCard } from "@/components/FileCard"
import { ActionBar } from "@/components/ActionBar"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { DiffMode } from "@/components/DiffView"

export function ReviewScreen() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [general, setGeneral] = useState("")
  const [fileComments, setFileComments] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<DiffMode>("unified")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<DecisionAction | null>(null)

  useEffect(() => {
    fetchPayload().then(setPayload).catch((e) => setError(String(e)))
  }, [])

  const totals = useMemo(() => {
    const files = payload?.files ?? []
    return {
      count: files.length,
      additions: files.reduce((s, f) => s + f.additions, 0),
      deletions: files.reduce((s, f) => s + f.deletions, 0),
    }
  }, [payload])

  if (error) return <div className="p-6 text-rose-600">Failed to load: {error}</div>
  if (!payload) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (done)
    return (
      <div className="p-6 text-muted-foreground">
        Decision sent: <strong>{done}</strong>. You can return to your terminal.
      </div>
    )

  const submit = async (action: DecisionAction) => {
    setBusy(true)
    try {
      await postDecision({ action, generalComment: general, fileComments })
      setDone(action)
    } catch (e) {
      setError(String(e))
      setBusy(false)
    }
  }

  return (
    <div>
      <ActionBar
        branch={payload.branch}
        fileCount={totals.count}
        additions={totals.additions}
        deletions={totals.deletions}
        busy={busy}
        onAction={submit}
      />
      <div className="mx-auto max-w-5xl p-4">
        <section className="mb-4 rounded-md border p-4">
          <Explanation markdown={payload.explanation} />
        </section>
        <Textarea
          className="mb-4"
          placeholder="Leave a general comment…"
          value={general}
          onChange={(e) => setGeneral(e.target.value)}
        />
        <div className="mb-3 flex gap-2">
          <Button size="sm" variant={mode === "unified" ? "default" : "outline"} onClick={() => setMode("unified")}>
            Unified
          </Button>
          <Button size="sm" variant={mode === "split" ? "default" : "outline"} onClick={() => setMode("split")}>
            Split
          </Button>
        </div>
        {payload.files.map((f) => (
          <FileCard
            key={f.path}
            file={f}
            mode={mode}
            comment={fileComments[f.path] ?? ""}
            onComment={(v) => setFileComments((c) => ({ ...c, [f.path]: v }))}
          />
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: ReviewScreen })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm test src/routes/index.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/routes/index.tsx web/src/routes/index.test.tsx
git commit -m "feat(web): add review screen route"
```

---

## Task 7: History browser route (`/history`)

**Files:**
- Create: `web/src/routes/history.tsx`
- Test: `web/src/routes/history.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/routes/history.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { HistoryScreen } from "./history"
import * as api from "@/lib/api"

const entries: api.HistoryEntry[] = [
  { branch: "feature/x", commit: "9f2a1c7", date: "2026-06-01T10:00:00Z", files: ["a.ts"], additions: 5, deletions: 1, markdown: "## What changed\nFirst." },
  { branch: "feature/x", commit: "1111111", date: "2026-06-02T10:00:00Z", files: ["b.ts"], additions: 2, deletions: 0, markdown: "## What changed\nSecond." },
]

beforeEach(() => {
  vi.spyOn(api, "fetchHistory").mockResolvedValue(entries)
})

describe("HistoryScreen", () => {
  it("lists commits and renders the selected explanation", async () => {
    render(<HistoryScreen />)
    expect(await screen.findByText("9f2a1c7")).toBeInTheDocument()
    expect(screen.getByText("1111111")).toBeInTheDocument()
    // first entry selected by default
    expect(screen.getByText("First.")).toBeInTheDocument()
    // switch selection
    fireEvent.click(screen.getByText("1111111"))
    expect(screen.getByText("Second.")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm test src/routes/history.test.tsx`
Expected: FAIL — `HistoryScreen` is not exported.

- [ ] **Step 3: Write the route + screen**

```tsx
// web/src/routes/history.tsx
import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { fetchHistory, type HistoryEntry } from "@/lib/api"
import { Explanation } from "@/components/Explanation"
import { cn } from "@/lib/utils"

export function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory().then((e) => {
      setEntries(e)
      if (e.length) setSelected(e[0].commit)
    })
  }, [])

  const current = entries.find((e) => e.commit === selected)

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 shrink-0 border-r">
        <div className="border-b p-3 text-sm font-semibold">History</div>
        <ul>
          {entries.map((e) => (
            <li key={`${e.branch}/${e.commit}`}>
              <button
                onClick={() => setSelected(e.commit)}
                className={cn(
                  "w-full border-b px-3 py-2 text-left hover:bg-muted",
                  e.commit === selected && "bg-muted",
                )}
              >
                <div className="font-mono text-sm">{e.commit}</div>
                <div className="text-xs text-muted-foreground">
                  {e.branch} · {new Date(e.date).toLocaleString()} ·{" "}
                  <span className="text-emerald-600">+{e.additions}</span>{" "}
                  <span className="text-rose-600">−{e.deletions}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-6">
        {current ? <Explanation markdown={current.markdown} /> : <p className="text-muted-foreground">No history yet.</p>}
      </main>
    </div>
  )
}

export const Route = createFileRoute("/history")({ component: HistoryScreen })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm test src/routes/history.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Run the full web suite + typecheck**

Run: `cd web && pnpm test && pnpm typecheck`
Expected: all tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/routes/history.tsx web/src/routes/history.test.tsx
git commit -m "feat(web): add history browser route"
```

---

## Task 8: Build + copy bundle into the plugin

**Files:**
- Create: `scripts/build-web.sh`
- Create (generated, committed): `plugin/explain-changes/server/web_dist/`

- [ ] **Step 1: Create `scripts/build-web.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here/web"
pnpm install
pnpm build
dest="$here/plugin/explain-changes/server/web_dist"
rm -rf "$dest"
mkdir -p "$dest"
cp -R "$here/web/dist/." "$dest/"
echo "Copied web/dist -> $dest"
```

- [ ] **Step 2: Make it executable and run it**

```bash
chmod +x scripts/build-web.sh
./scripts/build-web.sh
```

Expected: prints "Copied web/dist -> …"; `plugin/explain-changes/server/web_dist/index.html` exists.

- [ ] **Step 3: Verify the Plan 1 server serves the real bundle**

```bash
mkdir -p /tmp/ec-verify
printf '{"branch":"demo","base":"HEAD","explanation":"## Why\\nbecause","files":[]}' > /tmp/ec-verify/payload.json
node plugin/explain-changes/server/serve.mjs --session-dir /tmp/ec-verify --project-root "$PWD" &
SERVER_PID=$!
sleep 1
URL=$(node -e "console.log(require('/tmp/ec-verify/server-info.json').url)")
curl -s "$URL/" | grep -q "<div id=\"root\"></div>" && echo "SPA OK"
curl -s "$URL/payload" | grep -q '"branch":"demo"' && echo "payload OK"
kill $SERVER_PID
```

Expected: prints `SPA OK` and `payload OK`.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-web.sh plugin/explain-changes/server/web_dist
git commit -m "feat(web): build script and committed web_dist bundle"
```

---

## Self-Review notes (resolved)

- **`base: "./"`** in `vite.config.ts` is required so the committed bundle's asset paths resolve when served from the plugin directory by `serve.mjs`.
- The dev proxy targets port `7900`; that's only used during `pnpm dev`. Document that a dev can run `serve.mjs` on `7900` (`--port` is not implemented since `serve.mjs` uses port 0; for dev, set the proxy target to the printed port or rely on the committed bundle).
- `web/dist/` stays gitignored (Plan 1 `.gitignore`); the committed artifact is `server/web_dist/`.

## Definition of Done (Plan 2)

- `cd web && pnpm test && pnpm typecheck` pass.
- `./scripts/build-web.sh` produces `plugin/explain-changes/server/web_dist/`.
- The Plan 1 server serves the real SPA (verified in Task 8 Step 3).
- Next: **Plan 3** writes `SKILL.md` to gather the diff, generate the explanation, launch the server, poll the decision, and act.
