import { and, eq } from 'drizzle-orm';
import { createId } from '../../lib/id';
import type { AppDb } from '../db/client';
import { wishlistItems } from '../db/schema';
import type { WishlistRepository } from './wishlist-repository';

export class SqliteWishlistRepository implements WishlistRepository {
	constructor(private readonly db: AppDb) {}

	async list(userId: string) {
		const rows = await this.db
			.select()
			.from(wishlistItems)
			.where(eq(wishlistItems.userId, userId));
		return rows.map((row) => ({
			id: row.id,
			productVariantId: row.productVariantId,
			designId: row.designId,
		}));
	}

	async toggleProduct(userId: string, productVariantId: string) {
		const [existing] = await this.db
			.select()
			.from(wishlistItems)
			.where(
				and(
					eq(wishlistItems.userId, userId),
					eq(wishlistItems.productVariantId, productVariantId),
				),
			)
			.limit(1);
		if (existing) {
			await this.db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
			return { added: false };
		}
		await this.db.insert(wishlistItems).values({
			id: createId(),
			userId,
			productVariantId,
			designId: null,
			createdAt: new Date(),
		});
		return { added: true };
	}
}
