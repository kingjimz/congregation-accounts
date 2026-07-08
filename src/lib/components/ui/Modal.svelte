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
		overflow: hidden;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease-out;
	}

	.modal-container {
		display: flex;
		height: 100%;
		align-items: flex-end;
		justify-content: center;
	}

	.modal-panel {
		position: relative;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		background: var(--color-surface-elevated);
		border-radius: 0.75rem 0.75rem 0 0;
		box-shadow: var(--shadow-xl);
		border: 1px solid var(--color-border-primary);
		border-bottom: none;
		animation: slideUp 0.25s ease-out;
	}

	@media (min-width: 640px) {
		.modal-container {
			align-items: center;
		}

		.modal-panel {
			border-radius: 0.75rem;
			border-bottom: 1px solid var(--color-border-primary);
			max-height: 85vh;
			margin: 2rem 1rem;
			animation: fadeIn 0.2s ease-out;
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border-primary);
		flex-shrink: 0;
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
		overflow-y: auto;
		flex: 1;
	}

	.modal-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-border-primary);
		flex-shrink: 0;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
</style>
