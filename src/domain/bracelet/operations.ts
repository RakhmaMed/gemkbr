import { createId } from '../../lib/id';
import type { BraceletDesign, BraceletItem } from './types';

function cloneDesign(design: BraceletDesign): BraceletDesign {
	return {
		...design,
		items: design.items.map((item) => ({ ...item })),
	};
}

export function createEmptyDesign(
	templateId: string,
	targetWristMm: number,
): BraceletDesign {
	return {
		schemaVersion: 1,
		templateId,
		targetWristMm,
		items: [],
	};
}

export function setWristSize(design: BraceletDesign, targetWristMm: number): BraceletDesign {
	return { ...cloneDesign(design), targetWristMm };
}

export function addItem(
	design: BraceletDesign,
	variantId: string,
	index?: number,
): BraceletDesign {
	const next = cloneDesign(design);
	const item: BraceletItem = { id: createId(), variantId };
	const at = index === undefined ? next.items.length : Math.max(0, Math.min(index, next.items.length));
	next.items.splice(at, 0, item);
	return next;
}

export function removeItem(design: BraceletDesign, itemId: string): BraceletDesign {
	const next = cloneDesign(design);
	next.items = next.items.filter((item) => item.id !== itemId);
	return next;
}

export function replaceItem(
	design: BraceletDesign,
	itemId: string,
	variantId: string,
): BraceletDesign {
	const next = cloneDesign(design);
	const item = next.items.find((entry) => entry.id === itemId);
	if (!item) return next;
	item.variantId = variantId;
	return next;
}

export function moveItem(
	design: BraceletDesign,
	itemId: string,
	toIndex: number,
): BraceletDesign {
	const next = cloneDesign(design);
	const fromIndex = next.items.findIndex((item) => item.id === itemId);
	if (fromIndex < 0) return next;
	const [item] = next.items.splice(fromIndex, 1);
	if (!item) return next;
	const clamped = Math.max(0, Math.min(toIndex, next.items.length));
	next.items.splice(clamped, 0, item);
	return next;
}

export function moveLeft(design: BraceletDesign, itemId: string): BraceletDesign {
	const index = design.items.findIndex((item) => item.id === itemId);
	if (index <= 0) return cloneDesign(design);
	return moveItem(design, itemId, index - 1);
}

export function moveRight(design: BraceletDesign, itemId: string): BraceletDesign {
	const index = design.items.findIndex((item) => item.id === itemId);
	if (index < 0 || index >= design.items.length - 1) return cloneDesign(design);
	return moveItem(design, itemId, index + 1);
}

export function clearDesign(design: BraceletDesign): BraceletDesign {
	return { ...cloneDesign(design), items: [] };
}

export function pieceCount(design: BraceletDesign): number {
	return design.items.length;
}
