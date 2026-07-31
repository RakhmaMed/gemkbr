<script lang="ts">
	import { T } from '@threlte/core';
	import { Environment, OrbitControls, interactivity } from '@threlte/extras';
	import { resolveMaterial } from '../assets/materials';

	const sizes = [6, 8, 10, 12, 6, 8, 10, 12, 8, 10, 6, 12, 8, 8, 10, 6, 12, 8, 10, 8];
	const presets = [
		'polished-stone',
		'matte-stone',
		'pearl',
		'metal',
		'glass',
	] as const;

	let selected = $state<number | null>(null);
	const radius = 28;

	interactivity();
</script>

<T.PerspectiveCamera makeDefault position={[0, 35, 80]} fov={42}>
	<OrbitControls enableDamping />
</T.PerspectiveCamera>
<T.AmbientLight intensity={0.6} />
<T.DirectionalLight position={[30, 50, 20]} intensity={1.2} />
<Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr" />

{#each sizes as size, index}
	{@const angle = (index / sizes.length) * Math.PI * 2}
	{@const mat = resolveMaterial(presets[index % presets.length]!)}
	<T.Mesh
		position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
		scale={size / 8}
		onclick={() => (selected = index)}
	>
		<T.SphereGeometry args={[0.5, 32, 24]} />
		<T.MeshStandardMaterial
			color={selected === index ? '#0f5c4c' : mat.color}
			roughness={mat.roughness}
			metalness={mat.metalness}
		/>
	</T.Mesh>
{/each}
