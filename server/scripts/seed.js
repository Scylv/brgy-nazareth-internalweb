import { pool } from "../db/pool.js";
import { runSqlFile } from "../db/runSqlFile.js";

try {
  await runSqlFile(pool, "database/seed.sql");
  console.log("Seed completed: database/seed.sql");
} finally {
  await pool.end();
}
