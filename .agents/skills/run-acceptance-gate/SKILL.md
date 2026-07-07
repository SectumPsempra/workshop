---
name: run-acceptance-gate
description: Evaluates the acceptance gate checklist before any commit. Use after write-tests (and verify-local when demo.enabled). Blocks shipping if any MUST item is false. Runs the bounded fix loop (max 3 cycles) then either clears for commit or escalates.
---

# Run Acceptance Gate

## What this does

Runs a deterministic checklist before any commit is made. Every MUST item must be `true`.
This is what makes the agent loop safe — it cannot ship broken code because the gate is the
only path to the commit step.

## The gate (copy this and evaluate each item)

```
Acceptance Gate — evaluate each MUST item as TRUE or FALSE

MUST (blocking — all must be true before commit):
[ ] Builds/compiles with zero errors       → npx tsc --noEmit
[ ] All tests pass                         → npm test
[ ] Linter passes with zero errors         → npx eslint src/
[ ] No secrets in the diff                 → grep -r "sk-\|password\|secret" src/
[ ] No environment-specific values hardcoded in src/ → URLs, endpoints, ports, keys all from loadConfig()
[ ] generate-config was append-only        → no pre-existing keys overwritten in config.json diff
[ ] .env not committed; .env.example lists all new keys
[ ] Application branches on config values, not on hardcoded vendor/environment names
[ ] Commit message follows Conventional Commits with scope
[ ] Every public function has a one-line description
[ ] Every error path is handled or explicitly propagated
[ ] Diff is scoped to one feature

MUST (blocking — only when demo.enabled in config.json):
[ ] Local demo smoke passes                → verify-local result is PASS (or SKIP_MANUAL)
[ ] README documents local test steps      → section exists with env vars and npm run dev
[ ] npm run dev script exists in package.json
[ ] dev script loads .env (when .env.example has keys)
    → read .env.example — count non-comment, non-empty lines
    → if any exist: package.json dev script must contain --env-file
                    OR src/demo/server.ts must contain dotenv
    → check the mechanism only — do NOT read or print any env values

SHOULD (advisory — does not block, but flag for review):
[ ] Names read in plain domain language
[ ] Functions are right-sized (no 100-line functions)
[ ] No obvious duplication
[ ] Comments explain why, not what
[ ] All keys declared in .env.example have non-empty values in .env (flag if any empty — manual E2E needed)
```

## Bounded fix loop

```
Evaluate MUST checklist
      │
   all TRUE?
   ┌───┴───┐
  YES      NO  (cycle 1)
   │       │
   ▼       ▼
 PASS   targeted fix → re-evaluate (cycle 2)
              │
           all TRUE?
           ┌───┴───┐
          YES      NO  (cycle 3)
           │       │
           ▼       ▼
         PASS   targeted fix → re-evaluate (final)
                      │
                   all TRUE?
                   ┌───┴───┐
                  YES      NO
                   │       │
                   ▼       ▼
                 PASS   ESCALATE — stop, do not commit
```

**Hard bound: 3 evaluation cycles.** If MUST is still failing after the third cycle, stop,
do not commit, and report:
- Which MUST items are still false
- The exact diff/error for each
- A proposed fix (for human review)

## Output format

```
## Acceptance Gate Result: PASS / ESCALATE

### MUST items
- [x] Builds with zero errors
- [x] All tests pass
- [ ] Linter passes — 2 errors in src/lib/<feature>/<module>.ts (lines 14, 22)
...

### SHOULD items
- [x] Names are plain domain language
- [ ] performOperation() is 35 lines — consider splitting

### Cycles used: 1 / 3
```

## Rules

- Never commit before this gate runs.
- Never modify CI configuration to make failures pass.
- A SHOULD item never blocks the gate — it is advisory only.
- On ESCALATE, surface the exact failing items. Do not guess or paper over them.
- `SKIP_MANUAL` from `verify-local` is a SHOULD advisory, not a MUST block.
