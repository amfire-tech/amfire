import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: url ? { url } : undefined,
});
