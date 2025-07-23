<script lang="ts">
	import '../app.css';
	import { user, loading, error } from '$lib/stores/auth';
	import Auth from '$lib/components/Auth.svelte';
	import SetupNotice from '$lib/components/SetupNotice.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	let showingAuth = $state(false);
	let showSetupNotice = $state(false);
	let setupInstructions = $state('');

	// Show auth component when user is not authenticated
	$effect(() => {
		showingAuth = !$loading && !$user;
	});

	// Show setup notice when there's an auth configuration error
	$effect(() => {
		showSetupNotice = $error?.includes('operation-not-allowed') || false;
	});

	onMount(async () => {
		// Show setup instructions if there's an auth setup error
		if ($error && $error.includes('operation-not-allowed')) {
			const { getFirebaseSetupInstructions } = await import('$lib/firebase-setup-helper');
			setupInstructions = getFirebaseSetupInstructions();
			console.log(setupInstructions);
		}
	});

	function handleAuthSuccess() {
		// User state will be updated automatically by the auth store
		console.log('Authentication successful');
	}

	async function handleSignOut() {
		const { signOut } = await import('$lib/stores/auth');
		await signOut();
	}
</script>

{#if $loading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading...</p>
	</div>
{:else if showingAuth}
	<Auth on:authSuccess={handleAuthSuccess} />
{:else}
	<div class="app">
		<!-- Header -->
		<header class="header">
			<div class="header-content">
				<h1>🏛️ Congregation Accounts</h1>
				<div class="user-info">
					<span>Welcome, {$user?.email}</span>
					<button class="sign-out-btn" onclick={handleSignOut}>
						Sign Out
					</button>
				</div>
			</div>
		</header>

		<!-- Main content area where pages are displayed -->
		<main class="main-content">
			{@render children()}
		</main>

		<!-- Bottom Navigation -->
		<nav class="bottom-nav">
			<a href="/" class="nav-item">
				<!-- Home Icon (SVG) -->
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
					<path d="M3 10.75L12 4l9 6.75V20a1 1 0 0 1-1 1h-5v-5h-6v5H4a1 1 0 0 1-1-1V10.75z" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<span>Home</span>
			</a>
			<a href="/transactions" class="nav-item">
				<!-- Transactions Icon (SVG) -->
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
					<rect x="3" y="4" width="18" height="16" rx="2" stroke="#64748b" stroke-width="2"/>
					<path d="M3 10h18" stroke="#64748b" stroke-width="2"/>
					<circle cx="8" cy="7" r="1" fill="#64748b"/>
					<circle cx="12" cy="7" r="1" fill="#64748b"/>
					<circle cx="16" cy="7" r="1" fill="#64748b"/>
				</svg>
				<span>Transactions</span>
			</a>
			<a href="/settings" class="nav-item">
				<!-- Settings Icon (SVG) -->
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="3" stroke="#64748b" stroke-width="2"/>
				</svg>
				<span>Settings</span>
			</a>
		</nav>
	</div>
{/if}

<!-- Setup Notice Modal -->
<SetupNotice show={showSetupNotice} instructions={setupInstructions} />

<style>
	.loading-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		gap: 1rem;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.header {
		background-color: #2563eb;
		color: white;
		padding: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.sign-out-btn {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		padding: 0.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.sign-out-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.main-content {
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
	}

	.bottom-nav {
		display: flex;
		background-color: #f8fafc;
		border-top: 1px solid #e2e8f0;
		padding: 0.5rem 0;
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		text-decoration: none;
		color: #64748b;
		transition: color 0.2s;
	}

	.nav-item:hover {
		color: #2563eb;
	}

	.nav-item span {
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: 1rem;
		}

		.header h1 {
			font-size: 1.25rem;
		}

		.user-info {
			flex-direction: column;
			gap: 0.5rem;
			text-align: center;
		}
	}

	@media (max-width: 640px) {
		.header {
			padding: 0.75rem;
		}
		
		.main-content {
			padding: 0.75rem;
		}
	}
</style>
