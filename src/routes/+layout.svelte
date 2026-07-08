<script lang="ts">
	import '../app.css';
	import { user, loading, error } from '$lib/stores/auth';
	import { theme } from '$lib/stores/theme';
	import Auth from '$lib/components/Auth.svelte';
	import SetupNotice from '$lib/components/SetupNotice.svelte';
	import PWAInstallPrompt from '$lib/components/PWAInstallPrompt.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { children } = $props();

	let showingAuth = $state(false);
	let showSetupNotice = $state(false);
	let setupInstructions = $state('');
	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);

	$effect(() => {
		showingAuth = !$loading && !$user;
	});

	$effect(() => {
		showSetupNotice = $error?.includes('operation-not-allowed') || false;
	});

	onMount(() => {
		theme.init();

		if ($error && $error.includes('operation-not-allowed')) {
			import('$lib/firebase-setup-helper').then(({ getFirebaseSetupInstructions }) => {
				setupInstructions = getFirebaseSetupInstructions();
				console.log(setupInstructions);
			});
		}

		// Load sidebar state from localStorage
		const savedCollapsed = localStorage.getItem('sidebar_collapsed');
		if (savedCollapsed !== null) {
			sidebarCollapsed = savedCollapsed === 'true';
		}
	});

	function handleAuthSuccess() {
		console.log('Authentication successful');
		goto('/');
	}

	async function handleSignOut() {
		const { signOut } = await import('$lib/stores/auth');
		await signOut();
	}

	function isActive(route: string): boolean {
		if (route === '/' && $page.url.pathname === '/') return true;
		if (route !== '/' && $page.url.pathname.startsWith(route)) return true;
		return false;
	}

	function formatUsername(email: string | null | undefined): string {
		if (!email) return '';
		const username = email.split('@')[0];
		const parts = username.split('.');
		return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
	}

	function toggleMobileSidebar() {
		mobileSidebarOpen = !mobileSidebarOpen;
	}

	function closeMobileSidebar() {
		mobileSidebarOpen = false;
	}

	// Close mobile sidebar on navigation
	$effect(() => {
		$page.url.pathname;
		mobileSidebarOpen = false;
	});

	function toggleTheme() {
		const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
		theme.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
	}

	const navItems = [
		{
			href: '/',
			label: 'Dashboard',
			icon: 'dashboard'
		},
		{
			href: '/notes',
			label: 'Notes',
			icon: 'notes'
		},
		{
			href: '/khoc',
			label: 'KHOC',
			icon: 'lock'
		},
		{
			href: '/settings',
			label: 'Help',
			icon: 'help'
		}
	];
</script>

{#if $loading}
	<div class="loading-screen">
		<div class="loading-brand">
			<div class="loading-icon">
				<span class="loading-ca">CA</span>
			</div>
			<div class="loading-spinner-ring"></div>
		</div>
		<p class="loading-text">Loading your accounts...</p>
	</div>
{:else if showingAuth}
	<Auth on:authSuccess={handleAuthSuccess} />
{:else}
	<div class="app-layout">
		<!-- Desktop Sidebar -->
		<aside class="sidebar {sidebarCollapsed ? 'sidebar-collapsed' : ''}">
			<!-- Brand -->
			<div class="sidebar-brand">
				{#if !sidebarCollapsed}
					<div class="brand-icon">
						<span class="brand-icon-text">CA</span>
					</div>
					<div class="brand-text">
						<span class="brand-name">Congregation</span>
						<span class="brand-sub">Accounts</span>
					</div>
				{:else}
					<div class="brand-icon">
						<span class="brand-icon-text">CA</span>
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			<nav class="sidebar-nav">
				<div class="nav-section">
					{#if !sidebarCollapsed}
						<span class="nav-section-label">MENU</span>
					{/if}
					{#each navItems as item}
						<a
							href={item.href}
							class="nav-link {isActive(item.href) ? 'nav-link-active' : ''}"
							title={sidebarCollapsed ? item.label : ''}
						>
							<span class="nav-icon">
								{#if item.icon === 'dashboard'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
									</svg>
								{:else if item.icon === 'notes'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
									</svg>
								{:else if item.icon === 'lock'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
									</svg>
								{:else if item.icon === 'help'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
									</svg>
								{/if}
							</span>
							{#if !sidebarCollapsed}
								<span class="nav-label">{item.label}</span>
							{/if}
						</a>
					{/each}
				</div>
			</nav>

			<!-- Sidebar Footer -->
			<div class="sidebar-footer">
				<!-- Theme Toggle -->
				<button
					onclick={toggleTheme}
					class="sidebar-footer-btn"
					title="Toggle theme"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
					</svg>
					{#if !sidebarCollapsed}
						<span class="nav-label">Theme</span>
					{/if}
				</button>

				<!-- Collapse Toggle -->
				<button
					onclick={toggleSidebar}
					class="sidebar-footer-btn"
					title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				>
					<svg class="w-5 h-5 transition-transform {sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"/>
					</svg>
					{#if !sidebarCollapsed}
						<span class="nav-label">Collapse</span>
					{/if}
				</button>
			</div>
		</aside>

		<!-- Mobile Sidebar Overlay -->
		{#if mobileSidebarOpen}
			<div class="mobile-overlay" onclick={closeMobileSidebar} role="presentation"></div>
			<aside class="mobile-sidebar">
				<div class="sidebar-brand">
					<div class="brand-icon">
						<span class="brand-icon-text">CA</span>
					</div>
					<div class="brand-text">
						<span class="brand-name">Congregation</span>
						<span class="brand-sub">Accounts</span>
					</div>
					<button onclick={closeMobileSidebar} class="mobile-close" aria-label="Close menu">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>
				<nav class="sidebar-nav">
					<div class="nav-section">
						<span class="nav-section-label">MENU</span>
						{#each navItems as item}
							<a
								href={item.href}
								class="nav-link {isActive(item.href) ? 'nav-link-active' : ''}"
								onclick={closeMobileSidebar}
							>
								<span class="nav-icon">
									{#if item.icon === 'dashboard'}
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
										</svg>
									{:else if item.icon === 'notes'}
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
										</svg>
									{:else if item.icon === 'lock'}
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
										</svg>
									{:else if item.icon === 'help'}
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
										</svg>
									{/if}
								</span>
								<span class="nav-label">{item.label}</span>
							</a>
						{/each}
					</div>
				</nav>
				<div class="sidebar-footer">
					<button onclick={toggleTheme} class="sidebar-footer-btn">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
						</svg>
						<span class="nav-label">Toggle Theme</span>
					</button>
				</div>
			</aside>
		{/if}

		<!-- Main Content Area -->
		<div class="main-wrapper {sidebarCollapsed ? 'main-expanded' : ''}">
			<!-- Top Bar -->
			<header class="topbar">
				<div class="topbar-left">
					<button class="mobile-menu-btn" onclick={toggleMobileSidebar} aria-label="Open menu">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
						</svg>
					</button>
					<div class="topbar-page-info">
						<h2 class="topbar-title">
							{#if isActive('/') && $page.url.pathname === '/'}
								Dashboard
							{:else if isActive('/notes')}
								Notes
							{:else if isActive('/khoc')}
								KHOC
							{:else if isActive('/settings')}
								Help & Support
							{:else}
								Congregation Accounts
							{/if}
						</h2>
					</div>
				</div>
				<div class="topbar-right">
					<div class="topbar-user">
						<div class="user-avatar">
							{formatUsername($user?.email)?.charAt(0) || 'U'}
						</div>
						<div class="user-info">
							<span class="user-name">{formatUsername($user?.email)}</span>
							<span class="user-role">Account Manager</span>
						</div>
					</div>
					<button
						onclick={handleSignOut}
						class="signout-btn"
						title="Sign Out"
						aria-label="Sign Out"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
						</svg>
					</button>
				</div>
			</header>

			<!-- Page Content -->
			<main class="main-content">
				{@render children()}
			</main>
		</div>

		<!-- Mobile Bottom Navigation -->
		<nav class="mobile-bottom-nav">
			{#each navItems as item}
				<a
					href={item.href}
					class="mobile-nav-link {isActive(item.href) ? 'mobile-nav-active' : ''}"
				>
					<span class="mobile-nav-icon">
						{#if item.icon === 'dashboard'}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width={isActive(item.href) ? '2' : '1.5'} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
							</svg>
						{:else if item.icon === 'notes'}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width={isActive(item.href) ? '2' : '1.5'} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
							</svg>
						{:else if item.icon === 'lock'}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width={isActive(item.href) ? '2' : '1.5'} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
							</svg>
						{:else if item.icon === 'help'}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width={isActive(item.href) ? '2' : '1.5'} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
							</svg>
						{/if}
					</span>
					<span class="mobile-nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>
	</div>
{/if}

<SetupNotice show={showSetupNotice} instructions={setupInstructions} />
<PWAInstallPrompt />

<style>
	/* Loading Screen */
	.loading-screen {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-sidebar-bg);
	}

	.loading-brand {
		position: relative;
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.loading-icon {
		width: 40px;
		height: 40px;
		background: var(--color-accent);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-ca {
		font-size: 0.875rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.02em;
	}

	.loading-spinner-ring {
		position: absolute;
		inset: -4px;
		border: 2px solid transparent;
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.loading-text {
		color: var(--color-sidebar-text);
		font-size: 0.875rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* App Layout */
	.app-layout {
		display: flex;
		min-height: 100vh;
		background: var(--color-bg-secondary);
	}

	/* Sidebar */
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: 240px;
		background: var(--color-sidebar-bg);
		display: flex;
		flex-direction: column;
		z-index: 40;
		transition: width 0.2s ease;
		border-right: 1px solid var(--color-sidebar-border);
	}

	.sidebar-collapsed {
		width: 64px;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1rem;
		border-bottom: 1px solid var(--color-sidebar-border);
	}

	.brand-icon {
		width: 36px;
		height: 36px;
		background: var(--color-accent);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.brand-icon-text {
		font-size: 0.75rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.02em;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.brand-name {
		font-size: 1rem;
		font-weight: 700;
		color: #ffffff;
		line-height: 1.2;
	}

	.brand-sub {
		font-size: 0.6875rem;
		color: var(--color-sidebar-text);
		line-height: 1.2;
	}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		padding: 1rem 0.5rem;
		overflow-y: auto;
	}

	.nav-section {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-section-label {
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--color-sidebar-text);
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.25rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: 6px;
		color: var(--color-sidebar-text);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.nav-link:hover {
		background: var(--color-sidebar-hover);
		color: var(--color-sidebar-text-active);
	}

	.nav-link-active {
		background: var(--color-sidebar-active);
		color: var(--color-sidebar-text-active);
	}

	.nav-icon {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-label {
		white-space: nowrap;
		overflow: hidden;
	}

	.sidebar-collapsed .nav-link {
		justify-content: center;
		padding: 0.625rem;
	}

	.sidebar-collapsed .nav-section-label {
		display: none;
	}

	/* Sidebar Footer */
	.sidebar-footer {
		padding: 0.5rem;
		border-top: 1px solid var(--color-sidebar-border);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.sidebar-footer-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: 6px;
		color: var(--color-sidebar-text);
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		width: 100%;
		transition: all 0.15s ease;
	}

	.sidebar-footer-btn:hover {
		background: var(--color-sidebar-hover);
		color: var(--color-sidebar-text-active);
	}

	.sidebar-collapsed .sidebar-footer-btn {
		justify-content: center;
		padding: 0.625rem;
	}

	/* Main Content */
	.main-wrapper {
		margin-left: 240px;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		transition: margin-left 0.2s ease;
	}

	.main-expanded {
		margin-left: 64px;
	}

	/* Top Bar */
	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		height: 56px;
		background: var(--color-bg-primary);
		border-bottom: 1px solid var(--color-border-primary);
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.mobile-menu-btn {
		display: none;
		padding: 0.5rem;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}

	.mobile-menu-btn:hover {
		background: var(--color-surface-hover);
	}

	.topbar-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.topbar-user {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--color-accent);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.user-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		line-height: 1.2;
	}

	.user-role {
		font-size: 0.6875rem;
		color: var(--color-text-tertiary);
		line-height: 1.2;
	}

	.signout-btn {
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.signout-btn:hover {
		background: var(--color-error-bg);
		color: var(--color-error);
		border-color: var(--color-error-border);
	}

	/* Main Content */
	.main-content {
		flex: 1;
		overflow-x: hidden;
	}

	/* Mobile Bottom Nav */
	.mobile-bottom-nav {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--color-bg-primary);
		border-top: 1px solid var(--color-border-primary);
		z-index: 40;
		padding: 0.25rem 0.5rem;
	}

	.mobile-nav-link {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0.25rem;
		border-radius: 8px;
		color: var(--color-text-tertiary);
		text-decoration: none;
		transition: all 0.15s ease;
		gap: 0.125rem;
	}

	.mobile-nav-active {
		color: var(--color-accent);
	}

	.mobile-nav-label {
		font-size: 0.625rem;
		font-weight: 500;
	}

	/* Mobile Sidebar */
	.mobile-overlay {
		display: none;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 50;
	}

	.mobile-sidebar {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: 280px;
		background: var(--color-sidebar-bg);
		z-index: 51;
		flex-direction: column;
		animation: slideIn 0.2s ease;
	}

	.mobile-close {
		margin-left: auto;
		padding: 0.375rem;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--color-sidebar-text);
		cursor: pointer;
	}

	.mobile-close:hover {
		background: var(--color-sidebar-hover);
	}

	@keyframes slideIn {
		from { transform: translateX(-100%); }
		to { transform: translateX(0); }
	}

	/* Responsive */
	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}

		.main-wrapper {
			margin-left: 0;
			padding-bottom: 60px;
		}

		.main-expanded {
			margin-left: 0;
		}

		.mobile-bottom-nav {
			display: flex;
		}

		.mobile-menu-btn {
			display: flex;
		}

		.mobile-overlay {
			display: block;
		}

		.mobile-sidebar {
			display: flex;
		}

		.user-info {
			display: none;
		}

		.topbar {
			padding: 0 1rem;
		}
	}

	@media (min-width: 769px) {
		.mobile-overlay,
		.mobile-sidebar {
			display: none !important;
		}
	}
</style>
