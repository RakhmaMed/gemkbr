import type { BraceletDesign } from '../../domain/bracelet';

export type SavedDesign = {
	id: string;
	userId: string | null;
	templateId: string;
	targetWristMm: number;
	design: BraceletDesign;
	previewKey: string | null;
	priceMinorCached: number;
	createdAt: Date;
	updatedAt: Date;
};

export interface DesignRepository {
	save(design: SavedDesign): Promise<SavedDesign>;
	getById(id: string): Promise<SavedDesign | null>;
	listByUser(userId: string): Promise<SavedDesign[]>;
}
