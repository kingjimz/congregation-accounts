<script lang="ts">
	import { signIn, error } from '$lib/stores/auth';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let email = '';
	let password = '';
	let isLoading = false;

	async function handleSubmit() {
		if (!email || !password) {
			return;
		}

		try {
			isLoading = true;
			await signIn(email, password);
			dispatch('success');
		} catch (err) {
			// Error is handled by the auth store
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
		<div class="auth-header">
			<h2>Welcome Back</h2>
			<p>Sign in to access your congregation accounts</p>
		</div>

		<form on:submit|preventDefault={handleSubmit} class="auth-form">
			{#if $error}
				<div class="error-message">
					{$error}
				</div>
			{/if}

			<div class="form-group">
				<label for="email">Email Address</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="Enter your email"
					required
					disabled={isLoading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter your password"
					required
					disabled={isLoading}
				/>
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
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 1rem;
	}

	.auth-card {
		background: white;
		border-radius: 16px;
		padding: 2.5rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.auth-header h2 {
		margin: 0 0 0.5rem 0;
		color: #1e293b;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.auth-header p {
		margin: 0;
		color: #64748b;
		font-size: 0.875rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-message {
		background: #fee2e2;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: 8px;
		font-size: 0.875rem;
		border: 1px solid #fecaca;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		margin-bottom: 0.5rem;
		color: #374151;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.form-group input {
		padding: 0.875rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
		background: white;
	}

	.form-group input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.form-group input:disabled {
		background: #f9fafb;
		cursor: not-allowed;
	}

	.auth-btn {
		background: #2563eb;
		color: white;
		padding: 0.875rem 1rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s, transform 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.auth-btn:hover:not(:disabled) {
		background: #1d4ed8;
		transform: translateY(-1px);
	}

	.auth-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		transform: none;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

</style>
