<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value: string;
		loading?: boolean;
		onchange?: (month: string) => void;
		showAll?: boolean;
	}

	let { value, loading = false, onchange, showAll = false }: Props = $props();

	const dispatch = createEventDispatcher<{ change: { month: string } }>();

	let isShowingAll = $state(value === '');

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		isShowingAll = false;
		onchange?.(target.value);
		dispatch('change', { month: target.value });
	}

	function showPreviousMonth() {
		const current = value || new Date().toISOString().slice(0, 7);
		const [year, month] = current.split('-').map(Number);
		let prevMonth = month - 1;
		let prevYear = year;
		if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }
		const newValue = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
		value = newValue; isShowingAll = false;
		onchange?.(newValue); dispatch('change', { month: newValue });
	}

	function showNextMonth() {
		const current = value || new Date().toISOString().slice(0, 7);
		const [year, month] = current.split('-').map(Number);
		let nextMonth = month + 1;
		let nextYear = year;
		if (nextMonth === 13) { nextMonth = 1; nextYear = year + 1; }
		const newValue = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
		value = newValue; isShowingAll = false;
		onchange?.(newValue); dispatch('change', { month: newValue });
	}

	function showAllTransactions() {
		value = ''; isShowingAll = true;
		onchange?.(''); dispatch('change', { month: '' });
	}
</script>

<div class="month-picker">
	<div class="picker-group">
		<label for="month-picker" class="picker-label">Period:</label>
		<input id="month-picker" type="month" {value} onchange={handleChange} disabled={loading || isShowingAll}
			class="picker-input" placeholder={isShowingAll ? 'All transactions' : ''} />
	</div>
	<div class="picker-nav">
		<button onclick={showPreviousMonth} disabled={loading} class="nav-btn" title="Previous Month">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
			</svg>
			<span class="nav-text">Prev</span>
		</button>
		<button onclick={showNextMonth} disabled={loading} class="nav-btn" title="Next Month">
			<span class="nav-text">Next</span>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
			</svg>
		</button>
		{#if showAll}
			<button onclick={showAllTransactions} disabled={loading} class="nav-btn {isShowingAll ? 'nav-btn-active' : ''}">
				All
			</button>
		{/if}
	</div>
</div>

<style>
	.month-picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	@media (min-width: 640px) {
		.month-picker {
			flex-direction: row;
			align-items: center;
		}
	}

	.picker-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.picker-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.picker-input {
		padding: 0.375rem 0.625rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.8125rem;
		transition: border-color 0.15s;
	}

	.picker-input:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px var(--color-accent-alpha);
	}

	.picker-input:disabled {
		opacity: 0.5;
	}

	.picker-nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.nav-btn-active {
		background: var(--color-accent) !important;
		color: #ffffff !important;
		border-color: var(--color-accent) !important;
	}

	.nav-text {
		display: none;
	}

	@media (min-width: 640px) {
		.nav-text {
			display: inline;
		}
	}
</style>
