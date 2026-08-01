<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import type { ComponentImageVisual, LayoutPose } from '../../../domain/bracelet';
	import { angleFromPoint, insertIndexForAngle } from './circle-order';
	import {
		anchorsAtTop,
		contentCenterInNodePct,
		contentFillOfNode,
		displayNodeMm,
		itemRotationDeg,
		unwrapDegrees,
	} from './photo-layout';

	export type CanvasBead = {
		itemId: string;
		pose: LayoutPose;
		kind: string;
		imageUrl: string;
		visualPresetId: string;
		visual: ComponentImageVisual | null;
		diameterMm: number;
		axialLengthMm: number;
		name: string;
	};

	let {
		items = [],
		selectedItemId = null,
		onSelect,
		onReorder,
	}: {
		items: CanvasBead[];
		selectedItemId: string | null;
		onSelect?: (itemId: string) => void;
		onReorder?: (itemId: string, toIndex: number) => void;
	} = $props();

	/** Margin inside the square world so beads don't kiss the edge. */
	const PAD = 0.92;
	const DRAG_THRESHOLD_PX = 6;

	let worldEl = $state.raw<HTMLDivElement | undefined>(undefined);
	let hoveredId = $state<string | null>(null);
	/** Skip left/top transitions after tab restore — Firefox reflows and animates a flash. */
	let suppressMotion = $state(false);
	let suppressTimer: ReturnType<typeof setTimeout> | undefined;
	let drag = $state.raw<{
		itemId: string;
		pointerId: number;
		originIndex: number;
		toIndex: number;
		startClientX: number;
		startClientY: number;
		moved: boolean;
		angle: number;
		radiusMm: number;
	} | null>(null);

	function onVisibilityChange() {
		if (document.visibilityState !== 'visible') return;
		suppressMotion = true;
		clearTimeout(suppressTimer);
		suppressTimer = setTimeout(() => {
			suppressMotion = false;
		}, 120);
	}

	function displayDiameter(item: CanvasBead): number {
		return item.imageUrl ? displayNodeMm(item.diameterMm, item.visual) : item.diameterMm;
	}

	/** Half-extent of the bracelet in layout millimetres (includes visual bead radius). */
	const halfExtentMm = $derived.by(() => {
		if (items.length === 0) return 36;
		let max = 0;
		for (const item of items) {
			const [x, , z] = item.pose.position;
			const node = displayDiameter(item);
			// Charms hang outward from the clasp, so nearly the full node extends past the cord.
			const reach = Math.hypot(x, z) + (anchorsAtTop(item.kind) ? node : node / 2);
			if (reach > max) max = reach;
		}
		return Math.max(max, 12);
	});

	function toPct(mm: number): number {
		return (mm / halfExtentMm) * 50 * PAD;
	}

	function leftPct(x: number): number {
		return 50 + toPct(x);
	}

	function topPct(z: number): number {
		return 50 + toPct(z);
	}

	function sizePct(item: CanvasBead): number {
		return (displayDiameter(item) / (halfExtentMm * 2)) * 100 * PAD;
	}

	/** Selection / hit circle as % of the photo node (opaque content). */
	function contentSizePct(item: CanvasBead): number {
		return item.imageUrl ? contentFillOfNode(item.visual) * 100 : 100;
	}

	function nodeRotationDeg(item: CanvasBead, x: number, z: number): number {
		return itemRotationDeg(item.kind, x, z);
	}

	function nodeAnchorPct(item: CanvasBead): { xPct: number; yPct: number } {
		if (!item.imageUrl) return { xPct: 50, yPct: 50 };
		if (anchorsAtTop(item.kind) || item.kind === 'spacer') {
			return contentCenterInNodePct(item.visual);
		}
		return { xPct: 50, yPct: 50 };
	}

	const cordRadiusMm = $derived.by(() => {
		if (items.length === 0) return 28;
		return (
			items.reduce((sum, item) => sum + Math.hypot(item.pose.position[0], item.pose.position[2]), 0) /
			items.length
		);
	});

	const cordRadiusPct = $derived(toPct(cordRadiusMm));

	/** Preview order while dragging: live insert index without waiting for parent. */
	const viewItems = $derived.by(() => {
		if (!drag) return items;
		const next = items.slice();
		const from = next.findIndex((item) => item.itemId === drag!.itemId);
		if (from < 0) return items;
		const [item] = next.splice(from, 1);
		if (!item) return items;
		next.splice(drag.toIndex, 0, item);
		return next;
	});

	/** Layout positions for the preview order (mm). */
	const viewPoses = $derived.by(() => {
		const total = viewItems.reduce((sum, item) => sum + item.axialLengthMm, 0);
		if (total <= 0 || viewItems.length === 0) return new Map<string, { x: number; z: number }>();

		const radius = Math.max(total / (2 * Math.PI), 8);
		const poses = new Map<string, { x: number; z: number }>();
		let cursor = 0;

		for (const item of viewItems) {
			const half = item.axialLengthMm / 2;
			const centerArc = cursor + half;
			const angle = (centerArc / total) * Math.PI * 2 - Math.PI / 2;
			poses.set(item.itemId, {
				x: Math.cos(angle) * radius,
				z: Math.sin(angle) * radius,
			});
			cursor += item.axialLengthMm;
		}

		return poses;
	});

	function nodePosition(item: CanvasBead): { x: number; z: number } {
		if (drag && drag.itemId === item.itemId) {
			return {
				x: Math.cos(drag.angle) * drag.radiusMm,
				z: Math.sin(drag.angle) * drag.radiusMm,
			};
		}
		return viewPoses.get(item.itemId) ?? { x: item.pose.position[0], z: item.pose.position[2] };
	}

	/**
	 * Last CSS rotate used per item. atan2 jumps ±180° at the bottom of the
	 * circle; unwrapping keeps charm/spacer spin continuous for transitions.
	 */
	const prevNodeRotDeg = new Map<string, number>();

	const nodeRotDegById = $derived.by(() => {
		const next = new Map<string, number>();
		for (const item of viewItems) {
			const pos = nodePosition(item);
			const raw = nodeRotationDeg(item, pos.x, pos.z);
			const prev = prevNodeRotDeg.get(item.itemId);
			const value = prev === undefined ? raw : unwrapDegrees(prev, raw);
			next.set(item.itemId, value);
			prevNodeRotDeg.set(item.itemId, value);
		}
		for (const id of [...prevNodeRotDeg.keys()]) {
			if (!next.has(id)) prevNodeRotDeg.delete(id);
		}
		return next;
	});

	/** Map a pointer event to layout millimetres inside the square world. */
	function eventToMm(event: Pick<PointerEvent, 'clientX' | 'clientY'>): { x: number; z: number } | null {
		if (!worldEl) return null;
		const rect = worldEl.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;
		const ox = event.clientX - rect.left - rect.width / 2;
		const oy = event.clientY - rect.top - rect.height / 2;
		const scale = (2 * halfExtentMm) / (rect.width * PAD);
		return { x: ox * scale, z: oy * scale };
	}

	/**
	 * Prefer the bead whose centre is closest in normalised units,
	 * so a small bead wins clicks on its own core even when a larger
	 * neighbour's photo frame overlaps it.
	 */
	function hitTest(event: Pick<PointerEvent, 'clientX' | 'clientY'>): CanvasBead | null {
		const point = eventToMm(event);
		if (!point) return null;

		let best: CanvasBead | null = null;
		let bestScore = Infinity;

		for (const item of items) {
			const pos = nodePosition(item);
			const dist = Math.hypot(point.x - pos.x, point.z - pos.z);
			const radius = item.diameterMm / 2;
			if (dist > radius) continue;
			const score = radius > 0 ? dist / radius : dist;
			if (score < bestScore) {
				bestScore = score;
				best = item;
			}
		}

		return best;
	}

	function anglesById(): Map<string, number> {
		const map = new Map<string, number>();
		for (const item of items) {
			const [x, , z] = item.pose.position;
			map.set(item.itemId, angleFromPoint(x, z));
		}
		return map;
	}

	function onWorldPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		const hit = hitTest(event);
		if (!hit) return;

		const point = eventToMm(event);
		if (!point) return;

		const originIndex = items.findIndex((item) => item.itemId === hit.itemId);
		drag = {
			itemId: hit.itemId,
			pointerId: event.pointerId,
			originIndex,
			toIndex: originIndex,
			startClientX: event.clientX,
			startClientY: event.clientY,
			moved: false,
			angle: angleFromPoint(point.x, point.z),
			radiusMm: cordRadiusMm,
		};
		hoveredId = hit.itemId;
		onSelect?.(hit.itemId);
		worldEl?.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function onWorldPointerMove(event: PointerEvent) {
		if (drag && event.pointerId === drag.pointerId) {
			const dx = event.clientX - drag.startClientX;
			const dy = event.clientY - drag.startClientY;
			if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
				drag = { ...drag, moved: true };
			}

			const point = eventToMm(event);
			if (!point) return;

			const angle = angleFromPoint(point.x, point.z);
			const orderedIds = items.map((item) => item.itemId);
			const toIndex = insertIndexForAngle(orderedIds, anglesById(), drag.itemId, angle);
			drag = {
				...drag,
				angle,
				toIndex,
				radiusMm: cordRadiusMm,
			};
			hoveredId = drag.itemId;
			return;
		}

		hoveredId = hitTest(event)?.itemId ?? null;
	}

	function endDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;

		const finished = drag;
		drag = null;
		try {
			worldEl?.releasePointerCapture(event.pointerId);
		} catch {
			/* already released */
		}

		if (finished.moved && finished.toIndex !== finished.originIndex) {
			onReorder?.(finished.itemId, finished.toIndex);
		}
		hoveredId = hitTest(event)?.itemId ?? null;
	}

	function onWorldPointerUp(event: PointerEvent) {
		endDrag(event);
	}

	function onWorldPointerCancel(event: PointerEvent) {
		endDrag(event);
	}

	function onWorldPointerLeave() {
		if (!drag) hoveredId = null;
	}

	function onWorldKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (!hoveredId) return;
		event.preventDefault();
		onSelect?.(hoveredId);
	}

	function enterTransition(node: Element) {
		return scale(node, { duration: 380, start: 0.15, opacity: 0, easing: cubicOut });
	}

	function loadImage(src: string): Promise<HTMLImageElement | null> {
		return new Promise((resolve) => {
			const img = new Image();
			img.decoding = 'async';
			img.onload = () => resolve(img);
			img.onerror = () => resolve(null);
			img.src = src;
		});
	}

	/** Rasterize the current top-down bracelet for cart / saved-design previews. */
	export async function capturePreview(size = 512): Promise<string | null> {
		if (items.length === 0) return null;

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, size, size);

		const extent = halfExtentMm;
		const toPx = (mm: number) => (mm / (extent * 2)) * size * PAD;
		const center = size / 2;

		ctx.beginPath();
		ctx.arc(center, center, toPx(cordRadiusMm), 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(90, 72, 58, 0.22)';
		ctx.lineWidth = Math.max(2, size / 256);
		ctx.stroke();

		const uniqueUrls = [...new Set(items.map((item) => item.imageUrl).filter(Boolean))];
		const loaded = await Promise.all(uniqueUrls.map(async (url) => [url, await loadImage(url)] as const));
		const images = new Map(loaded);

		for (const item of items) {
			const [x, , z] = item.pose.position;
			const px = center + toPx(x);
			const py = center + toPx(z);
			const diameter = toPx(displayDiameter(item));
			const img = item.imageUrl ? images.get(item.imageUrl) : null;
			const rot = nodeRotationDeg(item, x, z) * (Math.PI / 180);
			const anchor = nodeAnchorPct(item);

			if (img) {
				const iw = img.naturalWidth || img.width;
				const ih = img.naturalHeight || img.height;
				const scale = Math.min(diameter / iw, diameter / ih);
				const dw = iw * scale;
				const dh = ih * scale;
				const ox = (diameter - dw) / 2;
				const oy = (diameter - dh) / 2;
				ctx.save();
				ctx.translate(px, py);
				ctx.rotate(rot);
				// Pin the visual anchor (centre for beads/rings, clasp for charms) at the pose.
				ctx.translate((-anchor.xPct / 100) * diameter, (-anchor.yPct / 100) * diameter);
				ctx.drawImage(img, ox, oy, dw, dh);
				ctx.restore();
			} else {
				ctx.beginPath();
				ctx.arc(px, py, diameter / 2, 0, Math.PI * 2);
				ctx.fillStyle = item.kind === 'spacer' ? '#9aa3ad' : '#e8b7c8';
				ctx.fill();
			}
		}

		try {
			return canvas.toDataURL('image/webp', 0.85);
		} catch {
			return canvas.toDataURL('image/png');
		}
	}
</script>

<svelte:document onvisibilitychange={onVisibilityChange} />

<div class="stage" role="img" aria-label="Вид браслета сверху">
	<div
		bind:this={worldEl}
		class="world"
		class:hot={hoveredId !== null || drag !== null}
		class:dragging={drag?.moved}
		class:suppress-motion={suppressMotion}
		role="listbox"
		tabindex="0"
		aria-label="Круг браслета"
		aria-activedescendant={selectedItemId}
		onkeydown={onWorldKeydown}
		onpointerdown={onWorldPointerDown}
		onpointermove={onWorldPointerMove}
		onpointerup={onWorldPointerUp}
		onpointercancel={onWorldPointerCancel}
		onpointerleave={onWorldPointerLeave}
	>
		<span class="watermark">GemKBR</span>

		{#if items.length === 0}
			<div class="guide" style={`width: ${cordRadiusPct * 2}%; height: ${cordRadiusPct * 2}%`}></div>
		{:else}
			<div
				class="cord"
				style={`width: ${cordRadiusPct * 2}%; height: ${cordRadiusPct * 2}%`}
				aria-hidden="true"
			></div>
		{/if}

		{#each viewItems as item (item.itemId)}
			{@const size = sizePct(item)}
			{@const content = contentSizePct(item)}
			{@const pos = nodePosition(item)}
			{@const rot = nodeRotDegById.get(item.itemId) ?? nodeRotationDeg(item, pos.x, pos.z)}
			{@const anchor = nodeAnchorPct(item)}
			{@const selected = item.itemId === selectedItemId}
			{@const hovered = item.itemId === hoveredId}
			{@const dragging = drag?.itemId === item.itemId && drag.moved}
			<div
				class="node"
				class:selected
				class:hovered
				class:dragging
				class:spacer={item.kind === 'spacer'}
				class:charm={item.kind === 'charm'}
				class:anchor-top={anchorsAtTop(item.kind)}
				style={`left: ${leftPct(pos.x)}%; top: ${topPct(pos.z)}%; width: ${size}%; height: ${size}%; --content: ${content}%; --ax: ${anchor.xPct}%; --ay: ${anchor.yPct}%;`}
				aria-hidden="true"
				in:enterTransition
				out:fade={{ duration: 160 }}
			>
				<div class="node-spin" style={`--rot: ${rot}deg; --origin: ${anchor.xPct}% ${anchor.yPct}%;`}>
					{#if item.imageUrl}
						<img src={item.imageUrl} alt="" draggable="false" />
					{:else if item.kind === 'spacer'}
						<span class="fallback spacer-fallback" data-preset={item.visualPresetId}></span>
					{:else if item.kind === 'charm'}
						<span class="fallback charm-fallback" data-preset={item.visualPresetId}></span>
					{:else}
						<span class="fallback bead-fallback" data-preset={item.visualPresetId}></span>
					{/if}
					{#if selected}
						<span class="select-ring" aria-hidden="true"></span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.stage {
		grid-area: 1 / 1;
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		background: #ffffff;
		container-type: size;
		touch-action: none;
	}

	.world {
		position: relative;
		/* Largest square that fits the stage — circle never becomes an oval */
		width: min(100cqw, 100cqh);
		height: min(100cqw, 100cqh);
		max-width: 100%;
		max-height: 100%;
		aspect-ratio: 1;
		isolation: isolate;
		cursor: default;
		outline: none;
		touch-action: none;
		user-select: none;
	}

	.world.hot {
		cursor: grab;
	}

	.world.dragging {
		cursor: grabbing;
	}

	@supports not (width: 1cqw) {
		.world {
			width: min(100%, 64vh);
			height: auto;
		}
	}

	.watermark {
		position: absolute;
		inset: 50% auto auto 50%;
		z-index: 0;
		transform: translate(-50%, -50%);
		font-family: var(--font-display);
		font-size: clamp(1.2rem, 5cqi, 2.2rem);
		letter-spacing: 0.08em;
		color: rgba(28, 25, 20, 0.08);
		pointer-events: none;
		user-select: none;
	}

	.guide,
	.cord {
		position: absolute;
		inset: 50% auto auto 50%;
		z-index: 0;
		transform: translate(-50%, -50%);
		border-radius: 999px;
		pointer-events: none;
		transition:
			width 280ms cubic-bezier(0.22, 1, 0.36, 1),
			height 280ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.guide {
		border: 1.5px dashed rgba(160, 148, 132, 0.45);
	}

	.cord {
		border: 2px solid rgba(90, 72, 58, 0.22);
	}

	.node {
		--content: 100%;
		--ax: 50%;
		--ay: 50%;
		position: absolute;
		z-index: 1;
		transform: translate(-50%, -50%);
		padding: 0;
		border: 0;
		background: transparent;
		pointer-events: none;
		transition:
			left 300ms cubic-bezier(0.22, 1, 0.36, 1),
			top 300ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 180ms ease;
	}

	/* Charms: pin clasp (visual anchor) to the cord, body hangs outward. */
	.node.anchor-top {
		transform: translate(calc(-1 * var(--ax)), calc(-1 * var(--ay)));
	}

	.node-spin {
		--rot: 0deg;
		--origin: 50% 50%;
		position: relative;
		width: 100%;
		height: 100%;
		transform: rotate(var(--rot));
		transform-origin: var(--origin);
		transition: transform 180ms ease;
	}

	.world.suppress-motion .guide,
	.world.suppress-motion .cord,
	.world.suppress-motion .node,
	.world.suppress-motion .node-spin {
		transition: none;
	}

	.node.hovered:not(.dragging) {
		transform: translate(-50%, -50%) scale(1.03);
		z-index: 2;
	}

	.node.anchor-top.hovered:not(.dragging) {
		transform: translate(calc(-1 * var(--ax)), calc(-1 * var(--ay))) scale(1.03);
	}

	.node.selected {
		z-index: 3;
	}

	.node.selected.hovered:not(.dragging) {
		z-index: 4;
	}

	.node.dragging {
		z-index: 5;
		transition: transform 120ms ease;
		transform: translate(-50%, -50%) scale(1.08);
		filter: drop-shadow(0 8px 14px rgba(28, 25, 20, 0.22));
	}

	.node.anchor-top.dragging {
		transform: translate(calc(-1 * var(--ax)), calc(-1 * var(--ay))) scale(1.08);
	}

	/* Dual ring reads on light and dark beads; size matches opaque sphere */
	.select-ring {
		position: absolute;
		inset: calc((100% - var(--content)) / 2);
		border-radius: 999px;
		box-shadow:
			0 0 0 2px #ffffff,
			0 0 0 3.5px rgba(28, 25, 20, 0.72);
		pointer-events: none;
	}

	.node img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
		filter: drop-shadow(0 2px 4px rgba(40, 30, 20, 0.18));
	}

	.fallback {
		display: block;
		width: 100%;
		height: 100%;
		margin: 0 auto;
		filter: drop-shadow(0 2px 4px rgba(40, 30, 20, 0.16));
	}

	.bead-fallback {
		border-radius: 999px;
		background:
			radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.75), transparent 42%),
			radial-gradient(circle at 70% 75%, rgba(0, 0, 0, 0.18), transparent 45%),
			#e8b7c8;
	}

	.spacer-fallback {
		width: 70%;
		height: 38%;
		margin-top: 31%;
		border-radius: 999px;
		background: linear-gradient(145deg, #f2f4f6, #8e98a3);
	}

	.charm-fallback {
		width: 70%;
		height: 70%;
		margin-top: 15%;
		border-radius: 0.35rem;
		transform: rotate(45deg);
		background: linear-gradient(145deg, #f2f4f6, #8e98a3);
	}
</style>
