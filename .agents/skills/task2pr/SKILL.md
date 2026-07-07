---
name: task2pr
description: Orchestrates the full task-to-PR loop. Use when given any task description to implement. Accepts a task and an optional feature type, routes to the correct implement-* skill, and drives the loop from planning through PR creation. Use this as the single entry point for any new task.
disable-model-invocation: false
---

# Task2PR — Orchestrator

The single command that runs the full loop. You receive a task; this skill drives it to a merged PR.

## Invocation

The user (or CI) provides:

```
task:    [natural language description of what to build]
feature: [optional — e.g. payment-flow, user-profile, search-index]
         If omitted, infer from the task description.
```

Example:
```
task:    Add a CSV export endpoint for reports
feature: report-export
```

---

## The Loop

Execute these steps **in order**. Read the skill file before executing each step. Do not skip.

```
┌─────────────────────────────────────────────────────────────────┐
│  TASK2PR LOOP                                                   │
│                                                                 │
│  0.    Route             → identify the implement-* skill       │
│  1.    plan-task         → plan, config_requirements, criteria  │
│           ↓ [wait for approval]                                 │
│  1.25  generate-config   → append-only config.json + .env      │
│  1.5   bootstrap-project → if greenfield (no package.json)     │
│  2.    scaffold-feature  → typed stubs, compiles clean         │
│  3.    implement-*       → working code, TODOs replaced         │
│  3.5   wire-demo-app     → if config.demo.enabled               │
│  4.    write-tests       → tests mapped to acceptance criteria  │
│  4.5   verify-local      → if config.demo.enabled               │
│  5.    run-acceptance-gate → PASS or ESCALATE (max 3 cycles)   │
│           ↓ [only if PASS]                                      │
│  6.    create-pr         → commit + branch + PR                 │
│           ↓                                                     │
│  OUTPUT: PR URL                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 0 — Route to the right implement-* skill

Before planning, identify which `implement-*` skill handles this task.

**Known feature skills:**

| Feature keyword | Skill to use | Skill path |
|-----------------|--------------|------------|
| _(none shipped by default — rows are added as features are built)_ | `implement-<feature>` | `.agents/skills/implement-<feature>/SKILL.md` |

`implement-*` skills are **generated per feature** by the resolution chain below and are not
part of the base platform. The base ships with zero feature skills.

**If no match is found, run this resolution chain — do not stop:**

**Step 0.1 — check for the implement skill**
- Look for `.agents/skills/implement-<feature>/SKILL.md`.
- If it exists → routing is resolved. Proceed to Step 1.

**Step 0.2 — check for feature context**
- If the skill does not exist, look for `.agents/features/<feature>/CONTEXT.md`.
- If it exists → skip to Step 0.4.

**Step 0.3 — run grill-me to build the context**
- If neither the skill nor the context file exists, read and execute `.agents/skills/grill-me/SKILL.md`.
- Pass it the feature name and the original task description.
- The grill-me skill will ask clarifying questions and produce the feature's domain context.
- Save the output to `.agents/features/<feature>/CONTEXT.md`. Create the directory if it does not exist.
- Do not proceed until `.agents/features/<feature>/CONTEXT.md` is written.

**Step 0.4 — generate the implement skill from context**
- Read `.agents/features/<feature>/CONTEXT.md`.
- Synthesise a `.agents/skills/implement-<feature>/SKILL.md` from it, following the same structure as existing implement skills (frontmatter, What this skill does, Implementation steps, Rules).
- Add a row to the routing table above for the new feature.
- Routing is now resolved. Proceed to Step 1.

---

## Step 1 — plan-task

Read `.agents/skills/plan-task/SKILL.md` and execute it against the task description.

The plan output **must** include a `config_requirements` block (see `plan-task` for format).

**Checkpoint — wait for approval before continuing.**

Do not proceed to Step 1.25 until the plan is explicitly approved. If the plan is rejected, revise and re-present.

---

## Step 1.25 — generate-config

Read `.agents/skills/generate-config/SKILL.md` and execute it.

Pass in:
- `loop_state.task` (for inferring external-service config from the task text)
- `loop_state.plan.config_requirements`

This step writes `config.json` and `.env.example` (append-only). Update `loop_state.config_keys_added`
and `loop_state.config_keys_skipped` with the result.

---

## Step 1.5 — bootstrap-project (conditional)

Check for `package.json` at the project root.

- **Absent** → Read `.agents/skills/bootstrap-project/SKILL.md` and execute it.
- **Present** → Skip this step.

---

## Step 2 — scaffold-feature

Read `.agents/skills/scaffold-feature/SKILL.md` and execute it using the file list from the approved plan.

Confirm the project compiles with zero errors before continuing.

---

## Step 3 — implement-*

Read the routed `.agents/skills/implement-<feature>/SKILL.md` (identified in Step 0) and execute it.

Pass in:
- The approved plan from Step 1
- The scaffolded file stubs from Step 2
- `loop_state.config_keys_added` (so the skill knows which config keys are now available)

---

## Step 3.5 — wire-demo-app (conditional)

Read `config.json` at the project root.

- `demo.enabled: true` → Read `.agents/skills/wire-demo-app/SKILL.md` and execute it.
- Otherwise → Skip. Set `loop_state.demo_wired = false`.

---

## Step 4 — write-tests

Read `.agents/skills/write-tests/SKILL.md` and execute it.

Pass in:
- The acceptance criteria from Step 1
- The implemented files from Step 3

All tests must pass before Step 4.5.

---

## Step 4.5 — verify-local (conditional)

Read `config.json` at the project root.

- `demo.enabled: true` → Read `.agents/skills/verify-local/SKILL.md` and execute it.
- Otherwise → Skip. Set `loop_state.local_verify = SKIP`.

---

## Step 5 — run-acceptance-gate

Read `.agents/skills/run-acceptance-gate/SKILL.md` and evaluate the full MUST checklist.

| Gate result | Action |
|-------------|--------|
| **PASS** | Continue to Step 6 |
| **ESCALATE** (after 3 cycles) | Stop. Report exact failing items + proposed fixes. Do not proceed to Step 6. |

---

## Step 6 — create-pr

Read `.agents/skills/create-pr/SKILL.md` and execute it.

The PR body must include:
- The task description (verbatim)
- The acceptance criteria from Step 1 with pass/fail status
- The gate result (cycles used)
- "Test locally" section when `loop_state.demo_wired = true`

**Return the PR URL as the final output of the loop.**

---

## State tracking

Carry this state object through all steps:

```
loop_state:
  task:                  [original task description]
  feature:               [resolved feature name]
  implement_skill:       [path to the implement-* skill]
  plan:                  [output of plan-task, including config_requirements]
  config_keys_added:     [list from generate-config]
  config_keys_skipped:   [list from generate-config — already present]
  files_created:         [list from scaffold-feature]
  demo_wired:            true | false
  local_verify:          PASS | SKIP | SKIP_MANUAL | FAIL
  gate_result:           PASS | ESCALATE
  gate_cycles:           [1–3]
  pr_url:                [final output]
```

---

## Adding a new feature to the loop

1. Create `.agents/skills/implement-<feature>/SKILL.md`.
2. Create `.agents/features/<feature>/CONTEXT.md` with domain context and flow.
3. Add a row to the routing table in Step 0 above.
4. Re-run `task2pr` with the new feature — the rest of the loop is unchanged.
