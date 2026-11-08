// Imports a researched list of targets (the JSON that upsert_targets takes)
// into the signal engine, in batches of 10, and optionally starts a play for
// each one. The list stays outside git when it holds real names (docs/ is
// ignored), so pass its path.
//
//   npx tsx scripts/import-targets.ts <targets.json> --dry-run                 check on a throwaway database
//   npx tsx scripts/import-targets.ts <targets.json> --play plant_study        import into DATABASE_URL (or local .data)
//
// The local database allows one process: stop `npm run dev` first.

import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDb, openPglite, type DB } from "../src/db";
import { users } from "../src/db/schema";
import { playFor } from "../src/knowledge/engine";
import { loadActor } from "../src/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "../src/server/bootstrap";
import { getEngineQueue, startPlay, upsertTargets, type TargetInput } from "../src/server/engine";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--play");
  const dryRun = args.includes("--dry-run");
  const playId = args.includes("--play") ? args[args.indexOf("--play") + 1] : undefined;
  if (!file) throw new Error("Pass the path of a targets JSON file.");
  if (playId && !playFor(playId)) throw new Error(`No play called "${playId}".`);

  const targets = JSON.parse(readFileSync(file, "utf8")) as TargetInput[];
  const db: DB = dryRun ? await openPglite() : await getDb();
  if (dryRun) await bootstrap(db);
  const [u] = await db.select().from(users).where(eq(users.email, process.env.OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL));
  if (!u) throw new Error("No owner account in this database.");
  const owner = await loadActor(db, u);

  const results = [];
  for (let i = 0; i < targets.length; i += 10) results.push(...(await upsertTargets(db, owner, targets.slice(i, i + 10), { source: "claude" })));
  console.log(`${dryRun ? "[dry run] " : ""}${results.filter((r) => r.created).length} added, ${results.filter((r) => !r.created).length} already there, of ${results.length}.`);
  for (const r of [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))) {
    const missing = (r.parts as { missing?: string[] } | null)?.missing ?? [];
    console.log(`${String(r.score).padStart(3)} ${r.tier}  ${r.name}${missing.length ? `  (missing: ${missing.join("; ")})` : ""}`);
  }

  if (playId) {
    let started = 0;
    for (const r of results) {
      try {
        await startPlay(db, owner, r.id, playId);
        started++;
      } catch (e) {
        console.log(`  not started for ${r.name}: ${(e as Error).message}`);
      }
    }
    const queue = await getEngineQueue(db, owner);
    console.log(`Started "${playId}" for ${started}. Due today: ${queue.due.length}.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
