<script lang="ts">
	import { signIn, error } from '$lib/stores/auth';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let email = '';
	let password = '';
	let isLoading = false;
	let showPassword = false;

	async function handleSubmit() {
		if (!email || !password) return;
		try {
			isLoading = true;
			await signIn(email, password);
			dispatch('success');
		} catch (err) {
			console.error('Login failed:', err);
		} finally {
			isLoading = false;
		}
	}

</script>

<div class="auth-page">
	<!-- Left: brand panel -->
	<aside class="brand-panel">
		<div class="brand">
			<div class="brand-icon"><span>CA</span></div>
			<span class="brand-name">Congregation Accounts</span>
		</div>

		<div class="brand-body">
			<h1>Accurate accounts, ready when you need them.</h1>
			<p>Record donations and expenses once, then let the monthly reports fill themselves in.</p>

			<ul class="brand-points">
				<li>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
					Donations and expenses in one place
				</li>
				<li>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
					S-26 and S-30 reports filled automatically
				</li>
				<li>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
					Balances that reconcile month to month
				</li>
			</ul>
		</div>

		<p class="brand-footer">Secure access for appointed brothers</p>
	</aside>

	<!-- Right: sign-in form -->
	<main class="form-panel">
		<div class="form-wrap">
			<div class="brand mobile-brand">
				<div class="brand-icon"><span>CA</span></div>
				<span class="brand-name">Congregation Accounts</span>
			</div>

			<div class="form-header">
				<h2>Welcome back</h2>
				<p>Sign in to continue to your accounts.</p>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="auth-form">
				{#if $error}
					<div class="error-message" role="alert">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" />
						</svg>
						<span>{$error}</span>
					</div>
				{/if}

				<div class="form-group">
					<label for="email">Email address</label>
					<input id="email" type="email" bind:value={email} placeholder="you@example.com" autocomplete="email" required disabled={isLoading} />
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<div class="password-field">
						{#if showPassword}
							<input id="password" type="text" bind:value={password} placeholder="Enter your password" autocomplete="current-password" required disabled={isLoading} />
						{:else}
							<input id="password" type="password" bind:value={password} placeholder="Enter your password" autocomplete="current-password" required disabled={isLoading} />
						{/if}
						<button type="button" class="toggle-password" on:click={() => (showPassword = !showPassword)} aria-pressed={showPassword}>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
				</div>

				<button type="submit" class="auth-btn" disabled={isLoading || !email || !password}>
					{#if isLoading}
						<span class="loading-spinner"></span>
						Signing in...
					{:else}
						Sign in
					{/if}
				</button>
			</form>
		</div>
	</main>
</div>

<style>
	.auth-page {
		min-height: 100vh;
		min-height: 100dvh;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		background: #ffffff;
	}

	/* ---------- Brand panel ---------- */
	.brand-panel {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 2rem;
		padding: 3rem;
		color: #e2e8f0;
		background:
			radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.28), transparent 45%),
			radial-gradient(circle at 90% 95%, rgba(30, 64, 175, 0.45), transparent 50%),
			#0f172a;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.brand-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: #1e40af;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.brand-icon span {
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.brand-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #ffffff;
	}

	.brand-body {
		max-width: 26rem;
	}

	.brand-body h1 {
		margin: 0 0 1rem;
		font-size: clamp(1.75rem, 2.6vw, 2.375rem);
		line-height: 1.15;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #ffffff;
	}

	.brand-body p {
		margin: 0 0 2rem;
		font-size: 1rem;
		line-height: 1.6;
		color: #94a3b8;
	}

	.brand-points {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.brand-points li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9375rem;
		color: #e2e8f0;
	}

	.brand-points svg {
		width: 1.25rem;
		height: 1.25rem;
		padding: 0.1875rem;
		border-radius: 999px;
		background: rgba(96, 165, 250, 0.18);
		color: #93c5fd;
		flex-shrink: 0;
	}

	.brand-footer {
		margin: 0;
		font-size: 0.8125rem;
		color: #64748b;
	}

	/* ---------- Form panel ---------- */
	.form-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
	}

	.form-wrap {
		width: 100%;
		max-width: 22.5rem;
	}

	.mobile-brand {
		display: none;
		margin-bottom: 2.5rem;
	}

	.mobile-brand .brand-name {
		color: #0f172a;
	}

	.form-header {
		margin-bottom: 2rem;
	}

	.form-header h2 {
		margin: 0 0 0.5rem;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #0f172a;
	}

	.form-header p {
		margin: 0;
		font-size: 0.9375rem;
		color: #64748b;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.error-message {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		background: #fef2f2;
		color: #b91c1c;
		padding: 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		border: 1px solid #fecaca;
	}

	.error-message svg {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-group label {
		color: #334155;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.form-group input {
		width: 100%;
		height: 2.75rem;
		padding: 0 0.875rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 1rem;
		background: #ffffff;
		color: #0f172a;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.form-group input::placeholder {
		color: #94a3b8;
	}

	.form-group input:focus {
		outline: none;
		border-color: #1e40af;
		box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.15);
	}

	.form-group input:disabled {
		background: #f8fafc;
		cursor: not-allowed;
	}

	.password-field {
		position: relative;
	}

	.password-field input {
		padding-right: 4rem;
	}

	.toggle-password {
		position: absolute;
		top: 50%;
		right: 0.375rem;
		transform: translateY(-50%);
		padding: 0.375rem 0.5rem;
		border: none;
		border-radius: 0.375rem;
		background: none;
		color: #1e40af;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.toggle-password:hover {
		background: #eff6ff;
	}

	.toggle-password:focus-visible,
	.auth-btn:focus-visible {
		outline: 2px solid #1e40af;
		outline-offset: 2px;
	}

	.auth-btn {
		height: 2.75rem;
		margin-top: 0.25rem;
		background: #1e40af;
		color: #ffffff;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.auth-btn:hover:not(:disabled) {
		background: #1e3a8a;
	}

	.auth-btn:disabled {
		background: #94a3b8;
		cursor: not-allowed;
	}

	.loading-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ---------- Small screens: form only ---------- */
	@media (max-width: 860px) {
		.auth-page {
			grid-template-columns: minmax(0, 1fr);
		}

		.brand-panel {
			display: none;
		}

		.mobile-brand {
			display: flex;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.loading-spinner {
			animation-duration: 2s;
		}
	}
</style>
