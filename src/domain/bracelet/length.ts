import type { BraceletDesign, ComponentDimensions } from './types';

export type DimensionMap = ReadonlyMap<string, ComponentDimensions>;

export function calculateLength(design: BraceletDesign, dimensions: DimensionMap): number {
	let total = 0;
	for (const item of design.items) {
		const dim = dimensions.get(item.variantId);
		if (!dim) continue;
		total += dim.axialLengthMm;
	}
	return total;
}
