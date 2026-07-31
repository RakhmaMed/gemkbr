import type { BraceletTemplate, ComponentDimensions, ComponentKind } from '../../domain/bracelet';

export type CatalogComponent = {
	id: string;
	slug: string;
	name: string;
	kind: ComponentKind;
	material: string;
	colorGroup: string;
	imageUrl: string;
	tags: string[];
	active: boolean;
};

export type CatalogComponentVariant = ComponentDimensions & {
	componentId: string;
	sku: string;
	visualPresetId: string;
	imageUrl: string;
	stockQuantity: number | null;
	name: string;
};

export type CatalogProduct = {
	id: string;
	slug: string;
	name: string;
	description: string;
	categoryId: string | null;
	imageUrl: string;
	active: boolean;
	variants: Array<{
		id: string;
		sku: string;
		priceMinor: number;
		stockQuantity: number | null;
		active: boolean;
	}>;
};

export interface CatalogRepository {
	listActiveProducts(): Promise<CatalogProduct[]>;
	getProductBySlug(slug: string): Promise<CatalogProduct | null>;
	listActiveComponents(): Promise<CatalogComponent[]>;
	listActiveComponentVariants(): Promise<CatalogComponentVariant[]>;
	getComponentVariantsByIds(ids: string[]): Promise<CatalogComponentVariant[]>;
	getBraceletTemplate(id: string): Promise<BraceletTemplate | null>;
	listBraceletTemplates(): Promise<BraceletTemplate[]>;
}
