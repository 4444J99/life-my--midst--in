import { Pool } from "pg";
import { resolvePostgresUrlWithFallback } from "../config";
import { runTaskMigrations } from "../migrations";

const connectionString = resolvePostgresUrlWithFallback();

async function main() {
  if (!connectionString) {
    console.error("DATABASE_URL or POSTGRES_URL is required for orchestrator migrations");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  await runTaskMigrations(pool);
  await pool.end();
  console.log("Orchestrator migrations completed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
