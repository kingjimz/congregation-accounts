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

	let monthInput: HTMLInputElement;

	const currentMonth = new Date().toISOString().slice(0, 7);
	let isCurrentMonth = $derived((value || currentMonth) >= currentMonth);

	function formatMonthLabel(val: string): string {
		if (!val) {
			const now = new Date();
			return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
		}
		const [year, month] = val.split('-').map(Number);
		const date = new Date(year, month - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
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
		value = newValue;
		onchange?.(newValue); dispatch('change', { month: newValue });
	}

	function showNextMonth() {
		const current = value || new Date().toISOString().slice(0, 7);
		const [year, month] = current.split('-').map(Number);
		let nextMonth = month + 1;
		let nextYear = year;
		if (nextMonth === 13) { nextMonth = 1; nextYear = year + 1; }
		const newValue = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
		value = newValue;
		onchange?.(newValue); dispatch('change', { month: newValue });
	}
</script>

<div class="month-picker">
	<button onclick={showPreviousMonth} disabled={loading} class="nav-btn" title="Previous Month">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
		</svg>
	</button>

	<button class="month-label" onclick={() => monthInput?.showPicker?.()} disabled={loading}>
		{formatMonthLabel(value)}
	</button>
	<input bind:this={monthInput} type="month" {value} max={currentMonth} onchange={handleChange} class="month-input-hidden" tabindex="-1" />

	<button onclick={showNextMonth} disabled={loading || isCurrentMonth} class="nav-btn" title="Next Month">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
		</svg>
	</button>
</div>

<style>
	.month-picker {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.month-label {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		transition: background 0.15s;
		white-space: nowrap;
		min-width: 10rem;
		text-align: center;
	}

	.month-label:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.month-label:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.month-input-hidden {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
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
</style>
