import { calculateLength, type DimensionMap } from './length';
import {
	FIT_READY_TOLERANCE_MM,
	type BraceletDesign,
	type BraceletTemplate,
	type FitResult,
	type FitStatus,
} from './types';

export function targetCircumferenceMm(design: BraceletDesign, template: BraceletTemplate): number {
	return design.targetWristMm + template.fitAllowanceMm;
}

export function calculateFit(
	design: BraceletDesign,
	template: BraceletTemplate,
	dimensions: DimensionMap,
	toleranceMm = FIT_READY_TOLERANCE_MM,
): FitResult {
	const currentLengthMm = calculateLength(design, dimensions);
	const target = targetCircumferenceMm(design, template);
	const deltaMm = currentLengthMm - target;
	let status: FitStatus = 'ready';
	if (deltaMm < -toleranceMm) status = 'too_short';
	else if (deltaMm > toleranceMm) status = 'too_long';

	return {
		currentLengthMm,
		targetCircumferenceMm: target,
		deltaMm,
		status,
	};
}

export function formatFitMessage(fit: FitResult): string {
	const lengthCm = (fit.currentLengthMm / 10).toFixed(1);
	if (fit.status === 'ready') {
		return `${lengthCm} см · Посадка готова`;
	}
	if (fit.status === 'too_short') {
		return `${lengthCm} см · Нужно ещё около ${Math.abs(Math.round(fit.deltaMm))} мм`;
	}
	return `${lengthCm} см · Длиннее на ${Math.round(fit.deltaMm)} мм`;
}

export function formatFitBadge(fit: FitResult): string {
	if (fit.status === 'ready') return 'Посадка готова';
	if (fit.status === 'too_short') return 'Мало для запястья';
	return 'Слишком длинный';
}
