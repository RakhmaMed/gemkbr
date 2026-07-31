import fs from 'node:fs';
import path from 'node:path';
import { getEnv } from '../src/lib/env';

async function restore() {
	const backupPath = process.argv[2];
	if (!backupPath) {
		console.error('Usage: pnpm db:restore <backup.db>');
		process.exit(1);
	}
	const env = getEnv();
	const dest = path.resolve(env.DATABASE_PATH);
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(path.resolve(backupPath), dest);
	console.log(`Restored ${backupPath} -> ${dest}`);
	console.log('Restart the application after restore.');
}

restore().catch((error) => {
	console.error(error);
	process.exit(1);
});
