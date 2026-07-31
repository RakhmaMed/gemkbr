<script lang="ts">
	import { T, useThrelte } from '@threlte/core';
	import { ContactShadows, Environment, OrbitControls, interactivity } from '@threlte/extras';
	import type { LayoutPose } from '../../../domain/bracelet';
	import BeadMesh from './BeadMesh.svelte';

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

	interactivity();

	const { invalidate } = useThrelte();

	/** Packed bracelet radius in mm (layout world units). */
	const DISPLAY_RADIUS = 26;
	const packedRadius = $derived(
		items.length === 0
			? DISPLAY_RADIUS
			: Math.max(
					...items.map((item) => Math.hypot(item.pose.position[0], item.pose.position[2])),
					6,
				),
	);

	/** Keep the ring filling the preview like a product shot. */
	const groupScale = $derived(packedRadius > 0 ? DISPLAY_RADIUS / packedRadius : 1);

	$effect(() => {
		items;
		selectedItemId;
		groupScale;
		invalidate();
	});
</script>

<!-- Soft top-down product camera -->
<T.PerspectiveCamera makeDefault position={[0, 72, 18]} fov={32}>
	<OrbitControls
		enableDamping
		dampingFactor={0.08}
		target={[0, 0, 0]}
		maxDistance={140}
		minDistance={40}
		minPolarAngle={0.18}
		maxPolarAngle={Math.PI * 0.42}
	/>
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.55} />
<T.DirectionalLight position={[20, 60, 10]} intensity={1.2} castShadow />
<T.DirectionalLight position={[-25, 30, -20]} intensity={0.35} color="#ffe6cc" />
<T.HemisphereLight color="#ffffff" groundColor="#d9d0c0" intensity={0.4} />
<Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr" />

<!-- Clean studio floor -->
<T.Mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
	<T.CircleGeometry args={[70, 64]} />
	<T.MeshStandardMaterial color="#f4f0e8" roughness={1} metalness={0} />
</T.Mesh>

<T.Group scale={groupScale}>
	{#if items.length === 0}
		<!-- Ghost guide ring -->
		<T.Mesh rotation={[Math.PI / 2, 0, 0]}>
			<T.TorusGeometry args={[packedRadius, 0.35, 16, 96]} />
			<T.MeshStandardMaterial color="#cfc3b0" transparent opacity={0.35} roughness={0.9} />
		</T.Mesh>
	{:else}
		<!-- Thin elastic barely visible between beads -->
		<T.Mesh rotation={[Math.PI / 2, 0, 0]}>
			<T.TorusGeometry args={[packedRadius, 0.55, 12, 128]} />
			<T.MeshPhysicalMaterial
				color="#6a5646"
				roughness={0.65}
				metalness={0.02}
				transparent
				opacity={0.55}
			/>
		</T.Mesh>
	{/if}

	{#each items as item (item.itemId)}
		<BeadMesh
			itemId={item.itemId}
			pose={item.pose}
			visualPresetId={item.visualPresetId}
			kind={item.kind}
			imageUrl={item.imageUrl}
			axialLengthMm={item.axialLengthMm}
			diameterMm={item.diameterMm}
			selected={item.itemId === selectedItemId}
			{onSelect}
		/>
	{/each}
</T.Group>

<ContactShadows
	position={[0, -0.38, 0]}
	opacity={0.35}
	scale={90}
	blur={2.8}
	far={40}
	resolution={1024}
	color="#2a241c"
/>
