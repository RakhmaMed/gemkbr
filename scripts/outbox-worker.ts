import { getEnv } from '../src/lib/env';
import { getDb, closeDb } from '../src/server/db/client';
import {
	ConsoleOrderNotifier,
	FullOrderNotifier,
	PiiSafeOrderNotifier,
} from '../src/server/notifications/order-notifier';
import { SqliteOrderRepository } from '../src/server/repositories/sqlite-order-repository';
import { logger } from '../src/server/logging/logger';

function createNotifier() {
	const mode = getEnv().ORDER_NOTIFIER_MODE;
	const consoleNotifier = new ConsoleOrderNotifier();
	if (mode === 'pii_safe') return new PiiSafeOrderNotifier(consoleNotifier);
	if (mode === 'full') return new FullOrderNotifier(consoleNotifier);
	return consoleNotifier;
}

async function runOnce() {
	const repo = new SqliteOrderRepository(getDb());
	const notifier = createNotifier();
	const pending = await repo.listPendingOutbox(new Date());

	for (const item of pending) {
		try {
			if (item.type === 'new_order') {
				await notifier.sendNewOrder(item.payload as never);
			}
			await repo.markOutboxSent(item.id, new Date());
			logger.info({ outboxId: item.id }, 'outbox sent');
		} catch (error) {
			const attempts = item.attempts + 1;
			const delayMs = Math.min(60_000, 2 ** attempts * 1000);
			await repo.markOutboxRetry(
				item.id,
				attempts,
				new Date(Date.now() + delayMs),
				error instanceof Error ? error.message : 'unknown error',
			);
			logger.error({ outboxId: item.id, attempts }, 'outbox retry scheduled');
		}
	}
}

async function main() {
	const once = process.argv.includes('--once');
	if (once) {
		await runOnce();
		closeDb();
		return;
	}

	for (;;) {
		await runOnce();
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
