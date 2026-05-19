import "dotenv/config";

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
