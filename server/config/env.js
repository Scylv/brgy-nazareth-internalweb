import "dotenv/config";

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const LOCAL_DEVELOPMENT_NODE_ENV = "development";
const VALID_AUTH_COOKIE_SAMESITE = new Set(["Lax", "Strict", "None"]);

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env for local setup.");
  }

  return databaseUrl;
}

export function getPort() {
  return Number(process.env.PORT ?? 3001);
}

export function getCorsOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== "*");
  const defaultOrigins =
    process.env.NODE_ENV === LOCAL_DEVELOPMENT_NODE_ENV ? DEFAULT_CORS_ORIGINS : [];

  return new Set([...defaultOrigins, ...configuredOrigins]);
}

export function getAuthSessionSecret() {
  const configuredSecret = process.env.AUTH_SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === LOCAL_DEVELOPMENT_NODE_ENV) {
    return "development-auth-session-secret";
  }

  throw new Error("AUTH_SESSION_SECRET is required outside local development.");
}

function normalizeSameSite(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "lax") {
    return "Lax";
  }

  if (normalized === "strict") {
    return "Strict";
  }

  if (normalized === "none") {
    return "None";
  }

  return "";
}

function parseBooleanEnv(value, variableName) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  throw new Error(`${variableName} must be true or false.`);
}

export function getAuthCookieConfig() {
  const isLocalDevelopment = process.env.NODE_ENV === LOCAL_DEVELOPMENT_NODE_ENV;
  const configuredSameSite = process.env.AUTH_COOKIE_SAMESITE?.trim();
  const sameSite =
    configuredSameSite === undefined || configuredSameSite === ""
      ? isLocalDevelopment
        ? "Lax"
        : "None"
      : normalizeSameSite(configuredSameSite);
  const secure =
    process.env.AUTH_COOKIE_SECURE === undefined
      ? !isLocalDevelopment
      : parseBooleanEnv(process.env.AUTH_COOKIE_SECURE, "AUTH_COOKIE_SECURE");

  if (!VALID_AUTH_COOKIE_SAMESITE.has(sameSite)) {
    throw new Error("AUTH_COOKIE_SAMESITE must be Lax, Strict, or None.");
  }

  if (sameSite === "None" && !secure) {
    throw new Error("AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAMESITE is None.");
  }

  return {
    sameSite,
    secure
  };
}
