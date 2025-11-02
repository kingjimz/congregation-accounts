<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Card } from '$lib/components/ui';
	import { formatCurrency, formatDate, formatCategoryName } from '$lib/utils';
	import type { Transaction } from '$lib/types';

	interface Props {
		transactions: Transaction[];
		title?: string;
		showActions?: boolean;
		maxItems?: number;
		loading?: boolean;
		allTransactionsForTotals?: Transaction[]; // All transactions for calculating totals (before filtering/pagination)
		ondelete?: (event: { id: string }) => void;
		onedit?: (event: { transaction: Transaction }) => void;
	}

	let {
		transactions = [],
		title = 'Recent Transactions',
		showActions = true,
		maxItems,
		loading = false,
		allTransactionsForTotals,
		ondelete,
		onedit
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: { id: string };
		edit: { transaction: Transaction };
	}>();

	const displayTransactions = $derived(
		maxItems ? transactions.slice(0, maxItems) : transactions
	);

	// Calculate totals from all transactions (or displayed if allTransactionsForTotals not provided)
	const totals = $derived(() => {
		const transactionsForTotals = allTransactionsForTotals || transactions;
		// Only include donations (income) for donation total
		const totalIncome = transactionsForTotals
			.filter(t => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);
		// Only include expenses for expense total
		const totalExpenses = transactionsForTotals
			.filter(t => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);
		const netTotal = totalIncome - totalExpenses;
		return { totalIncome, totalExpenses, netTotal };
	});

	// Track which menu is open
	let openMenuId = $state<string | null>(null);

	function handleDelete(transaction: Transaction) {
		if (transaction.id) {
			ondelete?.({ id: transaction.id });
			dispatch('delete', { id: transaction.id });
			openMenuId = null;
		}
	}

	function handleEdit(transaction: Transaction) {
		onedit?.({ transaction });
		dispatch('edit', { transaction });
		openMenuId = null;
	}

	function toggleMenu(transactionId: string | undefined) {
		if (!transactionId) return;
		openMenuId = openMenuId === transactionId ? null : transactionId;
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.menu-container')) {
			openMenuId = null;
		}
	}

	$effect(() => {
		if (openMenuId) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<Card title={title}>
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
			<span class="ml-2" style="color: var(--color-text-secondary);">Loading transactions...</span>
		</div>
	{:else if displayTransactions.length === 0}
		<div class="text-center py-8">
			<div class="text-4xl mb-2" style="color: var(--color-text-tertiary);">📝</div>
			<p style="color: var(--color-text-secondary);">No transactions found</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each displayTransactions as transaction (transaction.id)}
				<div class="border rounded-lg p-4 hover:shadow-sm transition-all" style="border-color: var(--color-border-primary); background: var(--color-surface-elevated);">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center justify-between">
								<h4 class="text-sm font-medium" style="color: var(--color-text-primary);">
									{transaction.description}
								</h4>
								<div class="flex items-center gap-3">
									<span class="text-sm font-semibold" style="color: {transaction.type === 'income' ? 'var(--color-success)' : 'var(--color-error)'};">
										{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
									</span>
									{#if showActions}
										<div class="relative menu-container">
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													toggleMenu(transaction.id);
												}}
												class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
												aria-label="Transaction options"
											>
												<svg class="w-5 h-5" style="color: var(--color-text-secondary);" fill="currentColor" viewBox="0 0 24 24">
													<circle cx="12" cy="5" r="2"/>
													<circle cx="12" cy="12" r="2"/>
													<circle cx="12" cy="19" r="2"/>
												</svg>
											</button>

											{#if openMenuId === transaction.id}
												<div class="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50"
													style="background: var(--color-bg-primary); border-color: var(--color-border-primary);">
													<div class="py-1">
														{#if onedit}
															<button
																type="button"
																onclick={(e) => {
																	e.stopPropagation();
																	handleEdit(transaction);
																}}
																class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
																style="color: var(--color-text-primary);"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
																</svg>
																Edit Transaction
															</button>
														{/if}
														{#if ondelete}
															<button
																type="button"
																onclick={(e) => {
																	e.stopPropagation();
																	handleDelete(transaction);
																}}
																class="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
																style="color: var(--color-error);"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
																</svg>
																Delete Transaction
															</button>
														{/if}
													</div>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</div>
							<div class="mt-1 flex items-center justify-between text-xs" style="color: var(--color-text-secondary);">
								<span>{formatCategoryName(transaction.category)}</span>
								<span>{formatDate(transaction.date)}</span>
							</div>
						</div>
					</div>
				</div>
			{/each}

			<!-- Total Row -->
			{#if displayTransactions.length > 0}
				<div class="border-t-2 pt-4 mt-4" style="border-color: var(--color-border-primary);">
					<div class="grid grid-cols-3 gap-4 text-center">
						<div>
							<div class="text-xs font-medium mb-1" style="color: var(--color-text-secondary);">Total Donations</div>
							<div class="text-sm font-semibold" style="color: var(--color-success);">
								+{formatCurrency(totals().totalIncome)}
							</div>
						</div>
						<div>
							<div class="text-xs font-medium mb-1" style="color: var(--color-text-secondary);">Total Expenses</div>
							<div class="text-sm font-semibold" style="color: var(--color-error);">
								-{formatCurrency(totals().totalExpenses)}
							</div>
						</div>
						<div>
							<div class="text-xs font-medium mb-1" style="color: var(--color-text-secondary);">Net Total</div>
							<div class="text-base font-bold" style="color: {totals().netTotal >= 0 ? 'var(--color-success)' : 'var(--color-error)'};">
								{formatCurrency(totals().netTotal)}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if maxItems && transactions.length > maxItems}
			<div class="mt-4 text-center">
				<p class="text-sm" style="color: var(--color-text-secondary);">
					Showing {maxItems} of {transactions.length} transactions
				</p>
			</div>
		{/if}
	{/if}
</Card>

<style>
	.menu-container {
		position: relative;
	}
</style>