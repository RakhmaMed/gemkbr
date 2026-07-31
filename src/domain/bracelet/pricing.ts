import type { BraceletDesign } from './types';
import type { DimensionMap } from './length';
import { assertMoneyMinor, type MoneyMinor } from '../../lib/money';

export function calculatePrice(design: BraceletDesign, dimensions: DimensionMap): MoneyMinor {
	let total = 0;
	for (const item of design.items) {
		const dim = dimensions.get(item.variantId);
		if (!dim) continue;
		assertMoneyMinor(dim.priceMinor);
		total += dim.priceMinor;
	}
	return total;
}
