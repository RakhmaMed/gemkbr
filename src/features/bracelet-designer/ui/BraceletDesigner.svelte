<script lang="ts">
	import { actions } from 'astro:actions';
	import { fade, fly } from 'svelte/transition';
	import {
		addItem,
		calculateFit,
		calculatePrice,
		clearDesign,
		createEmptyDesign,
		formatFitMessage,
		formatFitBadge,
		layoutBracelet,
		moveLeft,
		moveRight,
		moveItem,
		pieceCount,
		removeItem,
		replaceItem,
		setWristSize,
		type BraceletDesign,
		type BraceletTemplate,
		type ComponentDimensions,
	} from '../../../domain/bracelet';
	import { formatRub } from '../../../lib/money';
	import BraceletCanvas from './BraceletCanvas.svelte';

	type ComponentCard = {
		id: string;
		slug: string;
		name: string;
		kind: 'bead' | 'spacer' | 'charm';
		material: string;
		colorGroup: string;
		imageUrl: string;
		tags: string[];
		active: boolean;
	};

	type VariantCard = ComponentDimensions & {
		componentId: string;
		sku: string;
		visualPresetId: string;
		imageUrl: string;
		stockQuantity: number | null;
		name: string;
	};

	let {
		components,
		variants,
		template,
	}: {
		components: ComponentCard[];
		variants: VariantCard[];
		template: BraceletTemplate;
	} = $props();

	const DRAFT_KEY = 'gemkbr.bracelet.draft.v1';
	const crystalColorGroups = [
		'clear-white',
		'pink',
		'red',
		'yellow-gold',
		'green',
		'blue',
		'purple',
	] as const;
	const colorTabs = [
		{ id: 'in-use', label: 'В использовании' },
		{ id: 'clear-white', label: 'Прозрачные и белые' },
		{ id: 'pink', label: 'Розовые' },
		{ id: 'red', label: 'Красные' },
		{ id: 'yellow-gold', label: 'Жёлтые и золотые' },
		{ id: 'green', label: 'Зелёные' },
		{ id: 'blue', label: 'Синие' },
		{ id: 'purple', label: 'Фиолетовые' },
		{ id: 'other', label: 'Прочее' },
	] as const;
	type ColorTab = (typeof colorTabs)[number]['id'];

	function loadDraft(): BraceletDesign | null {
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			if (!raw) return null;
			const draft = JSON.parse(raw) as BraceletDesign;
			if (!draft?.items || !Array.isArray(draft.items)) return null;
			const known = new Set(variants.map((v) => v.variantId));
			const items = draft.items.filter((item) => known.has(item.variantId));
			return { ...draft, items };
		} catch {
			return null;
		}
	}

	let design = $state<BraceletDesign>(
		loadDraft() ?? createEmptyDesign(template.id, 165),
	);
	let selectedItemId = $state<string | null>(null);
	let replaceArmed = $state(false);
	let past = $state<BraceletDesign[]>([]);
	let future = $state<BraceletDesign[]>([]);
	let query = $state('');
	let colorFilter = $state<ColorTab>('clear-white');
	let status = $state('');
	let busy = $state(false);
	let tabsCanScrollLeft = $state(false);
	let tabsCanScrollRight = $state(false);

	function syncTabsOverflow(el: HTMLDivElement) {
		const max = el.scrollWidth - el.clientWidth;
		tabsCanScrollLeft = el.scrollLeft > 1;
		tabsCanScrollRight = max - el.scrollLeft > 1;
	}

	function attachColorTabs(el: HTMLDivElement) {
		const sync = () => syncTabsOverflow(el);
		sync();

		const onWheel = (event: WheelEvent) => {
			if (el.scrollWidth <= el.clientWidth) return;
			if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
			event.preventDefault();
			el.scrollLeft += event.deltaY;
			sync();
		};

		el.addEventListener('scroll', sync, { passive: true });
		el.addEventListener('wheel', onWheel, { passive: false });
		const ro = new ResizeObserver(sync);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', sync);
			el.removeEventListener('wheel', onWheel);
			ro.disconnect();
		};
	}

	const dimMap = $derived(new Map(variants.map((v) => [v.variantId, v])));
	const componentMap = $derived(new Map(components.map((component) => [component.id, component])));
	const layout = $derived(layoutBracelet(design, dimMap));
	const totalPrice = $derived(calculatePrice(design, dimMap));
	const fit = $derived(calculateFit(design, template, dimMap));
	const pieces = $derived(pieceCount(design));

	const canvasItems = $derived(
		layout.flatMap((pose) => {
			const item = design.items.find((entry) => entry.id === pose.itemId);
			if (!item) return [];
			const variant = dimMap.get(item.variantId);
			if (!variant) return [];
			return [
				{
					itemId: pose.itemId,
					pose,
					kind: variant.kind,
					imageUrl: variant.imageUrl,
					visualPresetId: variant.visualPresetId,
					diameterMm: variant.diameterMm,
					axialLengthMm: variant.axialLengthMm,
					name: variant.name ?? variant.sku,
				},
			];
		}),
	);

	const selectedVariant = $derived.by(() => {
		const item = design.items.find((entry) => entry.id === selectedItemId);
		if (!item) return null;
		return dimMap.get(item.variantId) ?? null;
	});

	const usedVariantIds = $derived(new Set(design.items.map((item) => item.variantId)));

	const filteredVariants = $derived.by(() => {
		return variants.filter((variant) => {
			const component = componentMap.get(variant.componentId);
			if (!component) return false;
			const isOther =
				component.kind === 'spacer' ||
				component.kind === 'charm' ||
				!crystalColorGroups.includes(component.colorGroup as (typeof crystalColorGroups)[number]);
			if (colorFilter === 'in-use') {
				if (!usedVariantIds.has(variant.variantId)) return false;
			} else if (colorFilter === 'other' ? !isOther : component.colorGroup !== colorFilter) {
				return false;
			}
			const hay = `${component.name} ${variant.sku} ${component.colorGroup}`.toLowerCase();
			return hay.includes(query.toLowerCase());
		});
	});

	$effect(() => {
		localStorage.setItem(DRAFT_KEY, JSON.stringify(design));
	});

	function commit(next: BraceletDesign) {
		past = [...past, design].slice(-50);
		future = [];
		design = next;
	}

	function undo() {
		const prev = past.at(-1);
		if (!prev) return;
		future = [design, ...future];
		past = past.slice(0, -1);
		design = prev;
	}

	function redo() {
		const next = future[0];
		if (!next) return;
		past = [...past, design];
		future = future.slice(1);
		design = next;
	}

	function onSelectItem(itemId: string) {
		selectedItemId = itemId;
		replaceArmed = false;
	}

	function onReorderItem(itemId: string, toIndex: number) {
		const next = moveItem(design, itemId, toIndex);
		if (next.items.every((item, index) => item.id === design.items[index]?.id)) return;
		commit(next);
	}

	function clearSelection() {
		selectedItemId = null;
		replaceArmed = false;
	}

	/** Catalog pick always adds, unless replace mode is armed for the selected bead. */
	function onCatalogPick(variantId: string) {
		if (replaceArmed && selectedItemId) {
			commit(replaceItem(design, selectedItemId, variantId));
			replaceArmed = false;
			return;
		}
		const next = addItem(design, variantId);
		commit(next);
	}

	async function save() {
		busy = true;
		status = '';
		try {
			const result = await actions.saveDesign({ design });
			if (result.error || !result.data?.ok) {
				status = 'Не удалось сохранить дизайн';
			} else {
				status = 'Дизайн сохранён';
			}
		} finally {
			busy = false;
		}
	}

	async function addToCart() {
		busy = true;
		status = '';
		try {
			const result = await actions.addToCart({ kind: 'custom_bracelet', design });
			if (result.error || !result.data || !('ok' in result.data) || !result.data.ok) {
				status = 'Не удалось добавить в корзину';
			} else {
				status = 'Добавлено в корзину';
			}
		} finally {
			busy = false;
		}
	}
</script>

<div class="designer">
	<section class="viewport panel">
		<div class="viewport-chrome">
			<span class="brand-mark">GemKBR</span>
			<div class="viewport-meta">
				<span class="fit-badge" data-status={fit.status}>{formatFitBadge(fit)}</span>
				<strong class="price-pill">{formatRub(totalPrice)}</strong>
			</div>
		</div>
		<BraceletCanvas
			items={canvasItems}
			selectedItemId={selectedItemId}
			onSelect={onSelectItem}
			onReorder={onReorderItem}
		/>
	</section>

	<aside class="sidebar panel">
		{#if selectedVariant}
			<div class="selected" transition:fly={{ y: 8, duration: 220 }}>
				<strong>{selectedVariant.name}</strong>
				<p class="muted">
					{selectedVariant.diameterMm}мм · {formatRub(selectedVariant.priceMinor)}
				</p>
				<div class="row">
					<button class="btn btn-ghost" type="button" onclick={() => commit(moveLeft(design, selectedItemId!))}>←</button>
					<button class="btn btn-ghost" type="button" onclick={() => commit(moveRight(design, selectedItemId!))}>→</button>
					<button
						class="btn btn-ghost"
						class:active={replaceArmed}
						type="button"
						onclick={() => (replaceArmed = !replaceArmed)}
					>
						{replaceArmed ? 'Выберите замену…' : 'Заменить'}
					</button>
					<button
						class="btn btn-ghost"
						type="button"
						onclick={() => {
							commit(removeItem(design, selectedItemId!));
							clearSelection();
						}}
					>
						Удалить
					</button>
					<button class="btn btn-ghost" type="button" onclick={clearSelection}>Снять выбор</button>
				</div>
				{#if replaceArmed}
					<p class="muted">Следующий клик по каталогу заменит выбранный элемент</p>
				{:else}
					<p class="muted">Клик по каталогу добавляет новую бусину</p>
				{/if}
			</div>
		{:else}
			<p class="muted lead" transition:fade={{ duration: 180 }}>Добавляйте бусины — они собираются в плотное кольцо</p>
		{/if}

		<label class="form-field">
			<span>Поиск</span>
			<input bind:value={query} placeholder="Искать кварц, агат, шармы…" />
		</label>

		<div
			class="color-tabs-shell"
			class:fade-left={tabsCanScrollLeft}
			class:fade-right={tabsCanScrollRight}
		>
			<div class="color-tabs" aria-label="Категории по цвету" {@attach attachColorTabs}>
				{#each colorTabs as tab (tab.id)}
					<button
						class="color-tab"
						class:active={colorFilter === tab.id}
						type="button"
						onclick={(event) => {
							colorFilter = tab.id;
							event.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
						}}
					>
						{tab.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="grid">
			{#each filteredVariants as variant (variant.variantId)}
				{@const component = componentMap.get(variant.componentId)}
				<button
					class="bead"
					type="button"
					onclick={() => onCatalogPick(variant.variantId)}
				>
					{#if component?.imageUrl}
						<img class="swatch-img" src={component.imageUrl} alt="" width="96" height="96" loading="lazy" />
					{:else}
						<span
							class="swatch"
							data-preset={variant.visualPresetId}
							data-kind={variant.kind}
							style={`--bead-size: ${0.55 + variant.diameterMm / 28}`}
						></span>
					{/if}
					<span class="bead-details">
						<span class="bead-name">{variant.name}</span>
						<small class="muted">{variant.diameterMm}мм · {formatRub(variant.priceMinor)}</small>
					</span>
				</button>
			{:else}
				<p class="muted empty-filter">
					{colorFilter === 'in-use'
						? 'Пока ничего не добавлено — выберите бусину в цветовой группе'
						: 'Ничего не найдено'}
				</p>
			{/each}
		</div>
	</aside>

	<footer class="metrics panel">
		<div class="metrics-stats">
			<div class="stat">
				<span class="muted">Цена</span>
				<strong>{formatRub(totalPrice)}</strong>
			</div>
			<label class="stat wrist">
				<span class="muted">Запястье</span>
				<input
					type="number"
					min={template.minWristMm}
					max={template.maxWristMm}
					value={design.targetWristMm}
					onchange={(e) =>
						commit(setWristSize(design, Number((e.currentTarget as HTMLInputElement).value)))}
				/>
			</label>
			<div class="stat">
				<span class="muted">Элементы</span>
				<strong>{pieces}</strong>
			</div>
			<div class="stat fit">
				<span class="muted">Посадка</span>
				<strong>{formatFitMessage(fit)}</strong>
			</div>
		</div>
		<div class="metrics-actions">
			<button class="btn btn-ghost" type="button" onclick={undo} disabled={past.length === 0}>Undo</button>
			<button class="btn btn-ghost" type="button" onclick={redo} disabled={future.length === 0}>Redo</button>
			<button class="btn btn-ghost" type="button" onclick={() => { commit(clearDesign(design)); clearSelection(); }}>Очистить</button>
			<button class="btn btn-ghost" type="button" disabled={busy} onclick={save}>Сохранить</button>
			<button class="btn" type="button" disabled={busy || pieces === 0} onclick={addToCart}>В корзину</button>
		</div>
		{#if status}
			<p class="metrics-status muted" transition:fade={{ duration: 180 }}>{status}</p>
		{/if}
	</footer>
</div>

<style>
	.designer {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		/* Catalog row gets priority — previous min (~11rem) left ~0px for the bead grid */
		grid-template-rows: minmax(0, 0.9fr) minmax(16rem, 1.35fr) auto;
		gap: 0.4rem;
		height: calc(100svh - var(--chrome-offset, 5.5rem) - var(--mobile-nav-height, 0px) - 0.35rem);
		max-height: calc(100dvh - var(--chrome-offset, 5.5rem) - var(--mobile-nav-height, 0px) - 0.35rem);
		min-height: 0;
	}

	.viewport {
		position: relative;
		display: grid;
		grid-template: 1fr / 1fr;
		min-height: 0;
		height: 100%;
		min-width: 0;
		padding: 0;
		overflow: hidden;
		background: #ffffff;
	}

	.viewport-chrome {
		grid-area: 1 / 1;
		position: relative;
		z-index: 2;
		align-self: start;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin: 0.5rem 0.6rem 0;
		pointer-events: none;
	}

	.brand-mark {
		font-family: var(--font-display);
		font-size: 1.15rem;
		letter-spacing: 0.04em;
		color: color-mix(in srgb, var(--ink) 55%, transparent);
	}

	.viewport-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.4rem;
	}

	.fit-badge,
	.price-pill {
		pointer-events: none;
		border-radius: 999px;
		padding: 0.35rem 0.7rem;
		font-size: 0.82rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid var(--line);
		box-shadow: 0 4px 14px rgba(28, 25, 20, 0.06);
	}

	.fit-badge[data-status='too_short'],
	.fit-badge[data-status='too_long'] {
		color: #7a3e16;
		border-color: #e0b892;
		background: rgba(255, 244, 230, 0.92);
	}

	.fit-badge[data-status='ready'] {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
		background: rgba(215, 235, 228, 0.9);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
		min-height: 0;
		height: 100%;
		max-height: none;
		overflow: hidden;
		padding: 0.55rem;
	}

	.sidebar > :not(.grid) {
		flex: 0 0 auto;
	}

	.sidebar .grid {
		flex: 1 1 auto;
		min-height: 9rem;
	}

	.lead {
		margin: 0;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
		align-content: start;
		flex: 1 1 auto;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		padding-right: 0.2rem;
		scrollbar-width: thin;
	}

	.empty-filter {
		grid-column: 1 / -1;
		margin: 0.35rem 0 0;
	}

	.color-tabs-shell {
		position: relative;
		min-height: 2.4rem;
		border-bottom: 1px solid var(--line);
	}

	.color-tabs-shell::before,
	.color-tabs-shell::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 1px;
		width: 1.6rem;
		pointer-events: none;
		opacity: 0;
		z-index: 1;
		transition: opacity 160ms ease;
	}

	.color-tabs-shell::before {
		left: 0;
		background: linear-gradient(to right, var(--surface), transparent);
	}

	.color-tabs-shell::after {
		right: 0;
		background: linear-gradient(to left, var(--surface), transparent);
	}

	.color-tabs-shell.fade-left::before,
	.color-tabs-shell.fade-right::after {
		opacity: 1;
	}

	.color-tabs {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		min-height: 2.4rem;
		overflow-x: auto;
		overflow-y: hidden;
		padding-bottom: 0.15rem;
		scrollbar-width: none;
		-ms-overflow-style: none;
		overscroll-behavior-x: contain;
	}

	.color-tabs::-webkit-scrollbar {
		display: none;
	}

	.color-tab {
		flex: 0 0 auto;
		border: 0;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		padding: 0.45rem 0.55rem 0.55rem;
		color: var(--ink-muted);
		background: transparent;
		font: inherit;
		font-size: 0.88rem;
		line-height: 1.2;
		white-space: nowrap;
		cursor: pointer;
		transition:
			color 160ms ease,
			border-color 160ms ease;
	}

	.color-tab:hover,
	.color-tab.active {
		color: var(--ink);
	}

	.color-tab.active {
		border-bottom-color: var(--ink);
		font-weight: 600;
	}

	.bead {
		display: grid;
		grid-template-rows: 5.25rem auto;
		gap: 0.35rem;
		min-width: 0;
		text-align: center;
		border: 1px solid var(--line);
		border-radius: 0.85rem;
		padding: 0.65rem 0.5rem 0.5rem;
		background: #faf5eb;
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease,
			box-shadow 160ms ease;
	}

	.bead:hover {
		border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
		box-shadow: 0 6px 18px rgba(28, 25, 20, 0.06);
	}

	.bead:active {
		transform: scale(0.97);
	}

	.bead-details {
		display: grid;
		gap: 0.08rem;
		min-width: 0;
	}

	.bead-name,
	.bead small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bead-name {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		color: color-mix(in srgb, var(--ink) 72%, transparent);
	}

	.bead small {
		font-size: 0.72rem;
	}

	.swatch-img {
		width: 5.25rem;
		height: 5.25rem;
		justify-self: center;
		object-fit: contain;
		background: transparent;
		filter: drop-shadow(0 3px 6px rgba(28, 25, 20, 0.14));
		transition: transform 180ms ease;
	}

	.swatch {
		--bead-size: 1;
		width: min(calc(2.4rem * var(--bead-size)), 5.25rem);
		height: min(calc(2.4rem * var(--bead-size)), 5.25rem);
		justify-self: center;
		align-self: center;
		border-radius: 999px;
		background:
			radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.75), transparent 42%),
			radial-gradient(circle at 70% 75%, rgba(0, 0, 0, 0.18), transparent 45%),
			#e8b7c8;
		box-shadow:
			0 4px 10px rgba(28, 25, 20, 0.12),
			inset 0 -2px 4px rgba(0, 0, 0, 0.12);
		transition: transform 180ms ease;
	}

	.bead:hover .swatch {
		transform: scale(1.08);
	}

	.bead:hover .swatch-img {
		transform: scale(1.06);
	}

	.bead:hover .swatch[data-kind='charm'] {
		transform: rotate(45deg) scale(1.08);
	}

	.swatch[data-preset='matte-stone'] {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.2), transparent 40%),
			#2a2a2e;
	}
	.swatch[data-preset='metal'] {
		background:
			radial-gradient(circle at 30% 25%, #fff, transparent 40%),
			linear-gradient(145deg, #f2f4f6, #8e98a3);
	}
	.swatch[data-preset='pearl'] {
		background:
			radial-gradient(circle at 30% 28%, #fff, transparent 42%),
			radial-gradient(circle at 70% 70%, rgba(232, 190, 160, 0.35), transparent 50%),
			#f3ebe0;
	}
	.swatch[data-preset='glass'] {
		background:
			radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.9), transparent 35%),
			linear-gradient(160deg, #d8f1f8, #7ec0d6);
	}
	.swatch[data-kind='spacer'] {
		border-radius: 0.35rem;
		width: 1.35rem;
		height: 0.85rem;
	}
	.swatch[data-kind='charm'] {
		border-radius: 0.35rem;
		transform: rotate(45deg);
	}

	.metrics {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.55rem 0.85rem;
		padding: 0.65rem 0.75rem;
	}

	.metrics-stats {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.65rem 1.1rem;
		flex: 1 1 auto;
		min-width: 0;
	}

	.stat {
		display: grid;
		gap: 0.2rem;
		align-content: end;
	}

	.stat.wrist {
		display: grid;
		grid-template-columns: auto auto;
		align-items: center;
		column-gap: 0.4rem;
		row-gap: 0.15rem;
	}

	.stat.wrist .muted {
		grid-column: 1 / -1;
	}

	.stat.fit {
		max-width: 16rem;
	}

	.stat.fit strong {
		font-size: 0.92rem;
		line-height: 1.25;
		font-weight: 600;
	}

	.metrics input {
		width: 4.5rem;
		margin: 0;
		border: 1px solid var(--line);
		border-radius: 0.55rem;
		padding: 0.35rem 0.5rem;
		background: #fffdf8;
	}

	.metrics-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
	}

	.metrics-actions .btn {
		padding: 0.55rem 0.95rem;
	}

	.metrics-status {
		flex-basis: 100%;
		margin: 0;
	}

	.btn {
		transition:
			transform 140ms ease,
			filter 140ms ease,
			border-color 160ms ease,
			color 160ms ease,
			background-color 160ms ease;
	}

	.btn:active:not(:disabled) {
		transform: scale(0.96);
	}

	.btn.active {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-soft);
	}

	.selected {
		display: grid;
		gap: 0.35rem;
	}

	@media (max-width: 959px) {
		.brand-mark {
			display: none;
		}

		.viewport-meta .fit-badge {
			display: none;
		}

		/* Free vertical space for the bead grid */
		.lead {
			display: none;
		}

		.form-field span {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}

		.form-field {
			gap: 0;
		}

		.form-field input {
			padding: 0.5rem 0.65rem;
		}

		.color-tabs-shell,
		.color-tabs {
			min-height: 2rem;
		}

		.color-tab {
			padding: 0.3rem 0.45rem 0.4rem;
			font-size: 0.82rem;
		}

		.bead {
			padding: 0.5rem 0.4rem 0.4rem;
			border-radius: 0.7rem;
		}

		.metrics {
			gap: 0.4rem 0.65rem;
			padding: 0.5rem 0.6rem;
		}

		.metrics-stats {
			gap: 0.4rem 0.75rem;
		}

		.stat.fit {
			max-width: none;
			flex: 1 1 100%;
		}

		.stat.fit strong {
			font-size: 0.84rem;
		}

		.metrics-actions {
			gap: 0.3rem;
			margin-left: 0;
			width: 100%;
		}

		.metrics-actions .btn {
			padding: 0.42rem 0.7rem;
			font-size: 0.84rem;
		}
	}

	@media (min-width: 960px) {
		.designer {
			height: calc(100dvh - var(--chrome-offset, 5.5rem));
			min-height: 0;
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
			grid-template-rows: minmax(0, 1fr) auto;
			align-items: stretch;
			gap: 0.75rem;
		}

		.viewport {
			grid-row: 1;
			min-height: 0;
			height: 100%;
		}

		.sidebar {
			grid-row: 1;
			max-height: none;
			height: 100%;
			min-height: 0;
			gap: 0.75rem;
			padding: 1rem;
		}

		.metrics {
			grid-column: 1 / -1;
			flex-wrap: nowrap;
			gap: 1rem 1.25rem;
			align-items: center;
			padding: 1rem;
		}

		.metrics-stats {
			flex: 0 1 auto;
			flex-wrap: nowrap;
			gap: 0.85rem 1.35rem;
		}

		.metrics-actions {
			flex: 0 0 auto;
			flex-wrap: nowrap;
			margin-left: auto;
		}
	}

	@media (min-width: 1200px) {
		.sidebar .grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
