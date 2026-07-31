import { describe, expect, it } from 'vitest';
import { angleFromPoint, insertIndexForAngle } from '../../../src/features/bracelet-designer/ui/circle-order';

describe('insertIndexForAngle', () => {
	const ids = ['a', 'b', 'c'];
	const angles = new Map([
		['a', 0],
		['b', (2 * Math.PI) / 3],
		['c', (4 * Math.PI) / 3],
	]);

	it('inserts between a and b', () => {
		expect(insertIndexForAngle(ids, angles, 'c', Math.PI / 3)).toBe(1);
	});

	it('inserts between b and c', () => {
		// Dragging `a` out leaves [b, c]; π sits in the b→c gap → insert at 1 → [b, a, c]
		expect(insertIndexForAngle(ids, angles, 'a', Math.PI)).toBe(1);
	});

	it('inserts in the wrap gap after the last bead', () => {
		// Dragging `b` leaves [a, c]; 5π/3 sits in c→a wrap → insert at 2 → [a, c, b]
		expect(insertIndexForAngle(ids, angles, 'b', (5 * Math.PI) / 3)).toBe(2);
	});

	it('angleFromPoint matches layout top bead', () => {
		expect(angleFromPoint(0, -1)).toBeCloseTo(-Math.PI / 2);
	});
});
