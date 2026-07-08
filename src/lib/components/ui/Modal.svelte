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
	<div
		class="modal-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal-container">
			<div class="modal-overlay"></div>
			<div class="modal-panel {sizeClasses[size]}">
				{#if title}
					<div class="modal-header">
						<h3 class="modal-title">{title}</h3>
						<button
							type="button"
							class="modal-close"
							onclick={handleClose}
						>
							<span class="sr-only">Close</span>
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				{/if}

				<div class="modal-body">
					{@render children?.()}
				</div>

				{#if footer}
					<div class="modal-footer">
						{@render footer()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		overflow-y: auto;
		animation: fadeIn 0.15s ease-out;
	}

	.modal-container {
		display: flex;
		min-height: 100%;
		align-items: flex-end;
		justify-content: center;
		padding: 1rem;
	}

	@media (min-width: 640px) {
		.modal-container {
			align-items: center;
			padding: 0;
		}
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
	}

	.modal-panel {
		position: relative;
		width: 100%;
		background: var(--color-surface-elevated);
		border-radius: 0.5rem;
		box-shadow: var(--shadow-xl);
		border: 1px solid var(--color-border-primary);
	}

	@media (min-width: 640px) {
		.modal-panel {
			margin: 2rem 1rem;
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.modal-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.modal-close {
		padding: 0.25rem;
		border-radius: 4px;
		border: none;
		background: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.modal-close:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: 1.25rem;
	}

	.modal-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-border-primary);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
