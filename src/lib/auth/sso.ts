import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AppConfig } from "../../config/loadConfig.js";
import { loadConfig } from "../../config/loadConfig.js";

export type AuthValidationResult =
  | { valid: true; subject: string }
  | { valid: false; error: string };

/** Builds the authorization URL. Local mode returns a direct callback URL. */
export function buildAuthorizationUrl(config = loadConfig()): string {
  if (config.auth.protocol === "local") {
    return `${config.demo.baseUrl}${config.auth.callbackPath}?code=valid-demo-code`;
  }
  const url = new URL(config.auth.authorizationEndpoint ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env["AUTH_CLIENT_ID"] ?? "");
  url.searchParams.set(
    "redirect_uri",
    `${config.demo.baseUrl}${config.auth.callbackPath}`,
  );
  url.searchParams.set("scope", config.auth.scopes);
  return url.toString();
}

/** Redirects the browser to the configured identity provider. */
export function initiateAuth(config = loadConfig()): void {
  const authUrl = buildAuthorizationUrl(config);
  if (typeof window !== "undefined") {
    window.location.assign(authUrl);
  }
}

/** Exchanges an authorization code at the token endpoint. */
export async function exchangeCodeForTokens(
  code: string,
  config: AppConfig,
): Promise<{ id_token?: string; error?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env["AUTH_CLIENT_ID"] ?? "",
    client_secret: process.env["AUTH_CLIENT_SECRET"] ?? "",
    redirect_uri: `${config.demo.baseUrl}${config.auth.callbackPath}`,
  });
  const response = await fetch(config.auth.tokenEndpoint ?? "", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return { error: "Token exchange failed." };
  return response.json() as Promise<{ id_token?: string; error?: string }>;
}

/** Verifies an id_token via JWKS and returns the subject claim. */
export async function verifyIdToken(
  idToken: string,
  config: AppConfig,
): Promise<string> {
  const jwks = createRemoteJWKSet(new URL(config.auth.jwksUri ?? ""));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: config.auth.issuer,
    audience: process.env["AUTH_CLIENT_ID"],
  });
  if (!payload.sub) throw new Error("Missing subject in token payload.");
  return payload.sub;
}

function validateLocal(code: string): AuthValidationResult {
  if (code.startsWith("invalid") || code.includes("tampered")) {
    return { valid: false, error: "Unable to verify your sign-in. Please try again." };
  }
  return { valid: true, subject: "demo-user" };
}

async function validateOidc(
  code: string,
  config: AppConfig,
): Promise<AuthValidationResult> {
  try {
    const tokens = await exchangeCodeForTokens(code, config);
    if (tokens.error || !tokens.id_token) {
      return { valid: false, error: "Unable to verify your sign-in. Please try again." };
    }
    const subject = await verifyIdToken(tokens.id_token, config);
    return { valid: true, subject };
  } catch {
    return { valid: false, error: "Unable to verify your sign-in. Please try again." };
  }
}

/** Validates the authorization code from the IdP callback. */
export async function validateAuthCallback(
  code: string,
  config = loadConfig(),
): Promise<AuthValidationResult> {
  if (!code) return { valid: false, error: "Authorization code is missing." };
  if (config.auth.protocol === "local") return validateLocal(code);
  return validateOidc(code, config);
}
