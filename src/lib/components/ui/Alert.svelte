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

	function handleDismiss() {
		ondismiss?.();
	}
</script>

<div class="alert alert-{variant}">
	<div class="alert-icon">
		{#if variant === 'success'}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
		{:else if variant === 'warning'}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
			</svg>
		{:else if variant === 'error'}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
		{:else}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
		{/if}
	</div>

	<div class="alert-content">
		{#if title}
			<p class="alert-title">{title}</p>
		{/if}
		<p class="alert-message">{message}</p>
	</div>

	{#if dismissible}
		<button
			type="button"
			class="alert-dismiss"
			onclick={handleDismiss}
		>
			<span class="sr-only">Dismiss</span>
			<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.alert {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		border: 1px solid;
		font-size: 0.8125rem;
	}

	.alert-success {
		background: var(--color-success-bg);
		border-color: var(--color-success-border);
		color: var(--color-success);
	}

	.alert-warning {
		background: var(--color-warning-bg);
		border-color: var(--color-warning-border);
		color: var(--color-warning);
	}

	.alert-error {
		background: var(--color-error-bg);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	.alert-info {
		background: var(--color-info-bg);
		border-color: var(--color-info-border);
		color: var(--color-info);
	}

	.alert-icon {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.alert-content {
		flex: 1;
		min-width: 0;
	}

	.alert-title {
		font-weight: 600;
		margin: 0 0 0.125rem 0;
	}

	.alert-message {
		margin: 0;
	}

	.alert-dismiss {
		flex-shrink: 0;
		padding: 0.125rem;
		border-radius: 4px;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.15s;
	}

	.alert-dismiss:hover {
		opacity: 1;
	}
</style>
