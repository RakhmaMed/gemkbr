import type { BraceletDesign } from '../types';

/** Future design JSON migrations live here (v1 -> v2, ...). */
export function migrateDesign(raw: unknown): BraceletDesign {
	const design = raw as BraceletDesign;
	if (!design || typeof design !== 'object') {
		throw new Error('Invalid bracelet design payload');
	}
	if (design.schemaVersion === 1) return design;
	throw new Error(`Unsupported bracelet design schemaVersion: ${String((design as { schemaVersion?: unknown }).schemaVersion)}`);
}
