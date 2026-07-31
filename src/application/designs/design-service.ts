import {
	calculatePrice,
	validateDesign,
	type BraceletDesign,
} from '../../domain/bracelet';
import { createId } from '../../lib/id';
import type { CatalogRepository } from '../../server/repositories/catalog-repository';
import type { DesignRepository } from '../../server/repositories/design-repository';

export class DesignService {
	constructor(
		private readonly catalog: CatalogRepository,
		private readonly designs: DesignRepository,
	) {}

	async priceAndValidate(design: BraceletDesign) {
		const template = await this.catalog.getBraceletTemplate(design.templateId);
		const variantIds = design.items.map((item) => item.variantId);
		const variants = await this.catalog.getComponentVariantsByIds(variantIds);
		const map = new Map(variants.map((v) => [v.variantId, v]));
		const validation = validateDesign(design, template, map);
		const priceMinor = calculatePrice(design, map);
		return { validation, priceMinor, variants, template };
	}

	async saveDesign(input: {
		design: BraceletDesign;
		userId: string | null;
		designId?: string;
		previewKey?: string | null;
	}) {
		const { validation, priceMinor } = await this.priceAndValidate(input.design);
		if (!validation.ok) {
			return { ok: false as const, issues: validation.issues };
		}
		const now = new Date();
		const saved = await this.designs.save({
			id: input.designId ?? createId(),
			userId: input.userId,
			templateId: input.design.templateId,
			targetWristMm: input.design.targetWristMm,
			design: input.design,
			previewKey: input.previewKey ?? null,
			priceMinorCached: priceMinor,
			createdAt: now,
			updatedAt: now,
		});
		return { ok: true as const, design: saved, priceMinor };
	}
}
