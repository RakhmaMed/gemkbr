/**
 * Map a pointer angle on the bracelet circle to an insertion index
 * in the item list after the dragged item is removed (moveItem semantics).
 *
 * Uses gaps between consecutive remaining beads in ring order (array order,
 * wrapping from last → first), so the layout seam stays consistent.
 */
export function insertIndexForAngle(
	orderedIds: string[],
	anglesById: ReadonlyMap<string, number>,
	draggedId: string,
	pointerAngle: number,
): number {
	const others = orderedIds.filter((id) => id !== draggedId);
	if (others.length === 0) return 0;

	const tau = Math.PI * 2;
	const norm = (angle: number) => {
		let a = angle % tau;
		if (a < 0) a += tau;
		return a;
	};

	const target = norm(pointerAngle);

	for (let i = 0; i < others.length; i++) {
		const currentId = others[i]!;
		const nextId = others[(i + 1) % others.length]!;
		const a1 = norm(anglesById.get(currentId) ?? 0);
		const a2 = norm(anglesById.get(nextId) ?? 0);

		let gap = a2 - a1;
		if (gap <= 0) gap += tau;

		let fromStart = target - a1;
		if (fromStart < 0) fromStart += tau;

		if (fromStart <= gap) {
			// Insert after `others[i]` in the reduced list.
			return i + 1;
		}
	}

	return others.length;
}

export function angleFromPoint(x: number, z: number): number {
	return Math.atan2(z, x);
}
