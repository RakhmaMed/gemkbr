import { calculateLength, type DimensionMap } from './length';
import type { BraceletDesign, LayoutPose } from './types';

/**
 * Circular layout: arc length along the bracelet is driven by axialLengthMm.
 * World units are millimetres. `scale` equals diameterMm so a unit-diameter
 * mesh (sphere radius 0.5) lands flush against neighbours.
 */
export function layoutBracelet(
	design: BraceletDesign,
	dimensions: DimensionMap,
	radiusMm?: number,
): LayoutPose[] {
	const totalLength = calculateLength(design, dimensions);
	if (totalLength <= 0 || design.items.length === 0) return [];

	const radius = radiusMm ?? Math.max(totalLength / (2 * Math.PI), 8);
	const poses: LayoutPose[] = [];
	let cursor = 0;

	for (const item of design.items) {
		const dim = dimensions.get(item.variantId);
		const axial = dim?.axialLengthMm ?? 0;
		const diameter = dim?.diameterMm ?? 8;
		const half = axial / 2;
		const centerArc = cursor + half;
		const angle = (centerArc / totalLength) * Math.PI * 2 - Math.PI / 2;
		const x = Math.cos(angle) * radius;
		const z = Math.sin(angle) * radius;

		poses.push({
			itemId: item.id,
			position: [x, 0, z],
			rotation: [0, -angle, 0],
			scale: diameter,
		});

		cursor += axial;
	}

	return poses;
}
