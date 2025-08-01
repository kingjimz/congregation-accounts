<script lang="ts">
	import type { ButtonVariant, ButtonSize } from '$lib/types';

	interface Props {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: () => void;
		class?: string;
		children?: any;
	}

	let { 
		variant = 'primary', 
		size = 'md', 
		disabled = false, 
		loading = false, 
		type = 'button',
		onclick,
		class: className = '',
		children
	}: Props = $props();

	const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses: Record<ButtonVariant, string> = {
		primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-sm hover:shadow-md',
		secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500 shadow-sm hover:shadow-md',
		danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm hover:shadow-md',
		ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	const classes = $derived(`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`);
</script>

<button 
	{type}
	class={classes}
	disabled={disabled || loading}
	onclick={onclick}
>
	{#if loading}
		<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
		Loading...
	{:else}
		{@render children?.()}
	{/if}
</button>
