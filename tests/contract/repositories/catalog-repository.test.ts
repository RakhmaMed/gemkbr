import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../../src/server/db/schema';
import { SqliteCatalogRepository } from '../../../src/server/repositories/sqlite-catalog-repository';

describe('CatalogRepository contract (sqlite)', () => {
	let dbPath = '';
	let sqlite: Database.Database;
	let repo: SqliteCatalogRepository;

	beforeEach(() => {
		dbPath = path.join(os.tmpdir(), `gemkbr-catalog-${Date.now()}.db`);
		sqlite = new Database(dbPath);
		sqlite.pragma('foreign_keys = ON');
		sqlite.exec(`
      CREATE TABLE components (
        id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, kind TEXT NOT NULL,
        material TEXT NOT NULL, color_group TEXT NOT NULL, image_url TEXT NOT NULL DEFAULT '',
        tags_json TEXT NOT NULL, active INTEGER NOT NULL
      );
      CREATE TABLE component_variants (
        id TEXT PRIMARY KEY, component_id TEXT NOT NULL REFERENCES components(id), sku TEXT NOT NULL UNIQUE,
        diameter_mm INTEGER NOT NULL, axial_length_mm INTEGER NOT NULL, price_minor INTEGER NOT NULL,
        visual_preset_id TEXT NOT NULL, stock_quantity INTEGER, active INTEGER NOT NULL
      );
      CREATE TABLE bracelet_templates (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, fit_allowance_mm INTEGER NOT NULL,
        min_wrist_mm INTEGER NOT NULL, max_wrist_mm INTEGER NOT NULL, config_json TEXT NOT NULL, active INTEGER NOT NULL
      );
      CREATE TABLE categories (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, sort_order INTEGER NOT NULL);
      CREATE TABLE products (
        id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL,
        category_id TEXT, image_url TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL
      );
      CREATE TABLE product_variants (
        id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), sku TEXT NOT NULL UNIQUE,
        price_minor INTEGER NOT NULL, stock_quantity INTEGER, active INTEGER NOT NULL
      );
    `);
		sqlite
			.prepare(
				`INSERT INTO components VALUES ('c1','pink','Pink','bead','stone','pink','https://example.com/pink.webp','[]',1)`,
			)
			.run();
		sqlite
			.prepare(
				`INSERT INTO component_variants VALUES ('pink-8','c1','PM-8',8,8,12000,'polished-stone',10,1)`,
			)
			.run();
		sqlite
			.prepare(
				`INSERT INTO bracelet_templates VALUES ('elastic-bracelet','Elastic',8,130,220,'{}',1)`,
			)
			.run();
		const db = drizzle(sqlite, { schema });
		repo = new SqliteCatalogRepository(db);
	});

	afterEach(() => {
		sqlite.close();
		fs.rmSync(dbPath, { force: true });
	});

	it('lists active component variants with dimensions', async () => {
		const variants = await repo.listActiveComponentVariants();
		expect(variants).toHaveLength(1);
		expect(variants[0]?.axialLengthMm).toBe(8);
		expect(variants[0]?.diameterMm).toBe(8);
	});

	it('loads bracelet template', async () => {
		const template = await repo.getBraceletTemplate('elastic-bracelet');
		expect(template?.fitAllowanceMm).toBe(8);
	});
});
