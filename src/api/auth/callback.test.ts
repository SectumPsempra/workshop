import { describe, expect, it, vi } from "vitest";
import { handleAuthCallback } from "./callback.js";

vi.mock("../../config/loadConfig.js", () => ({
  loadConfig: vi.fn().mockReturnValue({
    demo: { enabled: true, port: 3001, baseUrl: "http://localhost:3001" },
    auth: {
      protocol: "local",
      callbackPath: "/auth/callback",
      scopes: "openid profile email",
      authorizationEndpoint: "",
      tokenEndpoint: "",
      jwksUri: "",
      issuer: "",
      session: { cookieName: "app_session", ttlSeconds: 28800 },
    },
  }),
}));

describe("handleAuthCallback — valid code", () => {
  it("returns 302 to /dashboard", async () => {
    const res = await handleAuthCallback({ code: "valid-demo-code" });
    expect(res.status).toBe(302);
    if (res.status === 302) expect(res.location).toBe("/dashboard");
  });

  it("sets a session cookie with security flags", async () => {
    const res = await handleAuthCallback({ code: "valid-demo-code" });
    if (res.status === 302) {
      const cookie = res.headers["Set-Cookie"];
      expect(cookie).toContain("app_session=");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("SameSite=Strict");
    }
  });
});

describe("handleAuthCallback — invalid code", () => {
  it("returns 400 for invalid code", async () => {
    const res = await handleAuthCallback({ code: "invalid-code" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when code is missing", async () => {
    const res = await handleAuthCallback({});
    expect(res.status).toBe(400);
    if (res.status === 400) expect(res.body).toBe("Authorization code is missing.");
  });

  it("error body does not expose the raw code", async () => {
    const res = await handleAuthCallback({ code: "tampered-token" });
    if (res.status === 400) expect(res.body).not.toContain("tampered-token");
  });
});
