import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function runSqlFile(pool, relativePath) {
  const filePath = resolve(process.cwd(), relativePath);
  const sql = await readFile(filePath, "utf8");

  await pool.query(sql);
}
