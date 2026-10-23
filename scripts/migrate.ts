// Applies migrations to the PostgreSQL database at DATABASE_URL.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pgConnectionOptions } from "../src/db";

async function main() {
  // A direct/session connection is preferred for migrations; falls back to DATABASE_URL.
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Local dev uses PGlite and migrates automatically.");
  const pool = new Pool(pgConnectionOptions(url));
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
