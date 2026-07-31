import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getEnv } from '../src/lib/env';

async function backup() {
	const env = getEnv();
	const sourcePath = path.resolve(env.DATABASE_PATH);
	const backupDir = path.resolve('backups');
	fs.mkdirSync(backupDir, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const destPath = path.join(backupDir, `app-${stamp}.db`);

	const source = new Database(sourcePath, { readonly: true });
	await source.backup(destPath);
	source.close();
	console.log(`Backup written to ${destPath}`);
}

backup().catch((error) => {
	console.error(error);
	process.exit(1);
});
