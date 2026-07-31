import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { getEnv } from '../../lib/env';
import * as schema from './schema';

let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getSqlite(): Database.Database {
	if (sqlite) return sqlite;
	const env = getEnv();
	const dbPath = path.resolve(env.DATABASE_PATH);
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	fs.mkdirSync(path.resolve(env.PREVIEWS_DIR), { recursive: true });

	sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	return sqlite;
}

export function getDb() {
	if (db) return db;
	db = drizzle(getSqlite(), { schema });
	return db;
}

export function pingDb(): boolean {
	const row = getSqlite().prepare('select 1 as ok').get() as { ok: number } | undefined;
	return row?.ok === 1;
}

export function closeDb(): void {
	if (sqlite) {
		sqlite.close();
		sqlite = null;
		db = null;
	}
}

export type AppDb = ReturnType<typeof getDb>;
