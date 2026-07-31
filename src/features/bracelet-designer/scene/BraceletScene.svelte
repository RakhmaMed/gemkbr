<script lang="ts">
	import { Canvas } from '@threlte/core';
	import type { LayoutPose } from '../../../domain/bracelet';
	import BraceletWorld from './BraceletWorld.svelte';

	type ItemVisual = {
		itemId: string;
		pose: LayoutPose;
		visualPresetId: string;
		kind: string;
		imageUrl: string;
		axialLengthMm: number;
		diameterMm: number;
	};

	let {
		items = [],
		selectedItemId = null,
		onSelect,
	}: {
		items: ItemVisual[];
		selectedItemId: string | null;
		onSelect?: (itemId: string) => void;
	} = $props();
</script>

<Canvas renderMode="on-demand" dpr={[1, 1.75]} shadows>
	<BraceletWorld {items} {selectedItemId} {onSelect} />
</Canvas>
