import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthSessionSecret, getCorsOrigins } from "./env.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthSessionSecret", () => {
  it("uses the configured AUTH_SESSION_SECRET in staging", () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("AUTH_SESSION_SECRET", "staging-secret");

    expect(getAuthSessionSecret()).toBe("staging-secret");
  });

  it("fails fast without AUTH_SESSION_SECRET in staging", () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("AUTH_SESSION_SECRET", "");

    expect(() => getAuthSessionSecret()).toThrow("AUTH_SESSION_SECRET is required");
  });

  it("fails fast without AUTH_SESSION_SECRET in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SESSION_SECRET", "");

    expect(() => getAuthSessionSecret()).toThrow("AUTH_SESSION_SECRET is required");
  });

  it("allows the local fallback only in local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SESSION_SECRET", "");

    expect(getAuthSessionSecret()).toBe("development-auth-session-secret");
  });
});

describe("getCorsOrigins", () => {
  it("includes localhost defaults in local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CORS_ORIGINS", "");

    const origins = getCorsOrigins();

    expect(origins.has("http://localhost:5173")).toBe(true);
    expect(origins.has("http://127.0.0.1:5173")).toBe(true);
  });

  it("does not include localhost defaults in staging", () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("CORS_ORIGINS", "https://example-staging-frontend.onrender.com");

    const origins = getCorsOrigins();

    expect(origins.has("http://localhost:5173")).toBe(false);
    expect(origins.has("http://127.0.0.1:5173")).toBe(false);
    expect(origins.has("https://example-staging-frontend.onrender.com")).toBe(true);
  });

  it("does not use wildcard CORS origins with credentials", () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("CORS_ORIGINS", "*, https://example-staging-frontend.onrender.com");

    const origins = getCorsOrigins();

    expect(origins.has("*")).toBe(false);
    expect(origins.has("https://example-staging-frontend.onrender.com")).toBe(true);
  });
});
