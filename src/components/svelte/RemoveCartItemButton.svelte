<script lang="ts">
	import { actions } from 'astro:actions';

	let { itemId } = $props<{ itemId: string }>();
	let busy = $state(false);

	async function remove() {
		busy = true;
		try {
			await actions.removeFromCart({ itemId });
			window.location.reload();
		} finally {
			busy = false;
		}
	}
</script>

<button class="btn btn-ghost" type="button" disabled={busy} onclick={remove}>Удалить</button>
