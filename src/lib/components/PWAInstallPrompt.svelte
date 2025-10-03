<script lang="ts">
	import { onMount } from 'svelte';

	let deferredPrompt: any = $state(null);
	let showPrompt = $state(false);

	onMount(() => {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			showPrompt = true;
		});

		window.addEventListener('appinstalled', () => {
			showPrompt = false;
			deferredPrompt = null;
		});
	});

	async function installApp() {
		if (!deferredPrompt) return;

		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			showPrompt = false;
		}

		deferredPrompt = null;
	}

	function dismiss() {
		showPrompt = false;
	}
</script>

{#if showPrompt}
	<div class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
		<div class="flex items-start gap-3">
			<div class="flex-1">
				<h3 class="font-semibold text-gray-900 mb-1">Install Congregation Accounts</h3>
				<p class="text-sm text-gray-600 mb-3">
					Install this app on your device for quick and easy access.
				</p>
				<div class="flex gap-2">
					<button
						onclick={installApp}
						class="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
					>
						Install
					</button>
					<button
						onclick={dismiss}
						class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
					>
						Not now
					</button>
				</div>
			</div>
			<button onclick={dismiss} class="text-gray-400 hover:text-gray-600">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
{/if}
