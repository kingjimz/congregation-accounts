<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Input } from '$lib/components/ui';
	import { getTodayLocalDate } from '$lib/utils';
	import type { TransactionFormData } from '$lib/types';

	interface ExpenseEntry {
		category: string;
		description: string;
		amount: string;
	}

	interface Props {
		loading?: boolean;
		onsubmit?: (items: TransactionFormData[]) => void;
		oncancel?: () => void;
	}

	let { loading = false, onsubmit, oncancel }: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: TransactionFormData[];
		cancel: void;
	}>();

	let date = $state(getTodayLocalDate());

	let entries = $state<ExpenseEntry[]>([
		{ category: 'Local Congregation Expenses', description: '', amount: '' },
		{ category: 'Worldwide Work Expenses',     description: '', amount: '' },
		{ category: 'Resolution',                  description: '', amount: '' },
		{ category: 'KHOC',                        description: '', amount: '' }
	]);

	let errors = $state<Record<string, string>>({});

	function parseAmount(val: string): number {
		const n = Number(val);
		return isNaN(n) ? 0 : n;
	}

	function handleSubmit() {
		errors = {};

		if (!date) {
			errors.date = 'Date is required';
			return;
		}

		const active = entries.filter(e => parseAmount(e.amount) > 0);

		if (active.length === 0) {
			errors.amount = 'Enter an amount for at least one expense';
			return;
		}

		// Check that active entries have a description
		const missingDesc = active.filter(e => !e.description.trim());
		if (missingDesc.length > 0) {
			errors.description = `Please enter a description for: ${missingDesc.map(e => e.category).join(', ')}`;
			return;
		}

		const items: TransactionFormData[] = active.map(e => ({
			type: 'expense' as const,
			category: e.category,
			description: e.description.trim(),
			amount: parseAmount(e.amount),
			date
		}));

		onsubmit?.(items);
		dispatch('submit', items);
	}

	function handleCancel() {
		oncancel?.();
		dispatch('cancel');
	}

	function filterNumericInput(event: KeyboardEvent) {
		if (
			[8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
			((event.keyCode === 65 || event.keyCode === 67 || event.keyCode === 86 || event.keyCode === 88) && event.ctrlKey) ||
			(event.keyCode >= 35 && event.keyCode <= 39)
		) return;
		if (event.key === '.' && !(event.target as HTMLInputElement).value.includes('.')) return;
		if ((event.shiftKey || event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105)) {
			event.preventDefault();
		}
	}

	function clearError(key: string) {
		if (errors[key]) errors = { ...errors, [key]: '' };
	}
</script>

<div class="space-y-5">
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5">

		<!-- Date -->
		<Input
			type="date"
			label="Date"
			value={date}
			required
			disabled={loading}
			error={errors.date}
			onchange={(v) => { date = String(v); clearError('date'); }}
		/>

		<!-- Expense rows -->
		{#each entries as entry, i}
			<div class="rounded-lg p-4 space-y-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary);">
				<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-text-secondary);">{entry.category}</p>
				<Input
					type="text"
					label="Description"
					value={entry.description}
					placeholder="Enter description..."
					disabled={loading}
					oninput={(v) => { entries[i].description = String(v); clearError('description'); }}
				/>
				<Input
					type="text"
					label="Amount"
					value={entry.amount}
					placeholder="0.00"
					disabled={loading}
					oninput={(v) => { entries[i].amount = String(v); clearError('amount'); }}
					onkeydown={filterNumericInput}
				/>
			</div>
		{/each}

		<!-- Errors -->
		{#if errors.amount}
			<p class="text-sm" style="color: var(--color-error, #ef4444);">{errors.amount}</p>
		{/if}
		{#if errors.description}
			<p class="text-sm" style="color: var(--color-error, #ef4444);">{errors.description}</p>
		{/if}

		<!-- Actions -->
		<div class="flex justify-end space-x-3 pt-2">
			<Button variant="secondary" onclick={handleCancel} disabled={loading}>Cancel</Button>
			<Button type="submit" variant="primary" loading={loading} disabled={loading}>Save Expenses</Button>
		</div>
	</form>
</div>
