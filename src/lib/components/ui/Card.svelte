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

	const paddingClasses = {
		none: '',
		sm: 'p-4',
		md: 'p-5',
		lg: 'p-6'
	};

	const contentClasses = $derived(paddingClasses[padding]);
</script>

<div
	class="card {className}"
	class:card-success={variant === 'success'}
	class:card-warning={variant === 'warning'}
	class:card-error={variant === 'error'}
	class:card-info={variant === 'info'}
>
	{#if header}
		<div class="card-header">
			{@render header()}
		</div>
	{:else if title}
		<div class="card-header">
			<h3 class="card-title">{title}</h3>
		</div>
	{/if}

	<div class={contentClasses}>
		{@render children?.()}
	</div>

	{#if footer}
		<div class="card-footer">
			{@render footer()}
		</div>
	{/if}
</div>

<style>
	.card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		box-shadow: var(--shadow-sm);
	}

	.card-success {
		border-left: 3px solid var(--color-success);
	}

	.card-warning {
		border-left: 3px solid var(--color-warning);
	}

	.card-error {
		border-left: 3px solid var(--color-error);
	}

	.card-info {
		border-left: 3px solid var(--color-info);
	}

	.card-header {
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.card-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.card-footer {
		padding: 0.875rem 1.25rem;
		border-top: 1px solid var(--color-border-primary);
	}
</style>
