<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { formatCurrency, formatMonthYear } from '$lib/utils';
	import type { Transaction, OpeningBalance } from '$lib/types';

	interface Props {
		month: string;
		transactions: Transaction[];
		openingBalance: OpeningBalance | null;
		loading?: boolean;
		onSetOpeningBalance?: () => void;
	}

	let {
		month,
		transactions,
		openingBalance,
		loading = false,
		onSetOpeningBalance
	}: Props = $props();

	// Calculate totals
	const monthlyIncome = $derived(
		transactions
			.filter(t => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0)
	);

	const monthlyExpenses = $derived(
		transactions
			.filter(t => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0)
	);

	const openingBalanceAmount = $derived(openingBalance?.balance || 0);
	const endingBalance = $derived(openingBalanceAmount + monthlyIncome - monthlyExpenses);

	const monthName = $derived(formatMonthYear(month));
</script>

<Card title={`Monthly Summary - ${monthName}`} variant={endingBalance >= 0 ? 'default' : 'warning'}>
	{#if loading}
		<div class="flex items-center justify-center py-4">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
			<span class="ml-2" style="color: var(--color-text-secondary);">Loading balance...</span>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Opening Balance -->
			<div class="flex justify-between items-center py-3 border-b-2" style="border-color: var(--color-border-primary);">
				<span class="text-base font-semibold" style="color: var(--color-text-primary);">Start of month balance</span>
				<div class="flex items-center gap-2">
					<span class="text-lg font-bold" style="color: var(--color-text-primary);">
						{formatCurrency(openingBalanceAmount)}
					</span>
					{#if onSetOpeningBalance}
						<button
							type="button"
							onclick={onSetOpeningBalance}
							class="p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors"
							title="Set Start of Month Balance"
							aria-label="Set Start of Month Balance"
						>
							<svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Donations -->
			<div class="flex justify-between items-center py-2">
				<span class="text-sm font-medium" style="color: var(--color-text-secondary);">Total Donations</span>
				<span class="text-sm font-semibold" style="color: var(--color-success);">
					+{formatCurrency(monthlyIncome)}
				</span>
			</div>

			<!-- Expenses -->
			<div class="flex justify-between items-center py-2">
				<span class="text-sm font-medium" style="color: var(--color-text-secondary);">Total Expenses</span>
				<span class="text-sm font-semibold" style="color: var(--color-error);">
					-{formatCurrency(monthlyExpenses)}
				</span>
			</div>

			<!-- Ending Balance -->
			<div class="flex justify-between items-center py-3 border-t-2" style="border-color: var(--color-border-primary);">
				<span class="text-base font-semibold" style="color: var(--color-text-primary);">End of month balance</span>
				<span class="text-lg font-bold" style="color: {endingBalance >= 0 ? 'var(--color-success)' : 'var(--color-error)'};">
					{formatCurrency(endingBalance)}
				</span>
			</div>

			<!-- Transaction Count -->
			<div class="rounded-lg p-3 mt-4" style="background: var(--color-surface-primary);">
				<div class="text-center">
					<div class="text-2xl font-bold text-indigo-600">{transactions.length}</div>
					<div class="text-xs" style="color: var(--color-text-tertiary);">Total Transactions</div>
				</div>
				<div class="grid grid-cols-2 gap-4 mt-2 text-center">
					<div>
						<div class="text-sm font-semibold" style="color: var(--color-success);">
							{transactions.filter(t => t.type === 'income').length}
						</div>
						<div class="text-xs" style="color: var(--color-text-tertiary);">Donations</div>
					</div>
					<div>
						<div class="text-sm font-semibold" style="color: var(--color-error);">
							{transactions.filter(t => t.type === 'expense').length}
						</div>
						<div class="text-xs" style="color: var(--color-text-tertiary);">Expenses</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</Card>
