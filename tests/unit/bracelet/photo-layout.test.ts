import { describe, expect, it } from 'vitest';
import {
	anchorsAtTop,
	contentCenterInNodePct,
	contentFillOfNode,
	displayNodeMm,
	itemRotationDeg,
	radialRotationDeg,
	shouldRadialRotate,
	unwrapDegrees,
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

const charmVisual: ComponentImageVisual = {
	contentWidth: 0.56,
	contentHeight: 0.97,
	centerX: 0.5,
	centerY: 0.068,
	imageWidth: 512,
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

	it('hangs charms with clasp toward the bracelet centre', () => {
		expect(itemRotationDeg('spacer', 0, -10)).toBeCloseTo(0, 5);
		expect(itemRotationDeg('charm', 0, -10)).toBeCloseTo(180, 5);
		expect(itemRotationDeg('charm', 0, 10)).toBeCloseTo(360, 5);
		expect(itemRotationDeg('bead', 10, 0)).toBe(0);
	});

	it('unwraps rotations across the bottom so CSS does not spin 360°', () => {
		// Charm crossing bottom from the right (≈360°) toward the left (raw ≈0°).
		expect(unwrapDegrees(350, 10)).toBeCloseTo(370, 5);
		// Spacer crossing bottom: +179° → raw −179° continues to +181°.
		expect(unwrapDegrees(179, -179)).toBeCloseTo(181, 5);
		// Small steps stay put; equivalents within ±180 are unchanged.
		expect(unwrapDegrees(90, 100)).toBeCloseTo(100, 5);
		expect(unwrapDegrees(10, 350)).toBeCloseTo(-10, 5);
	});

	it('anchors charms at the top clasp', () => {
		expect(anchorsAtTop('charm')).toBe(true);
		expect(anchorsAtTop('spacer')).toBe(false);
		const { yPct } = contentCenterInNodePct(charmVisual);
		expect(yPct).toBeLessThan(15);
	});

	it('rotates spacers and charms only', () => {
		expect(shouldRadialRotate('spacer')).toBe(true);
		expect(shouldRadialRotate('charm')).toBe(true);
		expect(shouldRadialRotate('bead')).toBe(false);
	});

	it('maps content center into the letterboxed node', () => {
		const { xPct, yPct } = contentCenterInNodePct(goldRingVisual);
		expect(yPct).toBeCloseTo(49.08, 1);
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
