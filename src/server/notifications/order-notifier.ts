export type OrderNotification = {
	orderNumber: string;
	totalMinor: number;
	currency: string;
	items: Array<{ title: string; qty: number; priceMinor: number }>;
	customerName?: string;
	customerPhone?: string;
};

export interface OrderNotifier {
	sendNewOrder(order: OrderNotification): Promise<void>;
}

export class ConsoleOrderNotifier implements OrderNotifier {
	async sendNewOrder(order: OrderNotification): Promise<void> {
		console.log(
			JSON.stringify({
				type: 'new_order',
				orderNumber: order.orderNumber,
				totalMinor: order.totalMinor,
				currency: order.currency,
				items: order.items,
			}),
		);
	}
}

/** External service receives order composition only — no PII. */
export class PiiSafeOrderNotifier implements OrderNotifier {
	constructor(private readonly inner: OrderNotifier) {}

	async sendNewOrder(order: OrderNotification): Promise<void> {
		await this.inner.sendNewOrder({
			orderNumber: order.orderNumber,
			totalMinor: order.totalMinor,
			currency: order.currency,
			items: order.items,
		});
	}
}

export class FullOrderNotifier implements OrderNotifier {
	constructor(private readonly inner: OrderNotifier) {}

	async sendNewOrder(order: OrderNotification): Promise<void> {
		await this.inner.sendNewOrder(order);
	}
}
