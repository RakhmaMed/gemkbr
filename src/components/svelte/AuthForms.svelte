<script lang="ts">
	let mode = $state<'login' | 'register'>('login');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let message = $state('');
	let busy = $state(false);

	async function submit(e: Event) {
		e.preventDefault();
		busy = true;
		message = '';
		try {
			if (mode === 'register') {
				const res = await fetch('/api/auth/sign-up/email', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name, email, password }),
				});
				if (!res.ok) {
					message = 'Не удалось зарегистрироваться';
					return;
				}
			} else {
				const res = await fetch('/api/auth/sign-in/email', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ email, password }),
				});
				if (!res.ok) {
					message = 'Неверный email или пароль';
					return;
				}
			}
			window.location.reload();
		} finally {
			busy = false;
		}
	}
</script>

<div class="stack panel">
	<div class="row" style="display:flex; gap:0.5rem;">
		<button class="btn btn-ghost" type="button" onclick={() => (mode = 'login')}>Вход</button>
		<button class="btn btn-ghost" type="button" onclick={() => (mode = 'register')}>Регистрация</button>
	</div>
	<form class="stack" onsubmit={submit}>
		{#if mode === 'register'}
			<label class="form-field">
				<span>Имя</span>
				<input bind:value={name} required />
			</label>
		{/if}
		<label class="form-field">
			<span>Email</span>
			<input type="email" bind:value={email} required autocomplete="email" />
		</label>
		<label class="form-field">
			<span>Пароль</span>
			<input type="password" bind:value={password} required minlength="8" autocomplete={mode === 'login' ? 'current-password' : 'new-password'} />
		</label>
		{#if message}
			<p style="color:#8a2f2f;">{message}</p>
		{/if}
		<button class="btn" disabled={busy} type="submit">
			{mode === 'login' ? 'Войти' : 'Создать аккаунт'}
		</button>
	</form>
</div>
