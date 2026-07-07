---
name: write-tests
description: Writes unit and integration tests for the implemented feature. Use after implement-* is complete. Maps directly to the acceptance criteria from plan-task. All tests must pass before verify-local and run-acceptance-gate.
---

# Write Tests

## What this does

Writes tests that directly correspond to the acceptance criteria defined in `plan-task`.
Each criterion becomes at least one test. Tests must pass before the acceptance gate runs.

## Steps

1. **Read the acceptance criteria** from the `plan-task` output.
2. **Write one test per criterion** (minimum). Add edge cases where logic branches.
3. **Run the tests** and confirm they pass.
   ```bash
   npm test
   # or
   npx vitest run
   ```
4. Report: pass count, fail count. Fix any failures before proceeding.

## Mapping criteria to tests

Turn each acceptance criterion into at least one test. A useful general pattern:

| Criterion shape | Test shape |
|-----------------|------------|
| Happy path produces expected output | call with valid input → assert the successful result |
| Invalid input is rejected visibly | call with bad input → assert a typed error / non-2xx, no silent success |
| Missing input is handled | call with empty/absent input → assert a defined error result |
| Security/format invariants hold | assert required flags/headers/shape on the output |
| Errors don't leak internals | assert the error output does not contain raw input, secrets, or stack traces |
| Config comes from `loadConfig()` | assert the value used matches `loadConfig()`, not a hardcoded string |

## Test pattern

Substitute the feature's real functions and types — the structure below is the template:

```ts
import { describe, expect, it, vi } from "vitest";

describe("<feature>", () => {
  it("produces the expected result for valid input", async () => {
    const result = await performOperation("valid-input");
    expect(result.ok).toBe(true);
  });

  it("returns a visible error for invalid input", async () => {
    const result = await performOperation("invalid-input");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // error must not echo the raw input back
      expect(result.error).not.toContain("invalid-input");
    }
  });

  it("handles missing input", async () => {
    const result = await performOperation("");
    expect(result.ok).toBe(false);
  });

  it("reads configuration from loadConfig(), not hardcoded values", () => {
    // assert the value the code uses comes from loadConfig()
    expect(getEndpointUsed()).toBe(loadConfig().someFeature.endpoint);
  });
});
```

## Rules

- Tests live alongside the module they test (`*.test.ts` / `*.test.tsx`).
- No test logic in implementation files.
- All tests must pass before moving to `verify-local` or `run-acceptance-gate`.
- Do not mock away the core logic under test — only external I/O (network, filesystem, globals).
- Test that config values come from `loadConfig()` — not from hardcoded strings in the tested code.
