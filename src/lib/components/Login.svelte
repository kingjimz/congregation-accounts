<script lang="ts">
	import { signIn, error } from '$lib/stores/auth';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let email = '';
	let password = '';
	let isLoading = false;

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

	function handleSignUpClick() {
		dispatch('switchToSignUp');
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<div class="auth-brand">
			<div class="brand-icon">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			</div>
		</div>

		<div class="auth-header">
			<h2>Welcome back</h2>
			<p>Sign in to access your congregation accounts</p>
		</div>

		<form on:submit|preventDefault={handleSubmit} class="auth-form">
			{#if $error}
				<div class="error-message">
					<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					<span>{$error}</span>
				</div>
			{/if}

			<div class="form-group">
				<label for="email">Email Address</label>
				<input id="email" type="email" bind:value={email} placeholder="Enter your email" required disabled={isLoading} />
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input id="password" type="password" bind:value={password} placeholder="Enter your password" required disabled={isLoading} />
			</div>

			<button type="submit" class="auth-btn" disabled={isLoading || !email || !password}>
				{#if isLoading}
					<span class="loading-spinner"></span>
					Signing In...
				{:else}
					Sign In
				{/if}
			</button>
		</form>
	</div>

	<p class="auth-footer-text">Congregation Accounts</p>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #0f172a;
		padding: 1rem;
	}

	.auth-card {
		background: #ffffff;
		border-radius: 0.75rem;
		padding: 2rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 380px;
	}

	.auth-brand {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.brand-icon {
		width: 48px;
		height: 48px;
		background: #1e40af;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.auth-header h2 {
		margin: 0 0 0.375rem 0;
		color: #0f172a;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.auth-header p {
		margin: 0;
		color: #64748b;
		font-size: 0.8125rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #fef2f2;
		color: #dc2626;
		padding: 0.625rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		border: 1px solid #fecaca;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		margin-bottom: 0.375rem;
		color: #374151;
		font-weight: 500;
		font-size: 0.8125rem;
	}

	.form-group input {
		padding: 0.625rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: border-color 0.15s, box-shadow 0.15s;
		background: #ffffff;
		color: #0f172a;
	}

	.form-group input:focus {
		outline: none;
		border-color: #1e40af;
		box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.1);
	}

	.form-group input:disabled {
		background: #f9fafb;
		cursor: not-allowed;
	}

	.auth-btn {
		background: #1e40af;
		color: white;
		padding: 0.625rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
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

	.auth-footer-text {
		margin-top: 1.5rem;
		color: #475569;
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.05em;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
