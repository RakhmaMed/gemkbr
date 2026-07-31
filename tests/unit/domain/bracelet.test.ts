import { describe, expect, it } from 'vitest';
import {
	addItem,
	calculateFit,
	calculateLength,
	calculatePrice,
	createEmptyDesign,
	layoutBracelet,
	moveItem,
	removeItem,
	replaceItem,
	validateDesign,
	type BraceletTemplate,
	type ComponentDimensions,
} from '../../../src/domain/bracelet';

function dims(
	entries: Array<Partial<ComponentDimensions> & Pick<ComponentDimensions, 'variantId' | 'axialLengthMm' | 'priceMinor'>>,
): Map<string, ComponentDimensions> {
	return new Map(
		entries.map((entry) => [
			entry.variantId,
			{
				variantId: entry.variantId,
				diameterMm: entry.diameterMm ?? entry.axialLengthMm,
				axialLengthMm: entry.axialLengthMm,
				priceMinor: entry.priceMinor,
				active: entry.active ?? true,
				kind: entry.kind ?? 'bead',
				name: entry.name,
				sku: entry.sku,
			},
		]),
	);
}

const template: BraceletTemplate = {
	id: 'elastic-bracelet',
	name: 'Эластичный браслет',
	fitAllowanceMm: 8,
	minWristMm: 130,
	maxWristMm: 220,
};

describe('bracelet domain', () => {
	it('adds 8mm bead and increases length', () => {
		let design = createEmptyDesign(template.id, 165);
		design = addItem(design, 'pink-8');
		const map = dims([{ variantId: 'pink-8', axialLengthMm: 8, priceMinor: 12000 }]);
		expect(calculateLength(design, map)).toBe(8);
		expect(calculatePrice(design, map)).toBe(12000);
	});

	it('removes item and decreases length', () => {
		let design = createEmptyDesign(template.id, 165);
		design = addItem(design, 'pink-8');
		design = addItem(design, 'pink-10');
		const map = dims([
			{ variantId: 'pink-8', axialLengthMm: 8, priceMinor: 10000 },
			{ variantId: 'pink-10', axialLengthMm: 10, priceMinor: 14000 },
		]);
		const firstId = design.items[0]!.id;
		design = removeItem(design, firstId);
		expect(calculateLength(design, map)).toBe(10);
		expect(calculatePrice(design, map)).toBe(14000);
	});

	it('reorder does not change price', () => {
		let design = createEmptyDesign(template.id, 165);
		design = addItem(design, 'a');
		design = addItem(design, 'b');
		const map = dims([
			{ variantId: 'a', axialLengthMm: 6, priceMinor: 5000 },
			{ variantId: 'b', axialLengthMm: 12, priceMinor: 15000 },
		]);
		const before = calculatePrice(design, map);
		design = moveItem(design, design.items[0]!.id, 1);
		expect(calculatePrice(design, map)).toBe(before);
		expect(design.items.map((i) => i.variantId)).toEqual(['b', 'a']);
	});

	it('replace updates price and length', () => {
		let design = createEmptyDesign(template.id, 165);
		design = addItem(design, 'pink-8');
		const map = dims([
			{ variantId: 'pink-8', axialLengthMm: 8, priceMinor: 10000 },
			{ variantId: 'pink-12', axialLengthMm: 12, priceMinor: 18000 },
		]);
		design = replaceItem(design, design.items[0]!.id, 'pink-12');
		expect(calculateLength(design, map)).toBe(12);
		expect(calculatePrice(design, map)).toBe(18000);
	});

	it('mixed size layout uses different angles', () => {
		let design = createEmptyDesign(template.id, 165);
		design = addItem(design, '6');
		design = addItem(design, '12');
		const map = dims([
			{ variantId: '6', diameterMm: 6, axialLengthMm: 6, priceMinor: 1 },
			{ variantId: '12', diameterMm: 12, axialLengthMm: 12, priceMinor: 1 },
		]);
		const poses = layoutBracelet(design, map, 20);
		expect(poses).toHaveLength(2);
		const [a, b] = poses;
		expect(a!.scale).toBeCloseTo(6, 5);
		expect(b!.scale).toBeCloseTo(12, 5);
		expect(a!.position[0]).not.toBeCloseTo(b!.position[0], 1);
	});

	it('packs equal beads flush on the circle', () => {
		let design = createEmptyDesign(template.id, 165);
		const map = dims([{ variantId: '8', diameterMm: 8, axialLengthMm: 8, priceMinor: 1 }]);
		for (let i = 0; i < 8; i += 1) design = addItem(design, '8');
		const poses = layoutBracelet(design, map);
		expect(poses).toHaveLength(8);
		const a = poses[0]!;
		const b = poses[1]!;
		const chord = Math.hypot(
			a.position[0] - b.position[0],
			a.position[2] - b.position[2],
		);
		// Neighbor centers should sit about one diameter apart (small chord≈arc error).
		expect(chord).toBeGreaterThan(7.5);
		expect(chord).toBeLessThan(8.2);
		expect(a.scale).toBe(8);
	});

	it('rejects inactive and unknown variants', () => {
		let design = createEmptyDesign(template.id, 165);
		design = addItem(design, 'gone');
		design = addItem(design, 'inactive');
		const map = dims([
			{ variantId: 'inactive', axialLengthMm: 8, priceMinor: 1, active: false },
		]);
		const result = validateDesign(design, template, map);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.code === 'unknown_variant')).toBe(true);
		expect(result.issues.some((i) => i.code === 'inactive_variant')).toBe(true);
	});

	it('calculates fit against wrist + allowance', () => {
		let design = createEmptyDesign(template.id, 165);
		const map = dims([{ variantId: 'bead', axialLengthMm: 10, priceMinor: 1 }]);
		for (let i = 0; i < 17; i += 1) design = addItem(design, 'bead');
		// 170 mm length, target = 165 + 8 = 173 → too_short by 3, outside ±2
		const fitShort = calculateFit(design, template, map);
		expect(fitShort.targetCircumferenceMm).toBe(173);
		expect(fitShort.status).toBe('too_short');

		design = addItem(design, 'bead'); // 180
		const fitLong = calculateFit(design, template, map);
		expect(fitLong.status).toBe('too_long');
	});

	it('ignores client-supplied totals — price is derived from variants', () => {
		let design = createEmptyDesign(template.id, 165);
		design = addItem(design, 'pink-8');
		const map = dims([{ variantId: 'pink-8', axialLengthMm: 8, priceMinor: 999 }]);
		const clientClaimed = 1;
		expect(calculatePrice(design, map)).not.toBe(clientClaimed);
		expect(calculatePrice(design, map)).toBe(999);
	});
});
