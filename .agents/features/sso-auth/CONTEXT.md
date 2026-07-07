# Feature Context: SSO Authentication

> This file is the domain context for the `implement-sso-auth` skill.
> Read it alongside `.agents/skills/implement-sso-auth/SKILL.md`.

---

## What This Feature Does

SSO-only authentication via an external identity provider (Azure AD in this task). A user clicks
a login control, is redirected to the IdP, and on successful verification returns to the app with
an active session. No local passwords. All provider values come from `config.json` + `.env` via
`loadConfig()`. Code branches on `auth.protocol` (`local` offline mode | `oidc` live) — never on
a vendor name.

---

## Flow

```
User clicks login control
       │
       ▼
  initiateAuth()         → reads config.auth.protocol
       │
  ┌────┴────┐
local      oidc
  │          │
  │          ▼
  │   redirect to config.auth.authorizationEndpoint
  │          │  [IdP verifies identity]
  └────┬─────┘
       ▼
  /auth/callback         → receives authorization code
       │
       ▼
  validateAuthCallback() → local: check demo code | oidc: token exchange + JWKS
       │
    ┌──┴──┐
  valid  invalid
    │       │
    ▼       ▼
  create   show error    → structured log, no PII
  session
    │
    ▼
  signed in → /dashboard
```

---

## Acceptance Criteria

| # | Criterion | Type | Scope |
|---|-----------|------|-------|
| 1 | Login control initiates auth redirect | MUST | library |
| 2 | Callback validates before creating a session | MUST | library |
| 3 | Invalid/missing input shows visible error, no session | MUST | library |
| 4 | Session cookie is HttpOnly, Secure, SameSite=Strict | MUST | library |
| 5 | All URLs, cookie names, TTLs from loadConfig() | MUST | library |
| 6 | No password fields in the auth flow | MUST | library |
| 7 | Tests cover valid, invalid, and missing callback input | MUST | library |
| 8 | Errors do not expose tokens or stack traces | MUST | library |
| 9 | Developer can run npm run dev and complete flow in browser | MUST | when demo.enabled |
| 10 | .env gitignored; .env.example lists required keys | MUST | when demo.enabled |

---

## Config keys

`config.json` (committed, non-secrets):

```json
{
  "demo": { "enabled": true, "port": 3001, "baseUrl": "http://localhost:3001" },
  "auth": {
    "protocol": "oidc",
    "callbackPath": "/auth/callback",
    "scopes": "openid profile email",
    "authorizationEndpoint": "https://login.microsoftonline.com/${AUTH_TENANT_ID}/oauth2/v2.0/authorize",
    "tokenEndpoint": "https://login.microsoftonline.com/${AUTH_TENANT_ID}/oauth2/v2.0/token",
    "jwksUri": "https://login.microsoftonline.com/${AUTH_TENANT_ID}/discovery/v2.0/keys",
    "issuer": "https://login.microsoftonline.com/${AUTH_TENANT_ID}/v2.0",
    "session": { "cookieName": "app_session", "ttlSeconds": 28800 }
  }
}
```

`.env` (gitignored, user fills):

```
AUTH_TENANT_ID=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=
GIT_REMOTE=
```

---

## Extensibility Notes

```ts
// EXTEND: multiple IdP configs with runtime selection
// EXTEND: distributed session store (Redis)
// EXTEND: role claims from id_token for RBAC
// EXTEND: PKCE for public clients
```

---

## Out of Scope

- Azure App Registration setup (documented in README)
- SAML IdPs, multi-provider picker, token refresh
- Live Azure E2E in CI (unit tests mock OIDC)

---

## References

- `.agents/skills/implement-sso-auth/SKILL.md`
- `.agents/skills/generate-config/SKILL.md`
- `.agents/skills/wire-demo-app/SKILL.md`
