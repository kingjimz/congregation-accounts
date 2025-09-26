<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value: string; // YYYY-MM format or empty string for 'all'
		loading?: boolean;
		onchange?: (month: string) => void;
		showAll?: boolean;
	}

	let {
		value,
		loading = false,
		onchange,
		showAll = false
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		change: { month: string };
	}>();

	let isShowingAll = $state(value === '');

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = target.value;
		value = newValue;
		isShowingAll = false;
		onchange?.(newValue);
		dispatch('change', { month: newValue });
	}

	function showPreviousMonth() {
		const current = value || new Date().toISOString().slice(0, 7);
		const [year, month] = current.split('-').map(Number);

		let prevMonth = month - 1;
		let prevYear = year;

		if (prevMonth === 0) {
			prevMonth = 12;
			prevYear = year - 1;
		}

		const newValue = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
		value = newValue;
		isShowingAll = false;
		onchange?.(newValue);
		dispatch('change', { month: newValue });
	}

	function showNextMonth() {
		const current = value || new Date().toISOString().slice(0, 7);
		const [year, month] = current.split('-').map(Number);

		let nextMonth = month + 1;
		let nextYear = year;

		if (nextMonth === 13) {
			nextMonth = 1;
			nextYear = year + 1;
		}

		const newValue = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
		value = newValue;
		isShowingAll = false;
		onchange?.(newValue);
		dispatch('change', { month: newValue });
	}

	function showAllTransactions() {
		value = '';
		isShowingAll = true;
		onchange?.('');
		dispatch('change', { month: '' });
	}
</script>

<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
	<div class="flex items-center space-x-3">
		<label for="month-picker" class="text-sm font-medium" style="color: var(--color-text-secondary);">
			View Month:
		</label>
		<input
			id="month-picker"
			type="month"
			{value}
			onchange={handleChange}
			disabled={loading || isShowingAll}
			class="rounded-lg border px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
			style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
			placeholder={isShowingAll ? 'All transactions' : ''}
		/>
	</div>

	<div class="flex items-center gap-2">
		<button
			onclick={showPreviousMonth}
			disabled={loading}
			class="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1"
			style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);"
			title="Previous Month"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
			</svg>
			Previous
		</button>

		<button
			onclick={showNextMonth}
			disabled={loading}
			class="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1"
			style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);"
			title="Next Month"
		>
			Next
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
			</svg>
		</button>

		{#if showAll}
			<button
				onclick={showAllTransactions}
				disabled={loading}
				class="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50 {isShowingAll ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}"
				style="{isShowingAll ? '' : 'background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);'}"
			>
				All
			</button>
		{/if}
	</div>
</div>