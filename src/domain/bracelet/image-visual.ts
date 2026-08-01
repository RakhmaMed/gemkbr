/**
 * Per-photo layout for top-down bracelet canvas.
 * Content size/center are normalized 0–1 relative to the source image.
 */
export type ComponentImageVisual = {
	contentWidth: number;
	contentHeight: number;
	centerX: number;
	centerY: number;
	imageWidth: number;
	imageHeight: number;
};

/** Catalog webps are ~512² with the opaque bead only ~60% of the frame. */
export const DEFAULT_BEAD_VISUAL: ComponentImageVisual = {
	contentWidth: 0.6,
	contentHeight: 0.6,
	centerX: 0.5,
	centerY: 0.5,
	imageWidth: 512,
	imageHeight: 512,
};

export function resolveImageVisual(visual?: ComponentImageVisual | null): ComponentImageVisual {
	if (!visual) return DEFAULT_BEAD_VISUAL;
	return {
		contentWidth: visual.contentWidth > 0 ? visual.contentWidth : DEFAULT_BEAD_VISUAL.contentWidth,
		contentHeight: visual.contentHeight > 0 ? visual.contentHeight : DEFAULT_BEAD_VISUAL.contentHeight,
		centerX: Number.isFinite(visual.centerX) ? visual.centerX : 0.5,
		centerY: Number.isFinite(visual.centerY) ? visual.centerY : 0.5,
		imageWidth: visual.imageWidth > 0 ? visual.imageWidth : DEFAULT_BEAD_VISUAL.imageWidth,
		imageHeight: visual.imageHeight > 0 ? visual.imageHeight : DEFAULT_BEAD_VISUAL.imageHeight,
	};
}

export function parseImageVisual(raw: string | null | undefined): ComponentImageVisual | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<ComponentImageVisual>;
		if (
			typeof parsed.contentWidth !== 'number' ||
			typeof parsed.contentHeight !== 'number' ||
			typeof parsed.imageWidth !== 'number' ||
			typeof parsed.imageHeight !== 'number'
		) {
			return null;
		}
		return resolveImageVisual({
			contentWidth: parsed.contentWidth,
			contentHeight: parsed.contentHeight,
			centerX: typeof parsed.centerX === 'number' ? parsed.centerX : 0.5,
			centerY: typeof parsed.centerY === 'number' ? parsed.centerY : 0.5,
			imageWidth: parsed.imageWidth,
			imageHeight: parsed.imageHeight,
		});
	} catch {
		return null;
	}
}
