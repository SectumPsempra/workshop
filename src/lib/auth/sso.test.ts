import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizationUrl,
  initiateAuth,
  validateAuthCallback,
  verifyIdToken,
  exchangeCodeForTokens,
} from "./sso.js";
import type { AppConfig } from "../../config/loadConfig.js";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn(),
}));

const localConfig: AppConfig = {
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
};

const oidcConfig: AppConfig = {
  ...localConfig,
  auth: {
    ...localConfig.auth,
    protocol: "oidc",
    authorizationEndpoint:
      "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize",
    tokenEndpoint:
      "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token",
    jwksUri:
      "https://login.microsoftonline.com/test-tenant/discovery/v2.0/keys",
    issuer: "https://login.microsoftonline.com/test-tenant/v2.0",
  },
};

describe("buildAuthorizationUrl — local mode", () => {
  it("returns the local callback URL with demo code", () => {
    expect(buildAuthorizationUrl(localConfig)).toBe(
      "http://localhost:3001/auth/callback?code=valid-demo-code",
    );
  });
});

describe("buildAuthorizationUrl — oidc mode", () => {
  beforeEach(() => {
    process.env["AUTH_CLIENT_ID"] = "test-client-id";
  });
  afterEach(() => {
    delete process.env["AUTH_CLIENT_ID"];
  });

  it("builds an authorize URL with required OIDC params", () => {
    const url = buildAuthorizationUrl(oidcConfig);
    expect(url).toContain("response_type=code");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain(encodeURIComponent("/auth/callback"));
  });

  it("never exposes AUTH_CLIENT_SECRET in the authorization URL", () => {
    process.env["AUTH_CLIENT_SECRET"] = "super-secret";
    const url = buildAuthorizationUrl(oidcConfig);
    expect(url).not.toContain("super-secret");
    delete process.env["AUTH_CLIENT_SECRET"];
  });
});

describe("initiateAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { assign: vi.fn() } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects browser to the authorization URL", () => {
    initiateAuth(localConfig);
    expect(window.location.assign).toHaveBeenCalledWith(
      buildAuthorizationUrl(localConfig),
    );
  });
});

describe("validateAuthCallback — local mode", () => {
  it("accepts a valid demo code", async () => {
    expect(await validateAuthCallback("valid-demo-code", localConfig)).toEqual({
      valid: true,
      subject: "demo-user",
    });
  });

  it("rejects a code starting with invalid", async () => {
    const result = await validateAuthCallback("invalid-code", localConfig);
    expect(result.valid).toBe(false);
  });

  it("rejects a missing code", async () => {
    expect(await validateAuthCallback("", localConfig)).toEqual({
      valid: false,
      error: "Authorization code is missing.",
    });
  });
});

describe("validateAuthCallback — oidc mode", () => {
  beforeEach(() => {
    process.env["AUTH_CLIENT_ID"] = "test-client-id";
    process.env["AUTH_CLIENT_SECRET"] = "test-secret";
  });
  afterEach(() => {
    delete process.env["AUTH_CLIENT_ID"];
    delete process.env["AUTH_CLIENT_SECRET"];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns valid when token exchange and JWKS verification succeed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id_token: "header.payload.sig" }),
      }),
    );
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: "user-123", iss: "test", aud: "test" },
      protectedHeader: { alg: "RS256" },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    expect(await validateAuthCallback("real-code", oidcConfig)).toEqual({
      valid: true,
      subject: "user-123",
    });
  });

  it("returns invalid when token endpoint fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }),
    );
    const result = await validateAuthCallback("expired-code", oidcConfig);
    expect(result.valid).toBe(false);
  });
});

describe("exchangeCodeForTokens", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["AUTH_CLIENT_ID"];
    delete process.env["AUTH_CLIENT_SECRET"];
  });

  it("POSTs to tokenEndpoint with correct form fields", async () => {
    process.env["AUTH_CLIENT_ID"] = "client-123";
    process.env["AUTH_CLIENT_SECRET"] = "secret-xyz";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id_token: "tok" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await exchangeCodeForTokens("authcode", oidcConfig);

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(oidcConfig.auth.tokenEndpoint);
    const body = opts.body?.toString() ?? "";
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("client_id=client-123");
    expect(body).toContain("client_secret=secret-xyz");
  });
});

describe("verifyIdToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env["AUTH_CLIENT_ID"];
  });

  it("returns subject from verified JWT payload", async () => {
    process.env["AUTH_CLIENT_ID"] = "client-123";
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: "user-abc", iss: "test", aud: "test" },
      protectedHeader: { alg: "RS256" },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    expect(await verifyIdToken("header.payload.sig", oidcConfig)).toBe("user-abc");
  });
});
