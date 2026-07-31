import { eq } from 'drizzle-orm';
import type { BraceletDesign } from '../../domain/bracelet';
import type { AppDb } from '../db/client';
import { cartItems, carts } from '../db/schema';
import type { CartItemRecord, CartRecord, CartRepository } from './cart-repository';

export class SqliteCartRepository implements CartRepository {
	constructor(private readonly db: AppDb) {}

	private async loadItems(cartId: string): Promise<CartItemRecord[]> {
		const rows = await this.db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
		return rows.map((row) => ({
			id: row.id,
			cartId: row.cartId,
			kind: row.kind as CartItemRecord['kind'],
			productVariantId: row.productVariantId,
			designId: row.designId,
			design: row.designJson ? (JSON.parse(row.designJson) as BraceletDesign) : null,
			previewKey: row.previewKey,
			title: row.title,
			qty: row.qty,
			unitPriceMinor: row.unitPriceMinor,
			createdAt: row.createdAt,
		}));
	}

	private async toCart(row: typeof carts.$inferSelect): Promise<CartRecord> {
		return {
			id: row.id,
			userId: row.userId,
			guestToken: row.guestToken,
			updatedAt: row.updatedAt,
			items: await this.loadItems(row.id),
		};
	}

	async getById(id: string): Promise<CartRecord | null> {
		const [row] = await this.db.select().from(carts).where(eq(carts.id, id)).limit(1);
		return row ? this.toCart(row) : null;
	}

	async getByGuestToken(token: string): Promise<CartRecord | null> {
		const [row] = await this.db.select().from(carts).where(eq(carts.guestToken, token)).limit(1);
		return row ? this.toCart(row) : null;
	}

	async getByUserId(userId: string): Promise<CartRecord | null> {
		const [row] = await this.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
		return row ? this.toCart(row) : null;
	}

	async saveCart(cart: Omit<CartRecord, 'items'>): Promise<void> {
		await this.db
			.insert(carts)
			.values({
				id: cart.id,
				userId: cart.userId,
				guestToken: cart.guestToken,
				updatedAt: cart.updatedAt,
			})
			.onConflictDoUpdate({
				target: carts.id,
				set: {
					userId: cart.userId,
					guestToken: cart.guestToken,
					updatedAt: cart.updatedAt,
				},
			});
	}

	async replaceItems(cartId: string, items: CartItemRecord[]): Promise<void> {
		await this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
		if (items.length === 0) return;
		await this.db.insert(cartItems).values(
			items.map((item) => ({
				id: item.id,
				cartId,
				kind: item.kind,
				productVariantId: item.productVariantId,
				designId: item.designId,
				designJson: item.design ? JSON.stringify(item.design) : null,
				previewKey: item.previewKey,
				title: item.title,
				qty: item.qty,
				unitPriceMinor: item.unitPriceMinor,
				createdAt: item.createdAt,
			})),
		);
	}

	async clearItems(cartId: string): Promise<void> {
		await this.replaceItems(cartId, []);
	}
}
