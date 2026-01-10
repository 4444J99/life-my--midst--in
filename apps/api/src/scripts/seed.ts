import { Pool } from "pg";
import { runMigrations, runSeeds } from "../repositories/migrations";

const connectionString =
  process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"] ?? process.env["INTEGRATION_POSTGRES_URL"];

async function main() {
  if (!connectionString) {
    console.error("DATABASE_URL or POSTGRES_URL is required for seeding");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  await runMigrations(pool);
  await runSeeds(pool);
  await pool.end();
  console.log("Seeds applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
