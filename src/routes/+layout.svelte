<script lang="ts">
	import '../app.css';
	import { user, loading, error } from '$lib/stores/auth';
	import { theme } from '$lib/stores/theme';
	import Auth from '$lib/components/Auth.svelte';
	import SetupNotice from '$lib/components/SetupNotice.svelte';
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
		<header class="bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between py-6">
					<h1 class="text-2xl font-bold text-white flex items-center">
						<span class="text-3xl mr-3 drop-shadow-sm">🏛️</span>
						<span class="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
							Congregation Accounts
						</span>
					</h1>
					<div class="flex items-center space-x-4">
						<div class="hidden sm:block">
							<span class="text-indigo-100 text-sm">Welcome back,</span>
							<span class="text-white font-medium ml-1">{formatUsername($user?.email)}</span>
						</div>
						<button 
							onclick={handleSignOut}
							class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg font-medium transition-all duration-200 border border-white/20 hover:border-white/30 backdrop-blur-sm"
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
			<div class="flex justify-center max-w-md mx-auto px-2">
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
					href="/settings"
					class="flex-1 flex flex-col items-center py-3 px-3 rounded-lg mx-1 transition-all duration-200 {isActive('/settings') ? 'text-indigo-600' : ''}"
					style="color: {isActive('/settings') ? '#4f46e5' : 'var(--color-text-secondary)'}; background: {isActive('/settings') ? 'rgba(79, 70, 229, 0.1)' : 'transparent'};"
				>
					<svg class="w-6 h-6 mb-1 {isActive('/settings') ? 'stroke-2' : 'stroke-1.5'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
					<span class="text-xs font-medium {isActive('/settings') ? 'font-semibold' : ''}">Settings</span>
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

<style>
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
