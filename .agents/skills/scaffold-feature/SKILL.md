---
name: scaffold-feature
description: Creates the file and folder structure for a new feature based on the approved plan from plan-task. Use after generate-config (and bootstrap-project if greenfield) and before writing implementation code. Creates empty stubs with correct imports and exported signatures.
---

# Scaffold Feature

## What this does

Takes the file list from `plan-task` and creates stubs — real files with the right shape
(exports, types, imports) but no logic yet. This lets the project compile before any logic
is written.

## Steps

1. **Read the approved plan.** Use the file list from `plan-task` output.

2. **Create each file as a typed stub.**
   - Export the right function/component name.
   - Include `TODO: implement-<feature>` markers where logic will go (substitute the actual feature name).
   - Import `loadConfig` in any module that will need config values.
   - Ensure the project still compiles after this step.

3. **Verify compilation.**
   ```bash
   npx tsc --noEmit
   ```

4. **Report** the created files and confirm readiness for implementation.

## Stub patterns

These are shape examples — substitute the feature's real names, types, and `<feature>` marker.

**React component:**
```tsx
import { loadConfig } from "../../config/loadConfig.js";

/** [ComponentName] — [one-line description] */
export function ExampleComponent() {
  // TODO: implement-<feature>
  return null;
}
```

**Business-logic module:**
```ts
import { loadConfig } from "../../config/loadConfig.js";

/** [one-line description of what this does] */
export function doSomething(): void {
  // TODO: implement-<feature>
}

export type OperationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/** [one-line description] — returns a typed result, never throws silently. */
export async function performOperation(
  input: string,
): Promise<OperationResult> {
  // TODO: implement-<feature>
  return { ok: false, error: "not implemented" };
}
```

**Config reader** (`src/config/loadConfig.ts`) — create this stub if not already present:
```ts
/** Reads config.json, overlays process.env, expands ${VAR} placeholders. */
export function loadConfig(): AppConfig {
  // TODO: implement-<feature>
  return {} as AppConfig;
}

export type AppConfig = Record<string, unknown>;
```

## Rules

- Stubs must be valid TypeScript syntax — `npx tsc --noEmit` exits 0 after this step.
- Do not write any business logic in this step — stubs only.
- Do not create files that are not in the approved plan.
- Always import `loadConfig` in stubs that will use config values — this ensures the import path resolves before implementation begins.
