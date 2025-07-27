<script lang="ts">
	interface Props {
		title?: string;
		variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children?: any;
		header?: any;
		footer?: any;
	}

	let { 
		title = '',
		variant = 'default',
		padding = 'md',
		class: className = '',
		children,
		header,
		footer
	}: Props = $props();

	const baseClasses = 'rounded-xl shadow-sm border';
	
	const variantClasses = {
		default: '',
		success: 'bg-green-50 border-green-200',
		warning: 'bg-yellow-50 border-yellow-200',
		error: 'bg-red-50 border-red-200',
		info: 'bg-blue-50 border-blue-200'
	};

	const paddingClasses = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8'
	};

	const cardClasses = $derived(`${baseClasses} ${variantClasses[variant]} ${className}`);
	const contentClasses = $derived(paddingClasses[padding]);
</script>

<div class={cardClasses} style="background: var(--color-surface-elevated); border-color: var(--color-border-primary);">
	{#if header}
		<div class="border-b px-6 py-4" style="border-color: var(--color-border-primary);">
			{@render header()}
		</div>
	{:else if title}
		<div class="border-b px-6 py-4" style="border-color: var(--color-border-primary);">
			<h3 class="text-lg font-medium" style="color: var(--color-text-primary);">{title}</h3>
		</div>
	{/if}

	<div class={contentClasses}>
		{@render children?.()}
	</div>

	{#if footer}
		<div class="border-t px-6 py-4" style="border-color: var(--color-border-primary);">
			{@render footer()}
		</div>
	{/if}
</div>
