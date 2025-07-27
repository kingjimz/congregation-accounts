<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		onclose?: () => void;
		children?: any;
		footer?: any;
	}

	let { 
		open = false,
		title = '',
		size = 'md',
		onclose,
		children,
		footer
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	};

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleClose() {
		onclose?.();
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 z-50 overflow-y-auto"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
			<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
			
			<!-- Modal panel -->
			<div class="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full {sizeClasses[size]}" style="background: var(--color-surface-elevated);">
				<!-- Header -->
				{#if title}
					<div class="border-b px-6 py-4" style="border-color: var(--color-border-primary);">
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-medium" style="color: var(--color-text-primary);">{title}</h3>
							<button 
								type="button"
								class="rounded-md hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
								style="background: var(--color-surface-elevated); color: var(--color-text-secondary);"
								onclick={handleClose}
							>
								<span class="sr-only">Close</span>
								<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				{/if}

				<!-- Content -->
				<div class="px-6 py-4">
					{@render children?.()}
				</div>

				<!-- Footer -->
				{#if footer}
					<div class="border-t px-6 py-4" style="border-color: var(--color-border-primary);">
						{@render footer()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
