<script lang="ts">
	import { actions } from 'astro:actions';

	let { productVariantId } = $props<{ productVariantId: string }>();
	let busy = $state(false);
	let message = $state('');

	async function add() {
		busy = true;
		message = '';
		try {
			const result = await actions.addToCart({
				kind: 'product',
				productVariantId,
			});
			if (result.error) {
				message = 'Не удалось добавить в корзину';
			} else {
				message = 'Добавлено в корзину';
			}
		} finally {
			busy = false;
		}
	}
</script>

<button class="btn" type="button" disabled={busy} onclick={add}>
	{busy ? 'Добавляем…' : 'В корзину'}
</button>
{#if message}
	<p class="muted">{message}</p>
{/if}
