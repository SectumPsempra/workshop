---
name: wire-demo-app
description: Wires a minimal local HTTP demo server so a feature can be exercised in a real browser or via HTTP. Run after implement-* and only when demo.enabled is true in config.json. Skipped entirely when demo.enabled is false or absent.
---

# Wire Demo App

## What this does

Creates a small Node HTTP server at `src/demo/server.ts` that exposes the routes needed to
exercise the implemented feature end-to-end. The server reads all config from
`loadConfig()` — no hardcoded ports, paths, or endpoint URLs.

Also adds a `npm run dev` script (if absent) and a README section documenting how to run
locally and what the user must fill in `.env` first.

The server is **feature-shaped**: it imports the feature's own modules from `src/lib/` and
`src/api/` and wires them to routes. The code below is a **template** — replace the routes and
handlers with the ones the implemented feature actually exposes.

---

## When to run

Read `config.json`. If `demo.enabled` is `true` → run this step.
If `demo.enabled` is `false`, `null`, or the key is absent → **skip**.

---

## Steps

### 1 — Read config

```ts
import { loadConfig } from "../config/loadConfig.js";
const config = loadConfig();
```

Use `config.demo.port` and `config.demo.baseUrl` for the server, and read any feature-specific
values from their own namespace in `config` (e.g. `config.<feature>.endpoint`).

### 2 — Create `src/config/loadConfig.ts` (if absent)

This is the runtime config reader used by all application code. Create it if `implement-*`
has not already done so. Keep `AppConfig` **feature-agnostic** — a fixed `demo` block plus an
open index signature for whatever namespaces the feature added to `config.json`:

```ts
import { readFileSync } from "fs";
import { join } from "path";

export type AppConfig = {
  demo: { enabled: boolean; port: number; baseUrl: string };
  // Feature namespaces (e.g. config.<feature>.*) are added by generate-config.
  [key: string]: unknown;
};

/** Reads config.json, overlays process.env, expands ${VAR} placeholders. */
export function loadConfig(): AppConfig {
  const raw = readFileSync(join(process.cwd(), "config.json"), "utf-8");
  const json = JSON.parse(raw) as AppConfig;
  return expandPlaceholders(json);
}

function expandPlaceholders<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] ?? "") as T;
  }
  if (Array.isArray(value)) return value.map(expandPlaceholders) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, expandPlaceholders(v)]),
    ) as T;
  }
  return value;
}
```

> If the feature benefits from a strongly-typed config, `implement-*` may widen `AppConfig`
> with the feature's own namespace type instead of relying on the index signature. Do not bake
> any specific feature's shape into this skill.

### 3 — Create `src/demo/server.ts` (template)

A minimal HTTP server that wires the feature's own modules to routes. Replace the routes,
imports, and handlers with the ones the implemented feature exposes — this is the shape, not a
fixed contract:

```ts
import { createServer, IncomingMessage, ServerResponse } from "http";
import { loadConfig } from "../config/loadConfig.js";
// import the feature's own functions, e.g.:
// import { performOperation } from "../lib/<feature>/<module>.js";

const config = loadConfig();
const PORT = config.demo.port;

function handle(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", config.demo.baseUrl);

  // Landing page — describe/trigger the feature.
  if (url.pathname === "/") {
    serveIndex(res);
    return;
  }

  // One route per interaction the feature exposes. Example:
  if (url.pathname === "/action") {
    void handleAction(url, res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

function serveIndex(res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Demo</title></head>
<body>
  <h1>Demo</h1>
  <a href="/action"><button>Run the feature</button></a>
</body>
</html>`);
}

async function handleAction(url: URL, res: ServerResponse): Promise<void> {
  // Call the feature's real function(s). On failure, return a visible error — no silent success.
  // const result = await performOperation(url.searchParams.get("input") ?? "");
  // if (!result.ok) { res.writeHead(400, ...); res.end(...); return; }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h1>Done</h1><a href=\"/\">Back</a>");
}

createServer(handle).listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
  console.log(`  Home: http://localhost:${PORT}/`);
});
```

### 4 — Add `dev` script to `package.json`

If `scripts.dev` is absent, add it. When `.env.example` declares any keys, the script **must**
load `.env` so `${VAR}` placeholders resolve at runtime:

```json
"dev": "node --env-file=.env --import tsx/esm src/demo/server.ts"
```

If the feature needs no env vars, `--env-file=.env` may be omitted. Ensure `tsx` is in devDependencies:

```bash
npm install --save-dev tsx
```

### 5 — Add README section

Create or update `README.md` with a "Test locally" section. Replace the env var names and the
walkthrough with the feature's actual ones:

```markdown
## Test locally

### 1. Fill required config

Copy `.env.example` to `.env` and fill any required values:

```
# see .env.example for the exact keys this feature needs
<SERVICE>_API_KEY=<your-key>
```

If the feature needs no external service, no env vars are required.

### 2. Run the demo server

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser and exercise the feature.

### 3. Run the test suite

```bash
npm test
```
```

---

## Rules

- Read all values through `loadConfig()` — no hardcoded ports, paths, or endpoint URLs.
- The demo must run **without** any env vars filled whenever the feature has an offline/local mode — useful for offline dev and CI.
- When the feature calls a live external service, the demo talks to the real service; it does not simulate responses.
- Do not duplicate feature logic — import the feature's functions from `src/lib/` and `src/api/`.
- If `.env.example` declares keys, the `dev` script must load `.env` (`--env-file=.env` or a `dotenv` import).
- If `src/config/loadConfig.ts` already exists (created by implement-*), do not overwrite it.
