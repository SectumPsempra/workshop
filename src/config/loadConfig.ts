import { readFileSync } from "fs";
import { join } from "path";

export type AuthConfig = {
  protocol: "local" | "oidc";
  callbackPath: string;
  scopes: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUri?: string;
  issuer?: string;
  session: {
    cookieName: string;
    ttlSeconds: number;
  };
};

export type DemoConfig = {
  enabled: boolean;
  port: number;
  baseUrl: string;
};

export type AppConfig = {
  demo: DemoConfig;
  auth: AuthConfig;
};

/** Reads config.json, overlays process.env, expands ${VAR} placeholders. */
export function loadConfig(): AppConfig {
  const raw = readFileSync(join(process.cwd(), "config.json"), "utf-8");
  const json = JSON.parse(raw) as AppConfig;
  return expandPlaceholders(json) as AppConfig;
}

function expandPlaceholders<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(
      /\$\{([^}]+)\}/g,
      (_, key: string) => process.env[key] ?? "",
    ) as T;
  }
  if (Array.isArray(value)) return value.map(expandPlaceholders) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, expandPlaceholders(v)]),
    ) as T;
  }
  return value;
}
