import { loadConfig } from "../../config/loadConfig.js";

export type SessionResult = {
  sessionId: string;
  cookie: string;
};

/** Builds a Set-Cookie header value with security flags from config. */
export function buildSessionCookie(sessionId: string): string {
  const { cookieName, ttlSeconds } = loadConfig().auth.session;
  return [
    `${cookieName}=${sessionId}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${ttlSeconds}`,
  ].join("; ");
}

/** Creates an authenticated session and returns its cookie header. */
export function createSession(subject: string): SessionResult {
  const sessionId = `sess-${subject}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { sessionId, cookie: buildSessionCookie(sessionId) };
}
