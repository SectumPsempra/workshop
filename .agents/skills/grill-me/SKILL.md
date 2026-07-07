---
name: grill-me
description: Builds a CONTEXT.md for an unknown feature by asking structured clarifying questions. Invoked by task2pr Step 0.3 when neither the implement skill nor the feature context file exists. Outputs a complete .agents/features/<feature>/CONTEXT.md that task2pr can use to synthesise the implement skill.
---

# Grill-Me — Feature Context Builder

You were called because neither `.agents/skills/implement-<feature>/SKILL.md` nor
`.agents/features/<feature>/CONTEXT.md` exists for this feature. Your job is to interview
for the missing context, then write the file so the loop can continue.

---

## Inputs you receive

```
feature:  [feature name, e.g. "payment-flow"]
task:     [original task description from the user]
```

---

## Phase 1 — Ask the questions

Present all questions in a **single message**. Do not ask them one at a time. Number them so
the user can answer by number.

Use this exact question set, substituting `<feature>` with the actual feature name:

---

**Grill-me: building context for `<feature>`**

I need to understand this feature before building it. Please answer the questions that apply — skip any that are not relevant.

```
1. What does this feature do in one sentence?
   (What problem does it solve, from the user's point of view?)

2. Why does it exist?
   (Business or compliance reason — what breaks or is missing without it?)

3. Walk me through the happy path, step by step.
   (Who does what, what happens next, where does it end?)

4. What are the known failure or edge cases?
   (What can go wrong? What should happen in each case?)

5. What are the hard rules — things the implementation MUST do or MUST NOT do?
   (e.g. "must not store PII", "must use the existing session service")

6. What are the advisory rules — things it SHOULD do but won't block shipping?
   (e.g. "should log all state transitions")

7. What config values or env vars will this feature need?
   (e.g. endpoints, timeouts, cookie names, flags — anything that should not be inline)

8. What extensibility should we plan for but not build now?
   (Things a future engineer should be able to add without rewriting the core)

9. What is explicitly out of scope for this implementation?
   (Features or concerns this PR deliberately does not address)

10. Is there an existing file, doc, or design spec I should read?
    (Path in the repo, Confluence page, Notion doc, Figma link — anything)

11. Is this a greenfield project or does a codebase already exist?
    (Helps determine whether bootstrap-project is needed)

12. Should this feature include a runnable local demo?
    (Adds a dev server, login page, and README test steps — opt-in)

13. Which external service or provider does this feature integrate with, if any?
    (e.g. a payment API, an identity provider, a database, a message queue — or "none")
    This drives the config keys generated, not a separate implement skill.
```

---

## Phase 2 — Validate the answers

Before writing the file, confirm one thing:

- If any **MUST** criterion from answer 5 is ambiguous or contradicts another answer, surface
  the conflict and ask for a decision. Do this in a single follow-up, not question-by-question.
- If answer 3 (happy path) is missing, do not proceed — it is required for the flow diagram.

If everything is sufficient, say:

> "I have enough to write the context. Proceeding."

---

## Phase 3 — Write `.agents/features/<feature>/CONTEXT.md`

Produce the file using this exact structure. Every section is required; write "None identified" only if genuinely nothing applies.

```markdown
# Feature Context: <Feature Name>

> This file is the domain context for the `implement-<feature>` skill.
> Read it alongside `.agents/skills/implement-<feature>/SKILL.md`.

---

## What This Feature Does

[One paragraph. Plain language. What it does, why it exists, who uses it.]

---

## Flow

[ASCII diagram of the happy path. Model it on the example below.
Use │ ▼ ┌ ┐ └ ┘ ─ for lines. Every decision point gets a branch.]

\```
[trigger]
       │
       ▼
  [action()]     → [what it produces]
       │
    ┌──┴──┐
  [yes]  [no]
    │       │
    ▼       ▼
 [outcome] [outcome]
\```

---

## Acceptance Criteria

| # | Criterion | Type | Scope |
|---|-----------|------|-------|
| 1 | [criterion] | MUST | library |
| 2 | [criterion] | MUST | when demo.enabled |
| … | … | SHOULD | library |

(MUST = blocks shipping. SHOULD = advisory. Scope = library or when demo.enabled.)

---

## Config keys

`config.json` (committed, non-secrets):
\```json
{
  "[feature-namespace]": {
    "[key]": "[default or empty]"
  }
}
\```

`.env` (gitignored, user fills):
\```
ENV_VAR_NAME=    # description
\```

(Set by `generate-config` during the task2pr loop. User fills `.env` before running live.)

---

## Extensibility Notes

\```ts
// EXTEND: [what a future engineer should be able to add and where]
\```

---

## Out of Scope

- [item explicitly excluded from this implementation]

---

## References

- [Path, URL, or doc title — or "None"]
```

---

## Phase 4 — Save and report

1. Write the file to `.agents/features/<feature>/CONTEXT.md`. Create the directory if it does not exist.
2. Report back to `task2pr`:

```
grill-me complete.
  feature:        <feature>
  context:        .agents/features/<feature>/CONTEXT.md
  greenfield:     yes | no
  demo.enabled:   yes | no
  provider:       <external service or "none">
  MUST criteria:  <count>
  Ready for Step 0.4 → implement skill synthesis.
```

---

## Rules

- Ask all questions in one message — never drip-feed them one at a time.
- Do not start writing the file until Phase 2 validation passes.
- Do not invent acceptance criteria — only write what the user confirmed.
- Do not proceed if the happy-path flow (question 3) was not answered.
- Do not reference or create `.agents/providers/` or any preset folder.
- The output file must be self-contained: a future agent with no conversation history must be able to read it and know exactly what to build.
