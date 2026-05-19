import pg from "pg";
import { getDatabaseUrl } from "../config/env.js";

const { Pool } = pg;

export function createPool() {
  return new Pool({
    connectionString: getDatabaseUrl()
  });
}

export const pool = createPool();
