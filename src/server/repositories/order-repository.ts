export type OrderStatus =
	| 'new'
	| 'contacted'
	| 'confirmed'
	| 'cancelled'
	| 'completed'
	| 'awaiting_payment'
	| 'paid'
	| 'assembling'
	| 'shipped';

export type OrderItemSnapshot = {
	id: string;
	kind: 'product' | 'custom_bracelet';
	title: string;
	qty: number;
	priceMinor: number;
	snapshot: Record<string, unknown>;
};

export type OrderRecord = {
	id: string;
	number: string;
	userId: string | null;
	status: OrderStatus;
	customerName: string;
	customerPhone: string;
	consentAt: Date;
	totalMinor: number;
	currency: string;
	createdAt: Date;
	items: OrderItemSnapshot[];
};

export type OutboxRecord = {
	id: string;
	type: string;
	payload: Record<string, unknown>;
	status: 'pending' | 'sent' | 'failed';
	attempts: number;
	nextAttemptAt: Date;
	lastError: string | null;
	createdAt: Date;
	sentAt: Date | null;
};

export interface OrderRepository {
	createOrderWithOutbox(input: {
		order: OrderRecord;
		outbox: OutboxRecord;
		eventPayload?: Record<string, unknown>;
	}): Promise<OrderRecord>;
	getById(id: string): Promise<OrderRecord | null>;
	getByNumber(number: string): Promise<OrderRecord | null>;
	listByUser(userId: string): Promise<OrderRecord[]>;
	listPendingOutbox(now: Date, limit?: number): Promise<OutboxRecord[]>;
	markOutboxSent(id: string, sentAt: Date): Promise<void>;
	markOutboxRetry(id: string, attempts: number, nextAttemptAt: Date, error: string): Promise<void>;
}
