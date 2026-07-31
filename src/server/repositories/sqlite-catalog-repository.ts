import { eq } from 'drizzle-orm';
import type { BraceletTemplate } from '../../domain/bracelet';
import type { AppDb } from '../db/client';
import {
	braceletTemplates,
	componentVariants,
	components,
	productVariants,
	products,
} from '../db/schema';
import type {
	CatalogComponent,
	CatalogComponentVariant,
	CatalogProduct,
	CatalogRepository,
} from './catalog-repository';

export class SqliteCatalogRepository implements CatalogRepository {
	constructor(private readonly db: AppDb) {}

	async listActiveProducts(): Promise<CatalogProduct[]> {
		const rows = await this.db.select().from(products).where(eq(products.active, true));
		const variants = await this.db
			.select()
			.from(productVariants)
			.where(eq(productVariants.active, true));
		return rows.map((product) => ({
			id: product.id,
			slug: product.slug,
			name: product.name,
			description: product.description,
			categoryId: product.categoryId,
			active: product.active,
			variants: variants
				.filter((v) => v.productId === product.id)
				.map((v) => ({
					id: v.id,
					sku: v.sku,
					priceMinor: v.priceMinor,
					stockQuantity: v.stockQuantity,
					active: v.active,
				})),
		}));
	}

	async getProductBySlug(slug: string): Promise<CatalogProduct | null> {
		const all = await this.listActiveProducts();
		return all.find((p) => p.slug === slug) ?? null;
	}

	async listActiveComponents(): Promise<CatalogComponent[]> {
		const rows = await this.db.select().from(components).where(eq(components.active, true));
		return rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			name: row.name,
			kind: row.kind as CatalogComponent['kind'],
			material: row.material,
			colorGroup: row.colorGroup,
			imageUrl: row.imageUrl,
			tags: JSON.parse(row.tagsJson) as string[],
			active: row.active,
		}));
	}

	async listActiveComponentVariants(): Promise<CatalogComponentVariant[]> {
		const rows = await this.db
			.select({
				variant: componentVariants,
				component: components,
			})
			.from(componentVariants)
			.innerJoin(components, eq(componentVariants.componentId, components.id))
			.where(eq(componentVariants.active, true));

		return rows.map(({ variant, component }) => ({
			variantId: variant.id,
			componentId: variant.componentId,
			sku: variant.sku,
			diameterMm: variant.diameterMm,
			axialLengthMm: variant.axialLengthMm,
			priceMinor: variant.priceMinor,
			visualPresetId: variant.visualPresetId,
			imageUrl: component.imageUrl,
			stockQuantity: variant.stockQuantity,
			active: variant.active && component.active,
			kind: component.kind as CatalogComponentVariant['kind'],
			name: component.name,
		}));
	}

	async getComponentVariantsByIds(ids: string[]): Promise<CatalogComponentVariant[]> {
		if (ids.length === 0) return [];
		const all = await this.listActiveComponentVariants();
		const wanted = new Set(ids);
		return all.filter((v) => wanted.has(v.variantId));
	}

	async getBraceletTemplate(id: string): Promise<BraceletTemplate | null> {
		const [row] = await this.db
			.select()
			.from(braceletTemplates)
			.where(eq(braceletTemplates.id, id))
			.limit(1);
		if (!row) return null;
		return {
			id: row.id,
			name: row.name,
			fitAllowanceMm: row.fitAllowanceMm,
			minWristMm: row.minWristMm,
			maxWristMm: row.maxWristMm,
		};
	}

	async listBraceletTemplates(): Promise<BraceletTemplate[]> {
		const rows = await this.db
			.select()
			.from(braceletTemplates)
			.where(eq(braceletTemplates.active, true));
		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			fitAllowanceMm: row.fitAllowanceMm,
			minWristMm: row.minWristMm,
			maxWristMm: row.maxWristMm,
		}));
	}
}
