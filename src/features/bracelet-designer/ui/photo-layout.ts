import {
	resolveImageVisual,
	type ComponentImageVisual,
} from '../../../domain/bracelet/image-visual';

export type { ComponentImageVisual } from '../../../domain/bracelet/image-visual';
export { resolveImageVisual, parseImageVisual, DEFAULT_BEAD_VISUAL } from '../../../domain/bracelet/image-visual';

/**
 * Square node size in layout millimetres so the larger opaque content
 * axis equals `diameterMm` after object-fit:contain.
 */
export function displayNodeMm(diameterMm: number, visual: ComponentImageVisual | null | undefined): number {
	const v = resolveImageVisual(visual);
	const fill = contentFillOfNode(v);
	return diameterMm / Math.max(fill, 0.01);
}

/** Opaque content's major axis as a fraction of the square display node. */
export function contentFillOfNode(visual: ComponentImageVisual | null | undefined): number {
	const v = resolveImageVisual(visual);
	const { contentWidth, contentHeight, imageWidth, imageHeight } = v;
	if (imageHeight >= imageWidth) {
		const aspect = imageWidth / imageHeight;
		return Math.max(contentWidth * aspect, contentHeight);
	}
	const invAspect = imageHeight / imageWidth;
	return Math.max(contentWidth, contentHeight * invAspect);
}

/**
 * Rotation in degrees so image "up" points radially outward.
 * Default photo orientation is vertical; at the top of the circle rotation is 0°.
 *
 * Range is (-180, 180]; values jump at the bottom of the circle. When animating
 * with CSS `transition` on `rotate`, pass successive values through
 * {@link unwrapDegrees} so the spin stays continuous across that seam.
 */
export function radialRotationDeg(x: number, z: number): number {
	return (Math.atan2(x, -z) * 180) / Math.PI;
}

/**
 * Charms hang outward: clasp/"up" of the photo points toward the bracelet centre.
 * Spacers (rings) stand with "up" pointing outward.
 */
export function itemRotationDeg(kind: string, x: number, z: number): number {
	if (!shouldRadialRotate(kind)) return 0;
	const outward = radialRotationDeg(x, z);
	return kind === 'charm' ? outward + 180 : outward;
}

/**
 * Shift `target` by ±360° so it is the nearest equivalent orientation to `previous`.
 * Keeps CSS rotate transitions from taking the long way across the atan2 branch cut.
 */
export function unwrapDegrees(previous: number, target: number): number {
	const delta = ((((target - previous) % 360) + 540) % 360) - 180;
	return previous + delta;
}

export function shouldRadialRotate(kind: string): boolean {
	return kind === 'spacer' || kind === 'charm';
}

/** True when the pose pin is the photo anchor (clasp), not the node centre. */
export function anchorsAtTop(kind: string): boolean {
	return kind === 'charm';
}

/** Content pivot inside the square node after object-fit:contain (CSS %). */
export function contentCenterInNodePct(visual: ComponentImageVisual | null | undefined): {
	xPct: number;
	yPct: number;
} {
	const v = resolveImageVisual(visual);
	const { centerX, centerY, imageWidth, imageHeight } = v;
	if (imageHeight >= imageWidth) {
		const dispW = imageWidth / imageHeight;
		const offsetX = (1 - dispW) / 2;
		return { xPct: (offsetX + centerX * dispW) * 100, yPct: centerY * 100 };
	}
	const dispH = imageHeight / imageWidth;
	const offsetY = (1 - dispH) / 2;
	return { xPct: centerX * 100, yPct: (offsetY + centerY * dispH) * 100 };
}
