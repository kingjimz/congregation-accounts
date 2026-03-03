<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Input } from '$lib/components/ui';
	import { getTodayLocalDate } from '$lib/utils';
	import type { TransactionFormData } from '$lib/types';

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
	let wwAmount = $state<string>('');
	let lcAmount = $state<string>('');

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

		const ww = parseAmount(wwAmount);
		const lc = parseAmount(lcAmount);

		if (ww <= 0 && lc <= 0) {
			errors.amount = 'Enter an amount for at least one donation type';
			return;
		}

		if (ww < 0 || lc < 0) {
			errors.amount = 'Amounts cannot be negative';
			return;
		}

		const items: TransactionFormData[] = [];

		if (ww > 0) {
			items.push({
				type: 'income',
				category: 'Worldwide Work Donations',
				description: 'Contributions to Worldwide Work',
				amount: ww,
				date
			});
		}

		if (lc > 0) {
			items.push({
				type: 'income',
				category: 'Local Congregation Donations',
				description: 'Contributions - Local Congregation Expenses',
				amount: lc,
				date
			});
		}

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
			onchange={(v) => { date = String(v); if (errors.date) errors = { ...errors, date: '' }; }}
		/>

		<!-- Worldwide Work -->
		<div class="rounded-lg p-4 space-y-1" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary);">
			<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-text-secondary);">Worldwide Work</p>
			<p class="text-xs mb-2" style="color: var(--color-text-secondary);">Contributions to Worldwide Work</p>
			<Input
				type="text"
				label="Amount"
				value={wwAmount}
				placeholder="0.00"
				disabled={loading}
				oninput={(v) => { wwAmount = String(v); if (errors.amount) errors = { ...errors, amount: '' }; }}
				onkeydown={filterNumericInput}
			/>
		</div>

		<!-- Local Congregation -->
		<div class="rounded-lg p-4 space-y-1" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary);">
			<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-text-secondary);">Local Congregation</p>
			<p class="text-xs mb-2" style="color: var(--color-text-secondary);">Contributions - Local Congregation Expenses</p>
			<Input
				type="text"
				label="Amount"
				value={lcAmount}
				placeholder="0.00"
				disabled={loading}
				oninput={(v) => { lcAmount = String(v); if (errors.amount) errors = { ...errors, amount: '' }; }}
				onkeydown={filterNumericInput}
			/>
		</div>

		<!-- Amount error -->
		{#if errors.amount}
			<p class="text-sm" style="color: var(--color-error, #ef4444);">{errors.amount}</p>
		{/if}

		<!-- Actions -->
		<div class="flex justify-end space-x-3 pt-2">
			<Button variant="secondary" onclick={handleCancel} disabled={loading}>Cancel</Button>
			<Button type="submit" variant="primary" loading={loading} disabled={loading}>Save Donations</Button>
		</div>
	</form>
</div>
