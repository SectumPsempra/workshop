---
name: bootstrap-project
description: Initialises a greenfield TypeScript project with the minimal toolchain needed by the task2pr loop. Run after generate-config and before scaffold-feature when no package.json exists. Skipped entirely on brownfield repos.
---

# Bootstrap Project

## What this does

Creates the project skeleton — `package.json`, `tsconfig.json`, test runner config, linter
config, and `.gitignore` — so `scaffold-feature` has a compilable base to build on. Also
initialises empty `config.json` and `.env.example` if `generate-config` has not already
created them.

This step is **skipped** when `package.json` already exists. Never overwrite existing
project files.

---

## When to run

Check in `loop_state`: if `package.json` does not exist at the project root → run this step.
Otherwise → skip and proceed to `scaffold-feature`.

---

## Steps

### 1 — Detect project type from plan

Read the approved plan to understand what the project needs:

- Does it include React components? → add `react` + `@types/react` dependencies and `jsx` in tsconfig.
- Does it include a demo server? (`demo.enabled: true` in config.json) → add `npm run dev` script.
- Does it use any other specific dependencies? → include them.

### 2 — Create `package.json`

```json
{
  "name": "<repo-folder-name>",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src/"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

Add `"dev": "node --import tsx/esm src/demo/server.ts"` to scripts when `demo.enabled` in config.

### 3 — Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "lib": ["ES2022", "DOM"],
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

Add `"jsx": "react-jsx"` and `"@types/react"` under types when plan includes React components.

### 4 — Create `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

### 5 — Create `eslint.config.js`

```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
  },
);
```

### 6 — Initialise `config.json` and `.env.example`

Only if `generate-config` has not already created them:

```bash
echo '{}' > config.json
touch .env.example
```

### 7 — Ensure `.gitignore` includes `.env` and `node_modules`

Append missing lines only:

```
node_modules/
dist/
.env
```

### 8 — Install base dev dependencies

```bash
npm install --save-dev typescript vitest @eslint/js typescript-eslint @types/node
npm install --save-dev tsx          # for demo dev server, when demo.enabled
```

For React features:

```bash
npm install react
npm install --save-dev @types/react
```

### 9 — Verify compilation

```bash
npx tsc --noEmit
```

Zero errors expected at this point (no source files yet — just toolchain).

### 10 — Report

```
bootstrap-project complete.

  Created:
    package.json
    tsconfig.json
    vitest.config.ts
    eslint.config.js
    .gitignore (updated)

  Initialised (if absent):
    config.json  {}
    .env.example (empty)

  Ready for scaffold-feature.
```

---

## Rules

- **Never overwrite** `package.json`, `tsconfig.json`, or `eslint.config.js` if they already exist.
- **Append-only** for `.gitignore` and `.env.example`.
- Only install the dependencies the plan actually requires — do not add unused packages.
- After this step, `npx tsc --noEmit` must exit 0 before continuing.
