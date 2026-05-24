import "dotenv/config";

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const LOCAL_DEVELOPMENT_NODE_ENV = "development";

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
