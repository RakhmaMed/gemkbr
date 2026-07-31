import { eq } from 'drizzle-orm';
import type { BraceletDesign } from '../../domain/bracelet';
import type { AppDb } from '../db/client';
import { braceletDesigns } from '../db/schema';
import type { DesignRepository, SavedDesign } from './design-repository';

function mapRow(row: typeof braceletDesigns.$inferSelect): SavedDesign {
	return {
		id: row.id,
		userId: row.userId,
		templateId: row.templateId,
		targetWristMm: row.targetWristMm,
		design: JSON.parse(row.configJson) as BraceletDesign,
		previewKey: row.previewKey,
		priceMinorCached: row.priceMinorCached,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export class SqliteDesignRepository implements DesignRepository {
	constructor(private readonly db: AppDb) {}

	async save(design: SavedDesign): Promise<SavedDesign> {
		await this.db
			.insert(braceletDesigns)
			.values({
				id: design.id,
				userId: design.userId,
				templateId: design.templateId,
				targetWristMm: design.targetWristMm,
				configJson: JSON.stringify(design.design),
				previewKey: design.previewKey,
				priceMinorCached: design.priceMinorCached,
				createdAt: design.createdAt,
				updatedAt: design.updatedAt,
			})
			.onConflictDoUpdate({
				target: braceletDesigns.id,
				set: {
					userId: design.userId,
					templateId: design.templateId,
					targetWristMm: design.targetWristMm,
					configJson: JSON.stringify(design.design),
					previewKey: design.previewKey,
					priceMinorCached: design.priceMinorCached,
					updatedAt: design.updatedAt,
				},
			});
		return design;
	}

	async getById(id: string): Promise<SavedDesign | null> {
		const [row] = await this.db
			.select()
			.from(braceletDesigns)
			.where(eq(braceletDesigns.id, id))
			.limit(1);
		return row ? mapRow(row) : null;
	}

	async listByUser(userId: string): Promise<SavedDesign[]> {
		const rows = await this.db
			.select()
			.from(braceletDesigns)
			.where(eq(braceletDesigns.userId, userId));
		return rows.map(mapRow);
	}
}
