import { describe, expect, it } from 'vitest';
import {
	contentCenterInNodePct,
	contentFillOfNode,
	displayNodeMm,
	radialRotationDeg,
	shouldRadialRotate,
} from '../../../src/features/bracelet-designer/ui/photo-layout';
import {
	DEFAULT_BEAD_VISUAL,
	parseImageVisual,
	resolveImageVisual,
	type ComponentImageVisual,
} from '../../../src/domain/bracelet/image-visual';

const goldRingVisual: ComponentImageVisual = {
	contentWidth: 0.9725,
	contentHeight: 1,
	centerX: 0.5066,
	centerY: 0.4908,
	imageWidth: 182,
	imageHeight: 512,
};

describe('photo-layout', () => {
	it('keeps bead node oversized so 60% content fills diameterMm', () => {
		expect(displayNodeMm(8, DEFAULT_BEAD_VISUAL)).toBeCloseTo(8 / 0.6, 5);
		expect(contentFillOfNode(DEFAULT_BEAD_VISUAL)).toBeCloseTo(0.6, 5);
	});

	it('sizes tightly cropped vertical rings without the bead overscale', () => {
		expect(displayNodeMm(8, goldRingVisual)).toBeCloseTo(8, 5);
		expect(contentFillOfNode(goldRingVisual)).toBeCloseTo(1, 5);
	});

	it('rotates radially: vertical at top, 90° at right', () => {
		expect(radialRotationDeg(0, -10)).toBeCloseTo(0, 5);
		expect(radialRotationDeg(10, 0)).toBeCloseTo(90, 5);
		expect(radialRotationDeg(0, 10)).toBeCloseTo(180, 5);
		expect(radialRotationDeg(-10, 0)).toBeCloseTo(-90, 5);
	});

	it('rotates spacers and charms only', () => {
		expect(shouldRadialRotate('spacer')).toBe(true);
		expect(shouldRadialRotate('charm')).toBe(true);
		expect(shouldRadialRotate('bead')).toBe(false);
	});

	it('maps content center into the letterboxed node', () => {
		const { xPct, yPct } = contentCenterInNodePct(goldRingVisual);
		expect(yPct).toBeCloseTo(49.08, 1);
		// image is tall: letterboxed horizontally, center near mid
		expect(xPct).toBeGreaterThan(45);
		expect(xPct).toBeLessThan(55);
	});

	it('parses visual json and falls back to bead defaults', () => {
		expect(resolveImageVisual(null)).toEqual(DEFAULT_BEAD_VISUAL);
		const parsed = parseImageVisual(JSON.stringify(goldRingVisual));
		expect(parsed?.imageWidth).toBe(182);
		expect(parseImageVisual('')).toBeNull();
		expect(parseImageVisual('{')).toBeNull();
	});
});
