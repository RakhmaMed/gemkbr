import fs from 'node:fs';
import path from 'node:path';
import { getSqlite, closeDb } from '../src/server/db/client';

function readJson<T>(file: string): T {
	return JSON.parse(fs.readFileSync(path.resolve('seed', file), 'utf8')) as T;
}

async function seed() {
	const sqlite = getSqlite();

	const categories = readJson<
		Array<{ id: string; slug: string; name: string; sortOrder: number }>
	>('categories.json');
	const products = readJson<
		Array<{
			id: string;
			slug: string;
			name: string;
			description: string;
			categoryId: string;
			active: boolean;
			variants: Array<{
				id: string;
				sku: string;
				priceMinor: number;
				stockQuantity: number | null;
				active: boolean;
			}>;
		}>
	>('products.json');
	const components = readJson<
		Array<{
			id: string;
			slug: string;
			name: string;
			kind: string;
			material: string;
			colorGroup: string;
			imageUrl?: string;
			tags: string[];
			active: boolean;
		}>
	>('components.json');
	const variants = readJson<
		Array<{
			id: string;
			componentId: string;
			sku: string;
			diameterMm: number;
			axialLengthMm: number;
			priceMinor: number;
			visualPresetId: string;
			stockQuantity: number | null;
			active: boolean;
		}>
	>('component-variants.json');
	const templates = readJson<
		Array<{
			id: string;
			name: string;
			fitAllowanceMm: number;
			minWristMm: number;
			maxWristMm: number;
			configJson: string;
			active: boolean;
		}>
	>('bracelet-templates.json');

	const upsertCategory = sqlite.prepare(`
    INSERT INTO categories (id, slug, name, sort_order)
    VALUES (@id, @slug, @name, @sortOrder)
    ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, sort_order=excluded.sort_order
  `);
	for (const row of categories) upsertCategory.run(row);

	const upsertProduct = sqlite.prepare(`
    INSERT INTO products (id, slug, name, description, category_id, active)
    VALUES (@id, @slug, @name, @description, @categoryId, @active)
    ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, name=excluded.name, description=excluded.description,
      category_id=excluded.category_id, active=excluded.active
  `);
	const upsertProductVariant = sqlite.prepare(`
    INSERT INTO product_variants (id, product_id, sku, price_minor, stock_quantity, active)
    VALUES (@id, @productId, @sku, @priceMinor, @stockQuantity, @active)
    ON CONFLICT(id) DO UPDATE SET
      product_id=excluded.product_id, sku=excluded.sku, price_minor=excluded.price_minor,
      stock_quantity=excluded.stock_quantity, active=excluded.active
  `);

	for (const product of products) {
		upsertProduct.run({
			id: product.id,
			slug: product.slug,
			name: product.name,
			description: product.description,
			categoryId: product.categoryId,
			active: product.active ? 1 : 0,
		});
		for (const variant of product.variants) {
			upsertProductVariant.run({
				id: variant.id,
				productId: product.id,
				sku: variant.sku,
				priceMinor: variant.priceMinor,
				stockQuantity: variant.stockQuantity,
				active: variant.active ? 1 : 0,
			});
		}
	}

	const upsertComponent = sqlite.prepare(`
    INSERT INTO components (id, slug, name, kind, material, color_group, image_url, tags_json, active)
    VALUES (@id, @slug, @name, @kind, @material, @colorGroup, @imageUrl, @tagsJson, @active)
    ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, name=excluded.name, kind=excluded.kind, material=excluded.material,
      color_group=excluded.color_group, image_url=excluded.image_url, tags_json=excluded.tags_json,
      active=excluded.active
  `);
	for (const row of components) {
		upsertComponent.run({
			id: row.id,
			slug: row.slug,
			name: row.name,
			kind: row.kind,
			material: row.material,
			colorGroup: row.colorGroup,
			imageUrl: row.imageUrl ?? '',
			tagsJson: JSON.stringify(row.tags),
			active: row.active ? 1 : 0,
		});
	}

	const keepComponentIds = components.map((c) => c.id);
	if (keepComponentIds.length > 0) {
		sqlite
			.prepare(
				`UPDATE components SET active = 0 WHERE id NOT IN (${keepComponentIds.map(() => '?').join(',')})`,
			)
			.run(...keepComponentIds);
	}

	const upsertVariant = sqlite.prepare(`
    INSERT INTO component_variants (
      id, component_id, sku, diameter_mm, axial_length_mm, price_minor,
      visual_preset_id, stock_quantity, active
    ) VALUES (
      @id, @componentId, @sku, @diameterMm, @axialLengthMm, @priceMinor,
      @visualPresetId, @stockQuantity, @active
    )
    ON CONFLICT(id) DO UPDATE SET
      component_id=excluded.component_id, sku=excluded.sku, diameter_mm=excluded.diameter_mm,
      axial_length_mm=excluded.axial_length_mm, price_minor=excluded.price_minor,
      visual_preset_id=excluded.visual_preset_id, stock_quantity=excluded.stock_quantity,
      active=excluded.active
  `);
	for (const row of variants) {
		upsertVariant.run({ ...row, active: row.active ? 1 : 0 });
	}

	const keepVariantIds = variants.map((v) => v.id);
	if (keepVariantIds.length > 0) {
		sqlite
			.prepare(
				`UPDATE component_variants SET active = 0 WHERE id NOT IN (${keepVariantIds.map(() => '?').join(',')})`,
			)
			.run(...keepVariantIds);
	}

	const upsertTemplate = sqlite.prepare(`
    INSERT INTO bracelet_templates (
      id, name, fit_allowance_mm, min_wrist_mm, max_wrist_mm, config_json, active
    ) VALUES (
      @id, @name, @fitAllowanceMm, @minWristMm, @maxWristMm, @configJson, @active
    )
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, fit_allowance_mm=excluded.fit_allowance_mm,
      min_wrist_mm=excluded.min_wrist_mm, max_wrist_mm=excluded.max_wrist_mm,
      config_json=excluded.config_json, active=excluded.active
  `);
	for (const row of templates) {
		upsertTemplate.run({ ...row, active: row.active ? 1 : 0 });
	}

	closeDb();
	console.log('Seed complete');
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
