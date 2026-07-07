import { logAuthFailure } from "../../lib/auth/logger.js";
import { createSession } from "../../lib/auth/session.js";
import { validateAuthCallback } from "../../lib/auth/sso.js";

export type AuthCallbackRequest = { code?: string };

export type AuthCallbackResponse =
  | { status: 302; location: string; headers: Record<string, string> }
  | { status: 400; body: string };

/** Handles the IdP callback: validates the code and creates a session on success. */
export async function handleAuthCallback(
  request: AuthCallbackRequest,
): Promise<AuthCallbackResponse> {
  const result = await validateAuthCallback(request.code ?? "");

  if (!result.valid) {
    logAuthFailure(result.error);
    return { status: 400, body: result.error };
  }

  const session = createSession(result.subject);
  return {
    status: 302,
    location: "/dashboard",
    headers: { "Set-Cookie": session.cookie },
  };
}
