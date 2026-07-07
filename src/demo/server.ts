import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { loadConfig } from "../config/loadConfig.js";
import { logAuthFailure } from "../lib/auth/logger.js";
import { createSession } from "../lib/auth/session.js";
import { buildAuthorizationUrl, validateAuthCallback } from "../lib/auth/sso.js";

const config = loadConfig();
const PORT = config.demo.port;

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 380px; margin: 80px auto; padding: 0 1rem; color: #1e293b; }
    h1 { font-size: 1.4rem; margin: 0 0 .5rem; }
    p { color: #64748b; margin: .25rem 0 1rem; }
    button { padding: .7rem 1.3rem; font-size: 1rem; border: 0; border-radius: 8px; background: #4f46e5; color: #fff; cursor: pointer; }
    a { color: #4f46e5; }
    code { background: #eef2ff; color: #4338ca; padding: 1px 6px; border-radius: 6px; font-size: .85em; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", config.demo.baseUrl);

  if (url.pathname === "/" || url.pathname === "/login") {
    const authUrl = buildAuthorizationUrl(config);
    const mode =
      config.auth.protocol === "local"
        ? "offline local mode — no credentials needed"
        : "live identity provider (from config)";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      page(
        "Sign in",
        `<h1>Sign in</h1>
  <p>Use your organisational account.</p>
  <a href="${authUrl}"><button>Sign in with SSO</button></a>
  <p style="margin-top:1.5rem;font-size:.8rem">Protocol: <code>${config.auth.protocol}</code> — ${mode}</p>`,
      ),
    );
    return;
  }

  if (url.pathname === config.auth.callbackPath) {
    void handleCallback(url, res);
    return;
  }

  if (url.pathname === "/dashboard") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      page(
        "Dashboard",
        `<h1>Signed in ✓</h1>
  <p>You are authenticated.</p>
  <a href="/">Back to login</a>`,
      ),
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page("Not found", `<h1>404</h1><p>Not found.</p><a href="/">Home</a>`));
}

async function handleCallback(url: URL, res: ServerResponse): Promise<void> {
  const code = url.searchParams.get("code") ?? "";
  const result = await validateAuthCallback(code, config);

  if (!result.valid) {
    logAuthFailure(result.error);
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      page(
        "Sign-in failed",
        `<h1>Sign-in failed</h1><p>${result.error}</p><a href="/">Try again</a>`,
      ),
    );
    return;
  }

  const session = createSession(result.subject);
  res.writeHead(302, { Location: "/dashboard", "Set-Cookie": session.cookie });
  res.end();
}

createServer(handle).listen(PORT, () => {
  console.log(`\nSSO demo running at http://localhost:${PORT}`);
  console.log(`  Login:     http://localhost:${PORT}/`);
  console.log(`  Callback:  http://localhost:${PORT}${config.auth.callbackPath}`);
  console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
  if (config.auth.protocol === "oidc") {
    console.log(`\n  OIDC mode — fill .env with the provider params referenced by config.json`);
  } else {
    console.log(`\n  Local mode — click Sign in to complete the flow offline.`);
  }
});
