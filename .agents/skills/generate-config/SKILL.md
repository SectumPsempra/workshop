---
name: generate-config
description: Append-only config materialiser. Reads config_requirements from the approved plan, then writes missing keys to config.json and .env.example at the project root. Never overwrites existing values. Run after plan-task approval and before bootstrap-project / scaffold-feature.
---

# Generate Config

## What this does

Takes the `config_requirements` block from the approved plan and materialises the project's
configuration files at the repo root. It is **append-only**: if a key already exists it is
left untouched regardless of its value. This means a second task run adds new keys for the new
feature without disturbing anything the user already filled in.

The agent's knowledge of well-known external-service URL/endpoint patterns is applied
here — it is **not** stored in committed preset files. Service-specific template strings are
derived from the task description and written into `config.json` as `${ENV_VAR}` placeholder
values that `loadConfig()` expands at runtime.

---

## Inputs

Received from `loop_state`:

```
config_requirements:   list of keys produced by plan-task
task:                  original task description (used to infer provider URL templates)
feature:               resolved feature name
```

---

## Steps

### 1 — Read existing config files

```
Read config.json         → parse as JSON object (or {} if absent)
Read .env.example        → parse as key=value lines (or [] if absent)
Read .env                → parse as key=value lines (or [] if absent)
```

If `config.json` does not exist, treat it as `{}`.
If `.env.example` does not exist, treat it as empty.
If `.env` does not exist, treat it as empty.

### 2 — Evaluate each required key (append-only rule)

For every key in `config_requirements`:

```
if key exists in config.json with any value   → SKIP (log: "skipped — already in config.json")
if key is an env var AND exists in .env        → SKIP (log: "skipped — already in .env")
if key is an env var AND exists in .env.example → still append empty line to .env if absent

otherwise → APPEND with safe default or empty string
```

**Safe defaults** (only appended, never overwritten):

| Key pattern | Default value |
|-------------|---------------|
| `demo.enabled` | `false` (unless the plan requests a demo) |
| `demo.port` | `3000` |
| `demo.baseUrl` | `"http://localhost:3000"` |
| Any key the plan supplies an explicit default for | that default |
| All other keys | `""` (empty string) |

Feature-specific defaults (paths, timeouts, flag names, etc.) come from the plan's
`config_requirements` block — they are **not** hardcoded in this skill. This keeps the skill
feature-agnostic: it materialises whatever the plan declares.

Never append real secrets, tokens, account IDs, client IDs, or client secrets — those go in
`.env` with empty values for the user to fill.

### 3 — Infer external-service config from task text (agent knowledge only)

When the plan declares a key whose value is `"inferred from task"` and the task names a
well-known external service, use your own knowledge of that service's public API/endpoint
conventions to fill the value. Write it as a `${ENV_VAR}` placeholder for any part that
depends on a user-specific account, region, tenant, or domain, and declare that env var in
`.env.example`.

General rules (service-agnostic):

- **Stable, public endpoints** → write the literal URL into `config.json`.
- **Account/tenant/region/domain-specific parts** → parameterise with `${ENV_VAR}` and add the
  var to `.env.example` (empty value).
- **Credentials (client IDs, secrets, API keys, tokens)** → never inline; add empty entries to
  `.env.example` / `.env`.
- **Unknown or unnamed service** → leave the endpoint keys as empty strings for the user to fill.

Example (illustrative only — the same pattern applies to any provider): a task naming a
hosted service whose base differs per account becomes
`"endpoint": "https://${SERVICE_DOMAIN}/v1/resource"` in `config.json`, with `SERVICE_DOMAIN=`
added to `.env.example`.

These template strings are written to `config.json`. The application resolves them at runtime via
`loadConfig()` by expanding `${VAR}` placeholders from `process.env` / `.env`.

### 4 — Update `.gitignore`

If `.gitignore` exists and does not already contain `.env`, append:

```
.env
```

If `.gitignore` does not exist, create it with `.env` as the first line.

### 5 — Write files

Write the updated `config.json` (pretty-printed, 2-space indent).
Append new lines to `.env.example`.
Append new empty lines to `.env` for any secret keys not already present.

### 6 — Update `loop_state`

```yaml
config_keys_added:    [list of keys just appended]
config_keys_skipped:  [list of keys already present]
```

### 7 — Report to user

```
generate-config complete.

  config.json  — X keys added, Y skipped
  .env.example — X lines added
  .env         — X lines added (empty values, user must fill before live use)

  Keys the user MUST fill before running against a live external service:
  - [each empty secret / account-specific env var]

  Safe to proceed — anything not requiring a live service will run without filling these.
```

---

## Output format for `config_requirements` in plan-task

`plan-task` must emit this block. `generate-config` reads it. The keys are whatever the
feature needs — the example below is illustrative, not a fixed schema:

```
## config_requirements
- config.json  demo.enabled                 boolean   true
- config.json  demo.port                    number    3000
- config.json  <feature>.endpoint           url       (inferred from task)
- config.json  <feature>.timeoutMs          number    5000
- config.json  <feature>.<flag>             boolean   false
- env          <SERVICE>_API_KEY            secret    user fills
- env          <SERVICE>_DOMAIN             param     user fills (account-specific)
- env          GIT_REMOTE                   string    user fills
```

`config.json` keys are for non-secret settings. `env` keys go to `.env.example` and `.env`.
Secrets and account-specific values always go to `env`, never to `config.json`.

---

## Rules

- **Append-only.** Never read the current value of an existing key and overwrite it.
- **No secrets in `config.json`.** All sensitive values go in `.env`.
- **No committed `.env` file.** Only `.env.example` is committed.
- **No `.agents/providers/` folder.** Provider knowledge lives in this skill's Step 3 only.
- **Template strings in `config.json` use `${ENV_VAR}` syntax** — resolved at runtime by `loadConfig()`.
- **Run after plan approval, before `bootstrap-project` and `scaffold-feature`.**
