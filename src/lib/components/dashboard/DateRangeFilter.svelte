<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui';

	interface Props {
		startDate: string;
		endDate: string;
		loading?: boolean;
		onchange?: (startDate: string, endDate: string) => void;
		onreset?: () => void;
	}

	let {
		startDate,
		endDate,
		loading = false,
		onchange,
		onreset
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		change: { startDate: string; endDate: string };
		reset: void;
	}>();

	function handleStartDateChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newStartDate = target.value;

		// Ensure end date is not before start date
		if (endDate && newStartDate > endDate) {
			endDate = newStartDate;
		}

		startDate = newStartDate;
		onchange?.(startDate, endDate);
		dispatch('change', { startDate, endDate });
	}

	function handleEndDateChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newEndDate = target.value;

		// Ensure start date is not after end date
		if (startDate && newEndDate < startDate) {
			startDate = newEndDate;
		}

		endDate = newEndDate;
		onchange?.(startDate, endDate);
		dispatch('change', { startDate, endDate });
	}

	function handleReset() {
		onreset?.();
		dispatch('reset');
	}

	// Quick filter options
	function setThisMonth() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		startDate = `${year}-${month}-01`;

		// Get last day of current month
		const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
		endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

		onchange?.(startDate, endDate);
		dispatch('change', { startDate, endDate });
	}

	function setLastMonth() {
		const now = new Date();
		const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const year = lastMonth.getFullYear();
		const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
		startDate = `${year}-${month}-01`;

		// Get last day of last month
		const lastDay = new Date(year, lastMonth.getMonth() + 1, 0).getDate();
		endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

		onchange?.(startDate, endDate);
		dispatch('change', { startDate, endDate });
	}

	function setThisYear() {
		const year = new Date().getFullYear();
		startDate = `${year}-01-01`;
		endDate = `${year}-12-31`;

		onchange?.(startDate, endDate);
		dispatch('change', { startDate, endDate });
	}

	function setLastYear() {
		const year = new Date().getFullYear() - 1;
		startDate = `${year}-01-01`;
		endDate = `${year}-12-31`;

		onchange?.(startDate, endDate);
		dispatch('change', { startDate, endDate });
	}

	function setAllTime() {
		startDate = '';
		endDate = '';
		onchange?.(startDate, endDate);
		dispatch('change', { startDate, endDate });
	}
</script>

<div class="p-4 rounded-lg" style="background: var(--color-surface-primary); border: 1px solid var(--color-border-primary);">
	<div class="flex flex-col space-y-4">
		<!-- Date inputs row -->
		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
			<div class="flex-1">
				<label for="start-date" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
					From Date:
				</label>
				<input
					id="start-date"
					type="date"
					value={startDate}
					onchange={handleStartDateChange}
					disabled={loading}
					class="block w-full rounded-lg border px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
				/>
			</div>

			<div class="flex-1">
				<label for="end-date" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
					To Date:
				</label>
				<input
					id="end-date"
					type="date"
					value={endDate}
					onchange={handleEndDateChange}
					disabled={loading}
					class="block w-full rounded-lg border px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
				/>
			</div>

			<div class="flex items-end">
				<Button
					variant="secondary"
					onclick={handleReset}
					disabled={loading || (!startDate && !endDate)}
				>
					Clear
				</Button>
			</div>
		</div>

		<!-- Quick filter buttons -->
		<div class="flex flex-wrap gap-2">
			<span class="text-sm font-medium self-center mr-2" style="color: var(--color-text-secondary);">
				Quick filters:
			</span>
			<button
				onclick={setThisMonth}
				disabled={loading}
				class="px-3 py-1 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50"
				style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);"
			>
				This Month
			</button>
			<button
				onclick={setLastMonth}
				disabled={loading}
				class="px-3 py-1 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50"
				style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);"
			>
				Last Month
			</button>
			<button
				onclick={setThisYear}
				disabled={loading}
				class="px-3 py-1 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50"
				style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);"
			>
				This Year
			</button>
			<button
				onclick={setLastYear}
				disabled={loading}
				class="px-3 py-1 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50"
				style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);"
			>
				Last Year
			</button>
			<button
				onclick={setAllTime}
				disabled={loading}
				class="px-3 py-1 text-sm rounded-lg transition-colors hover:bg-indigo-50 disabled:opacity-50"
				style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-secondary); color: var(--color-text-primary);"
			>
				All Time
			</button>
		</div>
	</div>
</div>