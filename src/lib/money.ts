/** Money amounts are always integer minor units (kopecks for RUB). */
export type MoneyMinor = number;

export const CURRENCY = 'RUB' as const;

export function formatRub(minor: MoneyMinor): string {
	const major = minor / 100;
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(major);
}

export function assertMoneyMinor(value: number): asserts value is MoneyMinor {
	if (!Number.isInteger(value) || value < 0) {
		throw new Error(`Invalid money minor amount: ${value}`);
	}
}
