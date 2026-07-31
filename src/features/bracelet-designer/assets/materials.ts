export type VisualPresetId =
	| 'polished-stone'
	| 'matte-stone'
	| 'metal'
	| 'pearl'
	| 'glass';

export type MaterialPreset = {
	color: string;
	roughness: number;
	metalness: number;
	clearcoat?: number;
	clearcoatRoughness?: number;
	envMapIntensity?: number;
	ior?: number;
	transmission?: number;
	thickness?: number;
	sheen?: number;
	sheenColor?: string;
	sheenRoughness?: number;
};

export const MATERIAL_PRESETS: Record<VisualPresetId, MaterialPreset> = {
	'polished-stone': {
		color: '#e8b7c8',
		roughness: 0.22,
		metalness: 0.08,
		clearcoat: 0.55,
		clearcoatRoughness: 0.2,
		envMapIntensity: 1.1,
	},
	'matte-stone': {
		color: '#2a2a2e',
		roughness: 0.78,
		metalness: 0.04,
		envMapIntensity: 0.45,
	},
	metal: {
		color: '#c5ccd4',
		roughness: 0.18,
		metalness: 1,
		envMapIntensity: 1.35,
	},
	pearl: {
		color: '#f4ece1',
		roughness: 0.32,
		metalness: 0.05,
		clearcoat: 0.7,
		clearcoatRoughness: 0.25,
		sheen: 0.85,
		sheenColor: '#ffe8d6',
		sheenRoughness: 0.35,
		envMapIntensity: 0.9,
	},
	glass: {
		color: '#b7e2f0',
		roughness: 0.08,
		metalness: 0.05,
		clearcoat: 1,
		clearcoatRoughness: 0.05,
		transmission: 0.45,
		thickness: 0.6,
		ior: 1.45,
		envMapIntensity: 1.4,
	},
};

export function resolveMaterial(presetId: string): MaterialPreset {
	return MATERIAL_PRESETS[presetId as VisualPresetId] ?? MATERIAL_PRESETS['polished-stone'];
}
