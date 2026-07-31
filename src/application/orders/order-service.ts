import type { BraceletDesign } from '../../domain/bracelet';
import { createId } from '../../lib/id';
import { CURRENCY } from '../../lib/money';
import type { CartRepository } from '../../server/repositories/cart-repository';
import type { CatalogRepository } from '../../server/repositories/catalog-repository';
import type { OrderRepository } from '../../server/repositories/order-repository';
import { DesignService } from '../designs/design-service';

export class OrderService {
	constructor(
		private readonly carts: CartRepository,
		private readonly catalog: CatalogRepository,
		private readonly orders: OrderRepository,
		private readonly designs: DesignService,
	) {}

	async createOrder(input: {
		cartId: string;
		userId: string | null;
		customerName: string;
		customerPhone: string;
		consent: boolean;
	}) {
		if (!input.consent) {
			return { ok: false as const, error: 'Требуется согласие на обработку персональных данных' };
		}

		const cart = await this.carts.getById(input.cartId);
		if (!cart || cart.items.length === 0) {
			return { ok: false as const, error: 'Корзина пуста' };
		}

		const orderItems = [];
		let totalMinor = 0;

		for (const item of cart.items) {
			if (item.kind === 'product') {
				const products = await this.catalog.listActiveProducts();
				const found = products
					.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })))
					.find((entry) => entry.variant.id === item.productVariantId);
				if (!found || !found.variant.active) {
					return { ok: false as const, error: `Товар недоступен: ${item.title}` };
				}
				const priceMinor = found.variant.priceMinor * item.qty;
				totalMinor += priceMinor;
				orderItems.push({
					id: createId(),
					kind: 'product' as const,
					title: found.product.name,
					qty: item.qty,
					priceMinor,
					snapshot: {
						productId: found.product.id,
						variantId: found.variant.id,
						sku: found.variant.sku,
						unitPriceMinor: found.variant.priceMinor,
					},
				});
				continue;
			}

			const design = item.design as BraceletDesign;
			const priced = await this.designs.priceAndValidate(design);
			if (!priced.validation.ok) {
				return { ok: false as const, error: 'Конфигурация браслета невалидна', issues: priced.validation.issues };
			}
			const priceMinor = priced.priceMinor * item.qty;
			totalMinor += priceMinor;
			orderItems.push({
				id: createId(),
				kind: 'custom_bracelet' as const,
				title: item.title,
				qty: item.qty,
				priceMinor,
				snapshot: {
					title: item.title,
					priceMinor: priced.priceMinor,
					configuration: design,
					components: priced.variants.map((v) => ({
						sku: v.sku,
						name: v.name,
						diameterMm: v.diameterMm,
						axialLengthMm: v.axialLengthMm,
						priceMinor: v.priceMinor,
					})),
				},
			});
		}

		const now = new Date();
		const orderNumber = `GK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
		const order = {
			id: createId(),
			number: orderNumber,
			userId: input.userId,
			status: 'new' as const,
			customerName: input.customerName.trim(),
			customerPhone: input.customerPhone.trim(),
			consentAt: now,
			totalMinor,
			currency: CURRENCY,
			createdAt: now,
			items: orderItems,
		};

		const outbox = {
			id: createId(),
			type: 'new_order',
			payload: {
				orderNumber: order.number,
				totalMinor: order.totalMinor,
				currency: order.currency,
				items: order.items.map((i) => ({
					title: i.title,
					qty: i.qty,
					priceMinor: i.priceMinor,
				})),
				// Full mode can include PII; PII-safe notifier strips these.
				customerName: order.customerName,
				customerPhone: order.customerPhone,
			},
			status: 'pending' as const,
			attempts: 0,
			nextAttemptAt: now,
			lastError: null,
			createdAt: now,
			sentAt: null,
		};

		await this.orders.createOrderWithOutbox({ order, outbox });
		await this.carts.clearItems(cart.id);

		return { ok: true as const, order };
	}
}
