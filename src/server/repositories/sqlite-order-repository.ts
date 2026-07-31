import { and, eq, lte } from 'drizzle-orm';
import { createId } from '../../lib/id';
import type { AppDb } from '../db/client';
import { getSqlite } from '../db/client';
import {
	notificationOutbox,
	orderEvents,
	orderItems,
	orders,
} from '../db/schema';
import type {
	OrderRecord,
	OrderRepository,
	OutboxRecord,
} from './order-repository';

export class SqliteOrderRepository implements OrderRepository {
	constructor(private readonly db: AppDb) {}

	async createOrderWithOutbox(input: {
		order: OrderRecord;
		outbox: OutboxRecord;
		eventPayload?: Record<string, unknown>;
	}): Promise<OrderRecord> {
		const sqlite = getSqlite();
		const tx = sqlite.transaction(() => {
			sqlite
				.prepare(
					`INSERT INTO orders (id, number, user_id, status, customer_name, customer_phone, consent_at, total_minor, currency, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.run(
					input.order.id,
					input.order.number,
					input.order.userId,
					input.order.status,
					input.order.customerName,
					input.order.customerPhone,
					input.order.consentAt.getTime(),
					input.order.totalMinor,
					input.order.currency,
					input.order.createdAt.getTime(),
				);

			const insertItem = sqlite.prepare(
				`INSERT INTO order_items (id, order_id, kind, title, qty, price_minor, snapshot_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
			);
			for (const item of input.order.items) {
				insertItem.run(
					item.id,
					input.order.id,
					item.kind,
					item.title,
					item.qty,
					item.priceMinor,
					JSON.stringify(item.snapshot),
				);
			}

			sqlite
				.prepare(
					`INSERT INTO order_events (id, order_id, type, payload_json, created_at)
           VALUES (?, ?, ?, ?, ?)`,
				)
				.run(
					createId(),
					input.order.id,
					'created',
					JSON.stringify(input.eventPayload ?? {}),
					Date.now(),
				);

			sqlite
				.prepare(
					`INSERT INTO notification_outbox (id, type, payload_json, status, attempts, next_attempt_at, last_error, created_at, sent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.run(
					input.outbox.id,
					input.outbox.type,
					JSON.stringify(input.outbox.payload),
					input.outbox.status,
					input.outbox.attempts,
					input.outbox.nextAttemptAt.getTime(),
					input.outbox.lastError,
					input.outbox.createdAt.getTime(),
					null,
				);
		});
		tx();
		return input.order;
	}

	private async mapOrder(row: typeof orders.$inferSelect): Promise<OrderRecord> {
		const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, row.id));
		return {
			id: row.id,
			number: row.number,
			userId: row.userId,
			status: row.status as OrderRecord['status'],
			customerName: row.customerName,
			customerPhone: row.customerPhone,
			consentAt: row.consentAt,
			totalMinor: row.totalMinor,
			currency: row.currency,
			createdAt: row.createdAt,
			items: items.map((item) => ({
				id: item.id,
				kind: item.kind as OrderRecord['items'][number]['kind'],
				title: item.title,
				qty: item.qty,
				priceMinor: item.priceMinor,
				snapshot: JSON.parse(item.snapshotJson) as Record<string, unknown>,
			})),
		};
	}

	async getById(id: string): Promise<OrderRecord | null> {
		const [row] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
		return row ? this.mapOrder(row) : null;
	}

	async getByNumber(number: string): Promise<OrderRecord | null> {
		const [row] = await this.db.select().from(orders).where(eq(orders.number, number)).limit(1);
		return row ? this.mapOrder(row) : null;
	}

	async listByUser(userId: string): Promise<OrderRecord[]> {
		const rows = await this.db.select().from(orders).where(eq(orders.userId, userId));
		return Promise.all(rows.map((row) => this.mapOrder(row)));
	}

	async listPendingOutbox(now: Date, limit = 20): Promise<OutboxRecord[]> {
		const rows = await this.db
			.select()
			.from(notificationOutbox)
			.where(
				and(
					eq(notificationOutbox.status, 'pending'),
					lte(notificationOutbox.nextAttemptAt, now),
				),
			)
			.limit(limit);
		return rows.map((row) => ({
			id: row.id,
			type: row.type,
			payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
			status: row.status as OutboxRecord['status'],
			attempts: row.attempts,
			nextAttemptAt: row.nextAttemptAt,
			lastError: row.lastError,
			createdAt: row.createdAt,
			sentAt: row.sentAt,
		}));
	}

	async markOutboxSent(id: string, sentAt: Date): Promise<void> {
		await this.db
			.update(notificationOutbox)
			.set({ status: 'sent', sentAt, lastError: null })
			.where(eq(notificationOutbox.id, id));
	}

	async markOutboxRetry(
		id: string,
		attempts: number,
		nextAttemptAt: Date,
		error: string,
	): Promise<void> {
		await this.db
			.update(notificationOutbox)
			.set({
				status: attempts >= 10 ? 'failed' : 'pending',
				attempts,
				nextAttemptAt,
				lastError: error,
			})
			.where(eq(notificationOutbox.id, id));
	}
}
