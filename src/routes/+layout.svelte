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
	
	// Navigation visibility state
	let showBottomNav = $state(true);
	let lastScrollY = $state(0);
	let scrollTimeout: number;

	// Show auth component when user is not authenticated
	$effect(() => {
		showingAuth = !$loading && !$user;
	});

	// Show setup notice when there's an auth configuration error
	$effect(() => {
		showSetupNotice = $error?.includes('operation-not-allowed') || false;
	});

	onMount(() => {
		// Initialize theme
		theme.init();
		
		// Show setup instructions if there's an auth setup error
		if ($error && $error.includes('operation-not-allowed')) {
			import('$lib/firebase-setup-helper').then(({ getFirebaseSetupInstructions }) => {
				setupInstructions = getFirebaseSetupInstructions();
				console.log(setupInstructions);
			});
		}

		// Handle scroll events for bottom navigation visibility
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const scrollThreshold = 50; // Minimum scroll distance to trigger hide/show
			const scrollDelta = Math.abs(currentScrollY - lastScrollY);

			// Only react to scroll changes above the threshold to avoid sensitivity
			if (scrollDelta < scrollThreshold) return;

			// Clear any existing timeout to debounce rapid scroll events
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}

			// Debounce the scroll handling to prevent flicker
			scrollTimeout = setTimeout(() => {
				// Show nav when scrolling up, hide when scrolling down
				if (currentScrollY < lastScrollY) {
					// Scrolling up - show navigation
					showBottomNav = true;
				} else if (currentScrollY > lastScrollY && currentScrollY > 100) {
					// Scrolling down and past initial area - hide navigation
					showBottomNav = false;
				}

				// Always show nav when near the top of the page
				if (currentScrollY < 100) {
					showBottomNav = true;
				}

				lastScrollY = currentScrollY;
			}, 100); // 100ms debounce delay
		};

		// Initialize last scroll position
		lastScrollY = window.scrollY;

		// Add scroll event listener
		window.addEventListener('scroll', handleScroll, { passive: true });

		// Cleanup function
		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
		};
	});

	function handleAuthSuccess() {
		// User state will be updated automatically by the auth store
		console.log('Authentication successful');
		// Redirect to home page after successful authentication
		goto('/');
	}

	async function handleSignOut() {
		const { signOut } = await import('$lib/stores/auth');
		await signOut();
	}

	// Function to check if current route is active
	function isActive(route: string): boolean {
		if (route === '/' && $page.url.pathname === '/') return true;
		if (route !== '/' && $page.url.pathname.startsWith(route)) return true;
		return false;
	}

	// Function to format username from email
	function formatUsername(email: string | undefined): string {
		if (!email) return '';

		// Get the part before @
		const username = email.split('@')[0];

		// Split by dots and capitalize each part
		const parts = username.split('.');
		const formatted = parts
			.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
			.join(' ');

		return formatted;
	}
</script>

{#if $loading}
	<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
		<div class="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-6"></div>
		<p class="text-xl font-medium">Loading...</p>
	</div>
{:else if showingAuth}
	<Auth on:authSuccess={handleAuthSuccess} />
{:else}
	<div class="flex flex-col min-h-screen transition-colors duration-300" style="background: var(--color-bg-secondary);">
		<!-- Header -->
		<header class="header-container z-40 bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg">
			<div class="header-accent"></div>
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between py-6">
					<h1 class="text-2xl font-bold flex items-center">
						<span class="text-emerald-400 font-extrabold mr-3 text-3xl tracking-tight drop-shadow-sm">CA</span>
						<span class="header-title text-white font-semibold tracking-wide drop-shadow-sm">
							Congregation Accounts
						</span>
					</h1>
					<div class="flex items-center space-x-4">
						<div class="hidden sm:block">
							<span class="text-white/90 text-sm font-medium">Welcome back,</span>
							<span class="text-white font-semibold ml-1 drop-shadow-sm">{formatUsername($user?.email)}</span>
						</div>
						<button 
							onclick={handleSignOut}
							class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg font-medium transition-all duration-200 border border-white/20 hover:border-white/30 backdrop-blur-sm shadow-sm"
							title="Sign Out"
							aria-label="Sign Out"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</header>

		<!-- Main content area -->
		<main class="flex-1 pb-20">
			{@render children()}
		</main>

		<!-- Bottom Navigation -->
		<nav class="fixed bottom-0 left-0 right-0 backdrop-blur-lg border-t shadow-lg transition-all duration-300 ease-in-out {showBottomNav ? 'translate-y-0' : 'translate-y-full'}"
			 style="background: var(--color-glass-bg); border-color: var(--color-border-primary);">
			<div class="flex justify-center max-w-lg mx-auto px-2">
				<a
					href="/"
					class="flex-1 flex flex-col items-center py-3 px-3 rounded-lg mx-1 transition-all duration-200 {isActive('/') ? 'text-indigo-600' : ''}"
					style="color: {isActive('/') ? '#4f46e5' : 'var(--color-text-secondary)'}; background: {isActive('/') ? 'rgba(79, 70, 229, 0.1)' : 'transparent'};"
				>
					<svg class="w-6 h-6 mb-1 {isActive('/') ? 'stroke-2' : 'stroke-1.5'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
					</svg>
					<span class="text-xs font-medium {isActive('/') ? 'font-semibold' : ''}">Home</span>
					{#if isActive('/')}
						<div class="w-4 h-0.5 bg-indigo-600 rounded-full mt-1"></div>
					{/if}
				</a>
				<a
					href="/notes"
					class="flex-1 flex flex-col items-center py-3 px-3 rounded-lg mx-1 transition-all duration-200 {isActive('/notes') ? 'text-indigo-600' : ''}"
					style="color: {isActive('/notes') ? '#4f46e5' : 'var(--color-text-secondary)'}; background: {isActive('/notes') ? 'rgba(79, 70, 229, 0.1)' : 'transparent'};"
				>
					<svg class="w-6 h-6 mb-1 {isActive('/notes') ? 'stroke-2' : 'stroke-1.5'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
					</svg>
					<span class="text-xs font-medium {isActive('/notes') ? 'font-semibold' : ''}">Notes</span>
					{#if isActive('/notes')}
						<div class="w-4 h-0.5 bg-indigo-600 rounded-full mt-1"></div>
					{/if}
				</a>
				<a
					href="/khoc"
					class="flex-1 flex flex-col items-center py-3 px-3 rounded-lg mx-1 transition-all duration-200 {isActive('/khoc') ? 'text-indigo-600' : ''}"
					style="color: {isActive('/khoc') ? '#4f46e5' : 'var(--color-text-secondary)'}; background: {isActive('/khoc') ? 'rgba(79, 70, 229, 0.1)' : 'transparent'};"
				>
					<svg class="w-6 h-6 mb-1 {isActive('/khoc') ? 'stroke-2' : 'stroke-1.5'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
					</svg>
					<span class="text-xs font-medium {isActive('/khoc') ? 'font-semibold' : ''}">KHOC</span>
					{#if isActive('/khoc')}
						<div class="w-4 h-0.5 bg-indigo-600 rounded-full mt-1"></div>
					{/if}
				</a>
				<a
					href="/settings"
					class="flex-1 flex flex-col items-center py-3 px-3 rounded-lg mx-1 transition-all duration-200 {isActive('/settings') ? 'text-indigo-600' : ''}"
					style="color: {isActive('/settings') ? '#4f46e5' : 'var(--color-text-secondary)'}; background: {isActive('/settings') ? 'rgba(79, 70, 229, 0.1)' : 'transparent'};"
				>
					<svg class="w-6 h-6 mb-1 {isActive('/settings') ? 'stroke-2' : 'stroke-1.5'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					<span class="text-xs font-medium {isActive('/settings') ? 'font-semibold' : ''}">Help</span>
					{#if isActive('/settings')}
						<div class="w-4 h-0.5 bg-indigo-600 rounded-full mt-1"></div>
					{/if}
				</a>
			</div>
		</nav>
	</div>
{/if}

<!-- Setup Notice Modal -->
<SetupNotice show={showSetupNotice} instructions={setupInstructions} />

<!-- PWA Install Prompt -->
<PWAInstallPrompt />

<style>
	.header-container {
		position: relative;
		overflow: hidden;
	}

	.header-accent {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(90deg, 
			#10b981 0%, 
			#3b82f6 25%, 
			#8b5cf6 50%, 
			#ec4899 75%, 
			#f59e0b 100%
		);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.header-title {
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		filter: brightness(1.1);
	}

	/* Custom scrollbar for better UX */
	:global(html) {
		scroll-behavior: smooth;
	}
	
	:global(*::-webkit-scrollbar) {
		width: 6px;
	}
	
	:global(*::-webkit-scrollbar-track) {
		background: #f1f5f9;
	}
	
	:global(*::-webkit-scrollbar-thumb) {
		background: #cbd5e1;
		border-radius: 3px;
	}
	
	:global(*::-webkit-scrollbar-thumb:hover) {
		background: #94a3b8;
	}
</style>
