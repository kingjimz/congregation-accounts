<script lang="ts">
	interface Props {
		variant?: 'success' | 'warning' | 'error' | 'info';
		title?: string;
		message: string;
		dismissible?: boolean;
		ondismiss?: () => void;
	}

	let { 
		variant = 'info',
		title = '',
		message = '',
		dismissible = false,
		ondismiss
	}: Props = $props();

	const baseClasses = 'rounded-xl p-4 flex items-start shadow-sm border';
	
	const variantConfig = {
		success: {
			classes: 'bg-green-50 border-green-200',
			iconColor: 'text-green-400',
			textColor: 'text-green-800',
			icon: '✓'
		},
		warning: {
			classes: 'bg-yellow-50 border-yellow-200',
			iconColor: 'text-yellow-400',
			textColor: 'text-yellow-800',
			icon: '⚠️'
		},
		error: {
			classes: 'bg-red-50 border-red-200',
			iconColor: 'text-red-400',
			textColor: 'text-red-800',
			icon: '⚠️'
		},
		info: {
			classes: 'bg-blue-50 border-blue-200',
			iconColor: 'text-blue-400',
			textColor: 'text-blue-800',
			icon: 'ℹ️'
		}
	};

	const config = $derived(variantConfig[variant]);
	const alertClasses = $derived(`${baseClasses} ${config.classes}`);

	function handleDismiss() {
		ondismiss?.();
	}
</script>

<div class={alertClasses}>
	<div class="flex-shrink-0">
		<span class="text-xl">{config.icon}</span>
	</div>
	
	<div class="ml-3 flex-1">
		{#if title}
			<h3 class="text-sm font-medium {config.textColor}">{title}</h3>
			<div class="mt-1 text-sm {config.textColor}">
				{message}
			</div>
		{:else}
			<p class="text-sm font-medium {config.textColor}">{message}</p>
		{/if}
	</div>

	{#if dismissible}
		<div class="ml-auto pl-3">
			<div class="-mx-1.5 -my-1.5">
				<button 
					type="button"
					class="inline-flex rounded-md p-1.5 {config.textColor} hover:bg-opacity-20 hover:bg-current focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
					onclick={handleDismiss}
				>
					<span class="sr-only">Dismiss</span>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
</div>
