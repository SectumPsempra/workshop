---
name: create-pr
description: 'Create a pull request for this repository. Use when asked to: create PR, open PR, push and create PR, submit PR, open pull request, send changes for review.'
---

# Create PR

## What this does

Takes gate-cleared work and ships it: commit → push → open PR. The PR description is
structured so any reviewer (human or agent) can understand the change without reading the
full diff.

## Example requests

- "Create a PR for this change"
- "Push and open a pull request"
- "Submit a PR with these fixes"
- "Open a PR against the main branch"

## Prerequisites

Before starting:

1. **Check `gh` CLI**: run `gh --version`. If missing, stop and tell the user to install
   it from https://cli.github.com/.

2. **Check authentication**: run `gh auth status`. If not authenticated, stop and tell the
   user to run `gh auth login`.

3. **Check git remote**: read `GIT_REMOTE` from `.env` or `config.json`.
   - If empty or absent → stop with this message:
     ```
     create-pr blocked: GIT_REMOTE is not set.
     Set it in .env:  GIT_REMOTE=git@github.com:org/repo.git
     Then re-run task2pr or set the remote manually:
       git remote add origin <url>
     ```

## Procedure

### 1. Prepare the branch

- Confirm the current branch name: `git branch --show-current`.
- Ensure changes are committed (`git status` should show a clean working tree).
- Determine the remote URL from `GIT_REMOTE` in `.env` / `config.json`. If no remote is
  configured yet, add it: `git remote add origin $GIT_REMOTE`.
- Push the branch: `git push -u origin <branch-name>`.
  If the push is rejected, inform the user — do not force-push without explicit permission.

### 2. Determine PR metadata

- **Head branch**: current branch.
- **Base branch**: `main` (or `master` if main does not exist). Override if the user specifies.
- **Title**: concise summary of the change in conventional-commit format, e.g.
  `feat(<scope>): add <capability>`.
- **Labels**: use `breaking-change` only when the PR changes a public API shape or
  fundamentally breaks an existing scenario. Do not use it for new features or bug fixes.

### 3. Detect non-trivial UI changes

Check the diff for changes to:
- `src/components/` — React components altering layout or interactive behaviour
- `src/demo/` — demo server routes or rendered HTML

If non-trivial UI changes are detected, add a `### Screenshots / Recordings` section in
the PR body:

```markdown
### Screenshots / Recordings

> **This PR includes UI changes.** Please add screenshots or screen recordings so reviewers
> can evaluate the visual changes without running locally.
```

### 4. Build PR body from template

- Read `.github/pull_request_template.md`.
- Use the template structure as the PR body.
- Fill `## Description` with:
  - **Why** the change matters (user problem or compliance driver).
  - **What** the user can now do (behaviour summary before implementation details).
  - Implementation details concisely after the behaviour summary.
- When `loop_state.demo_wired` is `true`, add a `### Test locally` subsection:

```markdown
### Test locally

1. Fill `.env` (copy from `.env.example`) with any keys the feature requires.
   If the feature has an offline mode, it runs without filling these.

2. Run the demo:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000 and exercise the feature.

3. Run tests:
   ```bash
   npm test
   ```
```

- Include `### Security considerations` only when the change introduces network listeners,
  authentication changes, secrets handling, or elevated permissions.
- Fill checklist choices from known facts; leave genuinely unknown items unchecked.
- Write the body to `pr-body.md` in the repo root.

### 5. Create the PR

```bash
GH_PAGER=cat gh pr create \
  --base main \
  --head <branch-name> \
  --title "<pr-title>" \
  --body-file pr-body.md
```

### 6. Handle existing PRs

If a PR already exists for the branch:
- Do not create another.
- Update the body if it still contains unfilled template text:
  ```bash
  GH_PAGER=cat gh pr edit <pr-number-or-url> --body-file pr-body.md
  ```
- Return the existing PR URL.

### 7. Clean up

Delete the temporary body file after the PR is created or updated:
```bash
rm pr-body.md
```

## Error handling

| Error | Action |
|-------|--------|
| `gh: command not found` | Tell the user to install `gh` from https://cli.github.com/ |
| `gh auth` not logged in | Tell the user to run `gh auth login` |
| `GIT_REMOTE` empty | Stop with the message in Prerequisites step 3 |
| `git push` rejected | Inform the user; do not force-push |
| PR already exists | Follow step 6 above |

## Notes

- Always use the `.github/pull_request_template.md` template — do not bypass it.
- If the user asks to preview before creating, show the prepared PR body first.
