import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";

const defaultMigrationDir = join(__dirname, "..", "migrations");
const defaultSeedDir = join(__dirname, "..", "seeds");

function loadSql(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(directory, file), "utf-8"));
}

export async function runTaskMigrations(pool: Pool, directory = defaultMigrationDir) {
  for (const sql of loadSql(directory)) {
    await pool.query(sql);
  }
}

export async function runTaskSeeds(pool: Pool, directory = defaultSeedDir) {
  for (const sql of loadSql(directory)) {
    await pool.query(sql);
  }
}
