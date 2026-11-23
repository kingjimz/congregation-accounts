<script lang="ts">
	interface Props {
		open: boolean;
		title?: string;
		message?: string;
		// Shown in a pill under the message, such as the downloaded file name
		detail?: string;
		buttonLabel?: string;
		onclose?: () => void;
	}

	let {
		open = false,
		title = 'Success',
		message = '',
		detail = '',
		buttonLabel = 'Done',
		onclose
	}: Props = $props();

	let doneButton = $state<HTMLButtonElement | null>(null);

	// Focus the button so Enter and Escape work straight away
	$effect(() => {
		if (open) doneButton?.focus();
	});

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) onclose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose?.();
	}
</script>

{#if open}
	<div
		class="success-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="success-modal-title"
		tabindex="-1"
	>
		<div class="success-panel">
			<div class="success-icon">
				<svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
					<circle class="success-ring" cx="26" cy="26" r="23" />
					<path class="success-check" d="M15.5 27l7 7 14-15" />
				</svg>
			</div>

			<h3 id="success-modal-title" class="success-title">{title}</h3>
			{#if message}
				<p class="success-message">{message}</p>
			{/if}
			{#if detail}
				<div class="success-detail" title={detail}>
					<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
					</svg>
					<span class="success-detail-text">{detail}</span>
				</div>
			{/if}

			<button bind:this={doneButton} type="button" class="success-button" onclick={() => onclose?.()}>
				{buttonLabel}
			</button>
		</div>
	</div>
{/if}

<style>
	.success-backdrop {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		animation: successFade 0.2s ease-out;
	}

	.success-panel {
		width: 100%;
		max-width: 22rem;
		padding: 2rem 1.5rem 1.5rem;
		text-align: center;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 1rem;
		box-shadow: var(--shadow-xl);
		animation: successPop 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2);
	}

	.success-icon {
		width: 4.5rem;
		height: 4.5rem;
		margin: 0 auto 1.25rem;
		border-radius: 9999px;
		background: var(--color-success-bg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.success-icon svg {
		width: 3.25rem;
		height: 3.25rem;
	}

	.success-ring {
		stroke: var(--color-success);
		stroke-width: 2.5;
		stroke-dasharray: 145;
		stroke-dashoffset: 145;
		transform: rotate(-90deg);
		transform-origin: center;
		animation: successDraw 0.5s 0.1s ease-out forwards;
	}

	.success-check {
		stroke: var(--color-success);
		stroke-width: 3.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 32;
		stroke-dashoffset: 32;
		animation: successDraw 0.3s 0.5s ease-out forwards;
	}

	.success-title {
		margin: 0 0 0.375rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.success-message {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}

	.success-detail {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.success-detail-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.success-button {
		width: 100%;
		margin-top: 1.5rem;
		padding: 0.625rem 1rem;
		border: none;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: filter 0.15s;
	}

	.success-button:hover {
		filter: brightness(1.1);
	}

	.success-button:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	@keyframes successFade {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes successPop {
		from { opacity: 0; transform: scale(0.92); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes successDraw {
		to { stroke-dashoffset: 0; }
	}

	@media (prefers-reduced-motion: reduce) {
		.success-backdrop,
		.success-panel {
			animation: none;
		}

		.success-ring,
		.success-check {
			animation: none;
			stroke-dashoffset: 0;
		}
	}
</style>
