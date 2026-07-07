import { describe, expect, it, vi } from "vitest";
import { buildSessionCookie, createSession } from "./session.js";

vi.mock("../../config/loadConfig.js", () => ({
  loadConfig: vi.fn().mockReturnValue({
    demo: { enabled: true, port: 3001, baseUrl: "http://localhost:3001" },
    auth: {
      protocol: "local",
      callbackPath: "/auth/callback",
      scopes: "openid profile email",
      session: { cookieName: "app_session", ttlSeconds: 28800 },
    },
  }),
}));

describe("buildSessionCookie", () => {
  it("includes configured cookie name and session id", () => {
    expect(buildSessionCookie("sid")).toContain("app_session=sid");
  });

  it("sets HttpOnly, Secure, SameSite=Strict, Max-Age", () => {
    const cookie = buildSessionCookie("sid");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Max-Age=28800");
  });
});

describe("createSession", () => {
  it("returns unique session IDs across calls", () => {
    expect(createSession("user").sessionId).not.toBe(
      createSession("user").sessionId,
    );
  });
});
