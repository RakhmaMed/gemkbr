<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { Outlines } from '@threlte/extras';
	import { DoubleSide, type Group, type Texture } from 'three';
	import type { LayoutPose } from '../../../domain/bracelet';
	import { loadBeadTexture } from '../assets/bead-textures';
	import { resolveMaterial } from '../assets/materials';

	let {
		itemId,
		pose,
		visualPresetId,
		kind,
		imageUrl = '',
		axialLengthMm = 8,
		diameterMm = 8,
		selected = false,
		onSelect,
	}: {
		itemId: string;
		pose: LayoutPose;
		visualPresetId: string;
		kind: string;
		imageUrl?: string;
		axialLengthMm?: number;
		diameterMm?: number;
		selected?: boolean;
		onSelect?: (itemId: string) => void;
	} = $props();

	const { invalidate, camera } = useThrelte();
	const mat = $derived(resolveMaterial(visualPresetId));
	/** Cylinder height after uniform scale by diameterMm equals axialLengthMm. */
	const spacerHeight = $derived(Math.max(axialLengthMm / Math.max(diameterMm, 0.1), 0.15));
	const usePhoto = $derived(Boolean(imageUrl) && kind === 'bead');

	let group = $state.raw<Group | undefined>(undefined);
	let map = $state.raw<Texture | null>(null);
	let booted = false;

	const current = {
		position: [0, 0, 0] as [number, number, number],
		rotation: [0, 0, 0] as [number, number, number],
		scale: 0.001,
	};

	const target = $derived({
		position: pose.position,
		rotation: pose.rotation,
		scale: pose.scale,
	});

	$effect(() => {
		const url = imageUrl;
		if (!url || kind !== 'bead') {
			map = null;
			return;
		}

		let cancelled = false;
		loadBeadTexture(url)
			.then((texture) => {
				if (cancelled) return;
				map = texture;
				invalidate();
			})
			.catch(() => {
				if (!cancelled) map = null;
			});

		return () => {
			cancelled = true;
		};
	});

	function applyTransform() {
		if (!group) return;
		group.position.set(current.position[0], current.position[1], current.position[2]);
		group.scale.setScalar(current.scale);

		if (usePhoto && map && camera.current) {
			// Photo beads face the camera so catalog images stay readable.
			group.quaternion.copy(camera.current.quaternion);
			return;
		}

		const rotX = kind === 'spacer' ? current.rotation[0] + Math.PI / 2 : current.rotation[0];
		group.rotation.set(rotX, current.rotation[1], current.rotation[2]);
	}

	const { start, stop } = useTask(
		(delta) => {
			const goal = target;
			if (!booted) {
				current.position = [goal.position[0], goal.position[1], goal.position[2]];
				current.rotation = [goal.rotation[0], goal.rotation[1], goal.rotation[2]];
				current.scale = 0.001;
				booted = true;
			}

			const t = 1 - Math.exp(-10 * delta);
			for (let i = 0; i < 3; i++) {
				current.position[i]! += (goal.position[i]! - current.position[i]!) * t;
				current.rotation[i]! += (goal.rotation[i]! - current.rotation[i]!) * t;
			}
			current.scale += (goal.scale - current.scale) * t;
			applyTransform();

			const dist = Math.hypot(
				goal.position[0]! - current.position[0]!,
				goal.position[1]! - current.position[1]!,
				goal.position[2]! - current.position[2]!,
			);
			const eps = Math.max(0.08, goal.scale * 0.01);
			if (dist < eps && Math.abs(goal.scale - current.scale) < eps) {
				current.position = [goal.position[0]!, goal.position[1]!, goal.position[2]!];
				current.rotation = [goal.rotation[0]!, goal.rotation[1]!, goal.rotation[2]!];
				current.scale = goal.scale;
				applyTransform();
				// Keep task running for photo beads so they follow the camera while orbiting.
				if (!(usePhoto && map)) stop();
			}
		},
		{ autoStart: false },
	);

	$effect(() => {
		target.position;
		target.rotation;
		target.scale;
		usePhoto;
		map;
		start();
	});
</script>

<T.Group bind:ref={group}>
	{#if usePhoto && map}
		<T.Mesh
			castShadow
			onclick={(e: { stopPropagation: () => void }) => {
				e.stopPropagation();
				onSelect?.(itemId);
			}}
			onpointerdown={(e: { stopPropagation: () => void }) => e.stopPropagation()}
		>
			<T.CircleGeometry args={[0.5, 48]} />
			<T.MeshBasicMaterial
				map={map}
				transparent
				alphaTest={0.08}
				depthWrite={true}
				toneMapped={false}
				side={DoubleSide}
			/>
			{#if selected}
				<Outlines thickness={3} color="#0f5c4c" opacity={0.95} screenspace />
			{/if}
		</T.Mesh>
	{:else}
		<T.Mesh
			castShadow
			onclick={(e: { stopPropagation: () => void }) => {
				e.stopPropagation();
				onSelect?.(itemId);
			}}
			onpointerdown={(e: { stopPropagation: () => void }) => e.stopPropagation()}
		>
			{#if kind === 'spacer'}
				<!-- Axis along bracelet tangent after pose.rotation -->
				<T.CylinderGeometry args={[0.5, 0.5, spacerHeight, 32]} />
			{:else if kind === 'charm'}
				<T.OctahedronGeometry args={[0.55, 0]} />
			{:else}
				<T.SphereGeometry args={[0.5, 48, 32]} />
			{/if}
			<T.MeshPhysicalMaterial
				color={mat.color}
				roughness={mat.roughness}
				metalness={mat.metalness}
				clearcoat={mat.clearcoat ?? 0}
				clearcoatRoughness={mat.clearcoatRoughness ?? 0.2}
				envMapIntensity={mat.envMapIntensity ?? 1}
				ior={mat.ior ?? 1.5}
				transmission={mat.transmission ?? 0}
				thickness={mat.thickness ?? 0}
				sheen={mat.sheen ?? 0}
				sheenColor={mat.sheenColor ?? '#ffffff'}
				sheenRoughness={mat.sheenRoughness ?? 0.5}
			/>
			{#if selected}
				<Outlines thickness={3} color="#0f5c4c" opacity={0.95} screenspace />
			{/if}
		</T.Mesh>
	{/if}
</T.Group>
