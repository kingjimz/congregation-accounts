<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Select } from '$lib/components/ui';
	import { formatMonthYear } from '$lib/utils';

	interface Props {
		selectedMonth: string;
		availableMonths: string[];
		loading?: boolean;
		onchange?: (month: string) => void;
	}

	let { 
		selectedMonth,
		availableMonths,
		loading = false,
		onchange
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		change: { month: string };
	}>();

	// Convert months to options for select component
	const monthOptions = $derived(
		availableMonths.map(month => ({
			value: month,
			label: formatMonthYear(month)
		}))
	);

	function handleMonthChange(month: string) {
		onchange?.(month);
		dispatch('change', { month });
	}
</script>

<div class="flex items-center space-x-3">
	<label for="month-selector" class="text-sm font-medium" style="color: var(--color-text-secondary);">
		View Month:
	</label>
	<div class="min-w-[200px]">
		<Select
			id="month-selector"
			value={selectedMonth}
			options={monthOptions}
			placeholder="Select a month..."
			disabled={loading || availableMonths.length === 0}
			onchange={handleMonthChange}
		/>
	</div>
</div>

{#if availableMonths.length === 0 && !loading}
	<p class="text-sm mt-2" style="color: var(--color-text-secondary);">
		No data available. Add some transactions or set an opening balance to get started.
	</p>
{/if}
