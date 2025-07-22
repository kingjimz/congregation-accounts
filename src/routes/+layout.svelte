<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="app">
	<!-- Header -->
	<header class="header">
		<h1>Congregation Accounts</h1>
		<!-- Add navigation links, user info, etc. here -->
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

<style>
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

	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
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
	@media (max-width: 640px) {
		.header {
			padding: 0.75rem;
		}
		
		.header h1 {
			font-size: 1.25rem;
		}
		
		.main-content {
			padding: 0.75rem;
		}
	}
</style>
