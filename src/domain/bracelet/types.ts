export type ComponentKind = 'bead' | 'spacer' | 'charm';

export type BraceletItem = {
	id: string;
	variantId: string;
};

export type BraceletDesign = {
	schemaVersion: 1;
	templateId: string;
	targetWristMm: number;
	items: BraceletItem[];
};

export type BraceletTemplate = {
	id: string;
	name: string;
	fitAllowanceMm: number;
	minWristMm: number;
	maxWristMm: number;
};

export type ComponentDimensions = {
	variantId: string;
	diameterMm: number;
	axialLengthMm: number;
	active: boolean;
	kind: ComponentKind;
	priceMinor: number;
	name?: string;
	sku?: string;
};

export type LayoutPose = {
	itemId: string;
	position: [number, number, number];
	rotation: [number, number, number];
	scale: number;
};

export type FitStatus = 'too_short' | 'ready' | 'too_long';

export type FitResult = {
	currentLengthMm: number;
	targetCircumferenceMm: number;
	deltaMm: number;
	status: FitStatus;
};

export type ValidationIssue = {
	code: string;
	message: string;
	itemId?: string;
	variantId?: string;
};

export type ValidationResult = {
	ok: boolean;
	issues: ValidationIssue[];
};

export const BRACELET_SCHEMA_VERSION = 1 as const;
export const FIT_READY_TOLERANCE_MM = 2;
