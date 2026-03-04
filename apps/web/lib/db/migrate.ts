import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.POSTGRES_URL;
if (!url) {
	console.log("POSTGRES_URL not set — skipping migrations");
	process.exit(0);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

/**
 * One-time baseline: if the database was bootstrapped via `db:push` (tables
 * exist but drizzle has no migration history), mark all existing migrations as
 * already applied so the migrator doesn't try to replay them.
 *
 * This runs exactly once — after this, normal `migrate()` takes over.
 */
async function baselineIfNeeded() {
	// Check if any app table exists (db:push was used)
	const [{ exists: tablesExist }] = await client`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'users'
		)`;

	if (!tablesExist) return; // fresh database — nothing to baseline

	// Check if the drizzle migrations table has any rows
	// First ensure the schema + table exist (migrate() creates them, but we
	// need to check before it runs)
	await client`CREATE SCHEMA IF NOT EXISTS drizzle`;
	await client`
		CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
			id serial PRIMARY KEY,
			hash text NOT NULL,
			created_at bigint
		)`;

	const [{ count }] = await client`
		SELECT count(*)::int AS count FROM drizzle."__drizzle_migrations"`;

	if (count > 0) return; // migrations already tracked — nothing to do

	// Database was bootstrapped via db:push — seed all existing migrations
	console.log("Detected db:push-bootstrapped database — baselining migration history…");

	const journalPath = join(import.meta.dirname, "migrations", "meta", "_journal.json");
	const journal = JSON.parse(readFileSync(journalPath, "utf-8"));

	for (const entry of journal.entries) {
		const sqlPath = join(import.meta.dirname, "migrations", `${entry.tag}.sql`);
		const sql = readFileSync(sqlPath, "utf-8");

		// Hash the migration content the same way drizzle-orm does (hex of the SQL)
		const hash = new Bun.CryptoHasher("sha256").update(sql).digest("hex");

		await client`
			INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
			VALUES (${hash}, ${entry.when})`;
	}

	console.log(`Baselined ${journal.entries.length} migrations`);
}

try {
	console.log("Running database migrations…");
	await baselineIfNeeded();
	await migrate(db, { migrationsFolder: "./lib/db/migrations" });
	console.log("Migrations applied successfully");
} catch (error) {
	console.error("Migration failed:", error);
	process.exit(1);
} finally {
	await client.end();
}
