---
name: implement-sso-auth
description: Implements SSO authentication — login trigger, redirect, callback validation, session creation. Use after scaffold-feature. All external values from loadConfig(); branch on auth.protocol (local|oidc), never vendor names.
---

# Implement SSO Auth

## Context

Read `.agents/features/sso-auth/CONTEXT.md` before writing any code.

## What this skill does

Fills scaffold stubs with a working SSO flow. Provider endpoints, scopes, callback path, and
session settings come from `loadConfig()`. Branch on `config.auth.protocol` (`local` | `oidc`) only.

---

## Step 0 — Ensure `src/config/loadConfig.ts` exists

If absent, create per `wire-demo-app/SKILL.md`. Export `AppConfig` and `loadConfig()`.
No module reads `config.json` or `process.env` directly except `loadConfig`.

---

## Implementation steps

### 1 — Login component (`src/components/auth/LoginButton.tsx`)

Single button calling `initiateAuth()`. No password fields.

### 2 — `initiateAuth()` (`src/lib/auth/sso.ts`)

- `local`: redirect to `${demo.baseUrl}${auth.callbackPath}?code=valid-demo-code`
- `oidc`: build URL from `auth.authorizationEndpoint` with standard OIDC params;
  `client_id` from `process.env.AUTH_CLIENT_ID`

### 3 — Callback handler (`src/api/auth/callback.ts`)

`handleAuthCallback({ code? })` → validate → session on success, 400 on failure.

### 4 — `validateAuthCallback()` (`src/lib/auth/sso.ts`)

Discriminated union `{ valid: true; subject } | { valid: false; error }`.

- `local`: reject empty, codes starting with `invalid`, or containing `tampered`
- `oidc`: POST to `auth.tokenEndpoint`, verify `id_token` via JWKS from `auth.jwksUri`

### 5 — Session (`src/lib/auth/session.ts`)

Cookie from `auth.session.cookieName` and `ttlSeconds`. HttpOnly, Secure, SameSite=Strict.

### 6 — Logger (`src/lib/auth/logger.ts`)

Structured failure log — no PII or token contents.

---

## Rules

- All config via `loadConfig()` — no hardcoded URLs or cookie names
- Branch on `auth.protocol`, never on "azure" / "okta" etc.
- Typed errors; no silent swallows
- Functions under ~30 lines where practical
- Satisfy MUST items in CONTEXT.md
