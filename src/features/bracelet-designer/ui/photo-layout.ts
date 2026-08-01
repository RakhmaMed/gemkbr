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
 */
export function radialRotationDeg(x: number, z: number): number {
	return (Math.atan2(x, -z) * 180) / Math.PI;
}

export function shouldRadialRotate(kind: string): boolean {
	return kind === 'spacer' || kind === 'charm';
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
