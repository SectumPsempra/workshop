# SSO Auth Demo

Minimal-HTML SSO authentication demo with Azure AD (OIDC) support and an offline local mode. Runs on **port 3001**.

## Architecture

```
src/
  config/loadConfig.ts        Runtime config reader (config.json + .env)
  lib/auth/sso.ts             initiateAuth + validateAuthCallback (local + oidc)
  lib/auth/session.ts         Session cookie builder
  lib/auth/logger.ts          Structured failure logger
  api/auth/callback.ts        handleAuthCallback HTTP handler
  components/auth/LoginButton.tsx
  demo/server.ts              Minimal-HTML demo server (npm run dev)
config.json                   Non-secret settings (committed)
.env.example                  Env var template — copy to .env and fill
```

## Test locally

### Option A — Offline local mode (no Azure credentials)

Set `"auth": { "protocol": "local" }` in `config.json`, then:

```bash
npm install
npm run dev
```

Open http://localhost:3001, click **Sign in with SSO** — completes immediately.

### Option B — Live Azure AD OIDC

1. Create an Azure App Registration with redirect URI `http://localhost:3001/auth/callback`
2. Copy `.env.example` to `.env` and fill:

```
AUTH_TENANT_ID=your-tenant-id
AUTH_CLIENT_ID=your-client-id
AUTH_CLIENT_SECRET=your-client-secret
```

3. Keep `"auth": { "protocol": "oidc" }` in `config.json`

```bash
npm install
npm run dev
```

Open http://localhost:3001 and sign in with Azure AD.

## Run checks

```bash
npm test
npm run build
npm run lint
```
