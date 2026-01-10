import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";

const defaultMigrationDir = join(__dirname, "..", "..", "migrations");
const defaultSeedDir = join(__dirname, "..", "..", "seeds");

function loadSqlFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files = readdirSync(directory).filter((f) => f.endsWith(".sql")).sort();
  return files.map((file) => readFileSync(join(directory, file), "utf-8"));
}

export async function runMigrations(pool: Pool, directory = defaultMigrationDir) {
  const statements = loadSqlFiles(directory);
  for (const sql of statements) {
    await pool.query(sql);
  }
}

export async function runSeeds(pool: Pool, directory = defaultSeedDir) {
  const statements = loadSqlFiles(directory);
  for (const sql of statements) {
    await pool.query(sql);
  }
}
