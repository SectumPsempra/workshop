---
name: plan-task
description: Converts a task description into a concrete implementation plan. Use at the start of every task loop before writing any code. Outputs the files to touch, the data/UI model, the acceptance criteria, and the config_requirements block consumed by generate-config.
---

# Plan Task

## What this does

Turns a raw task description into a structured, reviewable plan. Nothing is built until the
plan exists and is approved.

## Steps

1. **Restate the task in one sentence.** If the task is ambiguous, ask one clarifying question before proceeding.

2. **Identify the entities and dependencies.**
   - List every data entity involved (e.g. `User`, `Order`, `Report`).
   - List every UI surface or interface (e.g. a component, an endpoint, a CLI command).
   - Note dependencies between them.

3. **Determine project state.**
   - Check for `package.json` at the project root. If absent → flag "greenfield: yes" for `bootstrap-project`.
   - Check for `config.json`. If absent → it will be created by `generate-config`.

4. **Infer config requirements from the task description.**
   - Is a demo app wanted? (Does the task mention "runnable", "browser", "local", "demo"?) → include `demo.*` keys.
   - Does the task integrate with an external service (any API, IdP, database, queue, etc.)? → add the endpoint/URL keys (as `${ENV_VAR}` placeholders where account-specific) plus the credential env vars.
   - No external service? → keep config minimal; no service keys needed.
   - Derive the minimal set of `config.json` keys and env vars the feature needs.

5. **List the files to create or modify.** Paths follow the feature — the list below is an illustration, not a fixed layout:
   ```
   CREATE  src/<area>/<Component>.tsx      ← UI surfaces, if any
   CREATE  src/lib/<feature>/<module>.ts   ← business logic
   CREATE  src/api/<feature>/<handler>.ts  ← request handlers, if any
   CREATE  src/config/loadConfig.ts        ← always for any feature using config
   CREATE  src/lib/<feature>/<module>.test.ts
   MODIFY  README.md                       ← only when demo.enabled
   CREATE  src/demo/server.ts              ← only when demo.enabled (wire-demo-app handles this)
   ```

6. **Write acceptance criteria** (3–7 items for a demo task).
   - Each item is a boolean: it is either met or it is not.
   - Include a criterion for demo runability when demo requested: "Developer can run `npm run dev` and exercise the feature in a browser."

7. **State what is explicitly out of scope** to prevent scope creep.

## Output format

```
## Task
[One-sentence restatement]

## Entities
- [Entity]: [what it represents]

## Greenfield
yes | no

## Files
CREATE/MODIFY  [path]  — [why]

## Acceptance criteria
- [ ] [criterion]

## Out of scope
- [item]

## config_requirements
- config.json  [key.path]   [type]    [default or "inferred from task"]
- env          [ENV_VAR]    [type]    [description]
```

### Example `config_requirements` block — feature integrating an external service, with demo

The keys are whatever the feature needs. The block below is illustrative only:

```
## config_requirements
- config.json  demo.enabled                boolean   true
- config.json  demo.port                   number    3000
- config.json  demo.baseUrl                string    http://localhost:3000
- config.json  <feature>.endpoint          url       inferred from task
- config.json  <feature>.timeoutMs         number    5000
- config.json  <feature>.<flag>            boolean   false
- env          <SERVICE>_API_KEY           secret    user fills
- env          <SERVICE>_DOMAIN            param     user fills (account-specific)
- env          GIT_REMOTE                  string    user fills
```

### Example `config_requirements` block — self-contained feature (no external service, no demo)

```
## config_requirements
- config.json  <feature>.<setting>         string    <default>
- env          GIT_REMOTE                  string    user fills
```

## Rules

- Do not propose any code in this step — only the plan.
- If the task touches more than 7 files, flag it for splitting before proceeding.
- `config_requirements` must be in the output — `generate-config` depends on it.
- Do not reference `.agents/providers/` or any committed preset folder.
- Present the plan and wait for approval before moving to `generate-config`.
