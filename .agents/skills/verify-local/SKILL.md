---
name: verify-local
description: Runs automated smoke tests against the local demo server. Run after write-tests and before run-acceptance-gate, only when demo.enabled is true in config.json. Skipped when demo is disabled; partial when the feature needs a live external service whose env keys are unfilled.
---

# Verify Local

## What this does

Starts the demo server, runs a small set of HTTP smoke checks to confirm the full request
path works end-to-end, then stops the server. Failures here are fixed before `run-acceptance-gate`
sees them.

When the feature has an **offline/local mode** (no external service required) — checks run
fully automated. When the feature calls a **live external service** whose credentials are not
filled in `.env`, automated checks cover the offline paths only; live interaction is documented
as a required manual step.

---

## When to run

Read `config.json`:
- `demo.enabled: true` → run this step.
- `demo.enabled: false`, absent, or key missing → **skip**, report "verify-local: SKIP (demo disabled)".

---

## Steps

### 1a — Check that .env will be loaded by the dev script

Read `.env.example`. Count non-comment, non-empty lines (i.e. declared env keys).

If any keys are declared:
- Read the `dev` script from `package.json`.
- If the script does NOT contain `--env-file` AND `src/demo/server.ts` does NOT import `dotenv`:
  - **FAIL immediately** — do not proceed to smoke checks. Report:

  ```
  verify-local: FAIL — .env will not be loaded at runtime.
    .env.example declares env keys but the dev script has no loading mechanism.

    Fix (choose one):
    A) Add --env-file=.env to the dev script in package.json:
       "dev": "node --env-file=.env --import tsx/esm src/demo/server.ts"
    B) Add `import 'dotenv/config'` as the first line of src/demo/server.ts

    Check is for the mechanism only — no env values are read or printed.
  ```

This check is feature-agnostic — it applies to any env keys in `.env.example`, not to a specific protocol or provider.

### 1b — Check required env keys are filled (advisory)

Read `.env`. For each key declared in `.env.example`, check whether it has a non-empty value.

If any keys are empty → set `loop_state.local_verify = SKIP_MANUAL` and output:

  ```
  verify-local: some env keys in .env are empty — automated smoke may be limited.
  Fill missing keys in .env, then run npm run dev to complete manual E2E.
  ```

  Continue to gate; gate will flag this as a SHOULD advisory (not a MUST block).

### 2 — Start demo server in background

```bash
npm run dev &
DEMO_PID=$!
sleep 2   # allow server startup
```

Read `config.json` for `demo.port` (default 3000).

### 3 — Smoke checks

Derive checks from the feature's acceptance criteria — one per observable behaviour. Run each
with `curl` (or Node `fetch`). All must pass. The checks below are the **shapes** to cover;
substitute the feature's real routes and inputs:

**Check 1 — Landing route returns 200:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/
# expect: 200
```

**Check 2 — Primary action with valid input succeeds:**
```bash
curl -s -o /dev/null -w "%{http_code}" -D - \
  "http://localhost:${PORT}/<action>?<valid-input>"
# expect: success status for the feature (e.g. 200 or 302 with expected headers)
```

**Check 3 — Invalid input returns a visible error:**
```bash
curl -s -o response.html -w "%{http_code}" \
  "http://localhost:${PORT}/<action>?<invalid-input>"
# expect: non-2xx, response body contains error text (no silent success)
```

**Check 4 — Missing input is handled:**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:${PORT}/<action>"
# expect: defined error status, not a crash
```

### 4 — Stop demo server

```bash
kill $DEMO_PID
```

### 5 — Report

Pass:
```
verify-local: PASS
  Check 1 — Landing route 200       PASS
  Check 2 — Valid input succeeds    PASS
  Check 3 — Invalid input error     PASS
  Check 4 — Missing input handled   PASS
```

Fail (any check):
```
verify-local: FAIL
  Check 2 — Valid input succeeds    FAIL
    expected: success status
    got:      400 — "input is missing."
```

Fix the failure, then re-run verify-local before proceeding to `run-acceptance-gate`.

### 6 — Update `loop_state`

```yaml
local_verify: PASS | SKIP | SKIP_MANUAL | FAIL
```

---

## Rules

- Stop the server after smoke checks even if a check fails — do not leave orphan processes.
- When the feature has an offline/local mode, its smoke checks must run fully automated with no env vars filled.
- Do not make live external-service requests in this step — that is a manual verification.
- A `SKIP_MANUAL` result does not block the gate — it becomes a SHOULD advisory.
- Fix all FAIL results before marking this step complete.
