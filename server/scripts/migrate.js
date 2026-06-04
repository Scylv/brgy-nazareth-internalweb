import { pool } from "../db/pool.js";
import { runSqlFile } from "../db/runSqlFile.js";

const MIGRATIONS = [
  "001_initial_schema.sql",
  "002_admin_resident_management_fields.sql",
  "003_import_batch_undo_fields.sql",
  "004_resident_documents.sql",
  "005_resident_document_titles.sql",
  "006_lupon_case_titles.sql",
  "007_lupon_case_resolution_tracking.sql",
  "008_document_request_archive_fields.sql",
  "009_document_request_custom_title.sql",
  "010_lupon_one_active_case_per_resident.sql"
];

async function ensureMigrationTracking() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`
  );
}

async function hasExistingInitialSchema() {
  const result = await pool.query(
    `SELECT to_regclass('public.residents') AS residents_table`
  );

  return Boolean(result.rows[0]?.residents_table);
}

async function hasMigrationBeenApplied(filename) {
  const result = await pool.query(
    `SELECT filename
    FROM schema_migrations
    WHERE filename = $1`,
    [filename]
  );

  return result.rowCount > 0;
}

async function markMigrationApplied(filename) {
  await pool.query(
    `INSERT INTO schema_migrations (filename)
    VALUES ($1)
    ON CONFLICT (filename) DO NOTHING`,
    [filename]
  );
}

try {
  await ensureMigrationTracking();

  for (const migration of MIGRATIONS) {
    if (await hasMigrationBeenApplied(migration)) {
      console.log(`Migration skipped: database/migrations/${migration}`);
      continue;
    }

    if (migration === "001_initial_schema.sql" && (await hasExistingInitialSchema())) {
      await markMigrationApplied(migration);
      console.log(`Migration marked as already applied: database/migrations/${migration}`);
      continue;
    }

    await runSqlFile(pool, `database/migrations/${migration}`);
    await markMigrationApplied(migration);
    console.log(`Migration completed: database/migrations/${migration}`);
  }
} finally {
  await pool.end();
}
