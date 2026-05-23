import "dotenv/config";

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

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
    .filter(Boolean);

  return new Set([...DEFAULT_CORS_ORIGINS, ...configuredOrigins]);
}
