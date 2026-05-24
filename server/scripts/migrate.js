import { pool } from "../db/pool.js";
import { runSqlFile } from "../db/runSqlFile.js";

try {
  await runSqlFile(pool, "database/migrations/001_initial_schema.sql");
  console.log("Migration completed: database/migrations/001_initial_schema.sql");
} finally {
  await pool.end();
}
