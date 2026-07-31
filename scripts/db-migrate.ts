import fs from 'node:fs';
import path from 'node:path';
import { getSqlite, closeDb } from '../src/server/db/client';

async function migrate() {
	const sqlite = getSqlite();
	const migrationsDir = path.resolve('drizzle/migrations');
	fs.mkdirSync(migrationsDir, { recursive: true });

	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER
    );
  `);

	const journalPath = path.join(migrationsDir, 'meta/_journal.json');
	if (!fs.existsSync(journalPath)) {
		console.log('No migrations journal found. Run pnpm db:generate first.');
		closeDb();
		return;
	}

	const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
		entries: Array<{ tag: string }>;
	};

	const applied = new Set(
		(sqlite.prepare('SELECT hash FROM __drizzle_migrations').all() as Array<{ hash: string }>).map(
			(r) => r.hash,
		),
	);

	for (const entry of journal.entries) {
		if (applied.has(entry.tag)) continue;
		const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
		const sql = fs.readFileSync(sqlPath, 'utf8');
		sqlite.exec(sql);
		sqlite
			.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)')
			.run(entry.tag, Date.now());
		console.log(`Applied ${entry.tag}`);
	}

	closeDb();
	console.log('Migrations complete');
}

migrate().catch((error) => {
	console.error(error);
	process.exit(1);
});
