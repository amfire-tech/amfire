import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { bootstrap } from "@/server/bootstrap";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

const globalForDb = globalThis as unknown as { __amfireDb?: Promise<DB> };

/**
 * One shared connection pool per server instance.
 * - DATABASE_URL set  → PostgreSQL (Supabase in staging / production).
 *   Run `npm run db:migrate` as a deploy step.
 * - otherwise         → embedded PostgreSQL (PGlite) in .data/ for local dev,
 *   migrated automatically on first use.
 */
export function getDb(): Promise<DB> {
  globalForDb.__amfireDb ??= connect().catch((err) => {
    globalForDb.__amfireDb = undefined;
    throw err;
  });
  return globalForDb.__amfireDb;
}

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ ...pgConnectionOptions(url), max: process.env.VERCEL ? 3 : 10 });
    const db = drizzle(pool, { schema }) as unknown as DB;
    await bootstrap(db);
    return db;
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is required on Vercel. Set it to your Supabase connection string.");
  }
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const db = await openPglite(dataDir);
  await bootstrap(db);
  return db;
}

/**
 * TLS for hosted Postgres. Set DATABASE_CA_CERT to Supabase's CA certificate
 * (Project Settings → Database → SSL) to verify the server; otherwise the
 * connection is still encrypted but the certificate is not verified.
 */
export function pgConnectionOptions(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  // Env vars often store the PEM on one line with literal "\n" sequences.
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  return {
    connectionString: parsed.toString(),
    ssl: local ? undefined : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  };
}

/** Opens and migrates a PGlite database. Pass no dataDir for an in-memory DB (tests). */
export async function openPglite(dataDir?: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

export { schema };
