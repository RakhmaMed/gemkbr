<script lang="ts">
	import { actions } from 'astro:actions';

	let customerName = $state('');
	let customerPhone = $state('');
	let consent = $state(false);
	let busy = $state(false);
	let error = $state('');

	async function submit(e: Event) {
		e.preventDefault();
		busy = true;
		error = '';
		try {
			const result = await actions.createOrder({
				customerName,
				customerPhone,
				consent,
			});
			if (result.error || !result.data || !result.data.ok) {
				error =
					result.data && 'error' in result.data && result.data.error
						? String(result.data.error)
						: 'Не удалось создать заказ';
				return;
			}
			const number = result.data.order.number;
			window.location.href = `/order/success?number=${encodeURIComponent(number)}`;
		} finally {
			busy = false;
		}
	}
</script>

<form class="stack panel" onsubmit={submit}>
	<label class="form-field">
		<span>Имя</span>
		<input required bind:value={customerName} autocomplete="name" />
	</label>
	<label class="form-field">
		<span>Телефон</span>
		<input required bind:value={customerPhone} autocomplete="tel" placeholder="+7..." />
	</label>
	<label style="display: flex; gap: 0.6rem; align-items: start;">
		<input type="checkbox" bind:checked={consent} required />
		<span>Согласен(на) на обработку персональных данных для оформления заказа</span>
	</label>
	{#if error}
		<p style="color: #8a2f2f;">{error}</p>
	{/if}
	<button class="btn" type="submit" disabled={busy}>
		{busy ? 'Отправляем…' : 'Подтвердить заказ'}
	</button>
</form>
