import { Pool } from "pg";
import { runMigrations } from "../repositories/migrations";

const connectionString =
  process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"] ?? process.env["INTEGRATION_POSTGRES_URL"];

async function main() {
  if (!connectionString) {
    console.error("DATABASE_URL or POSTGRES_URL is required for migrations");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  await runMigrations(pool);
  await pool.end();
  console.log("Migrations completed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
