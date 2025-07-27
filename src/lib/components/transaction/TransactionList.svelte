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
		ondelete?: (event: { id: string }) => void;
		onedit?: (event: { transaction: Transaction }) => void;
	}

	let { 
		transactions = [],
		title = 'Recent Transactions',
		showActions = true,
		maxItems,
		loading = false,
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

	function handleDelete(transaction: Transaction) {
		if (transaction.id && confirm('Are you sure you want to delete this transaction?')) {
			ondelete?.({ id: transaction.id });
			dispatch('delete', { id: transaction.id });
		}
	}

	function handleEdit(transaction: Transaction) {
		onedit?.({ transaction });
		dispatch('edit', { transaction });
	}
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
				<div class="border rounded-lg p-4 hover:opacity-90 transition-all" style="border-color: var(--color-border-primary); background: var(--color-surface-elevated);">
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center justify-between">
								<h4 class="text-sm font-medium" style="color: var(--color-text-primary);">
									{transaction.description}
								</h4>
								<div class="flex items-center space-x-2">
									<span class="text-sm font-semibold" style="color: {transaction.type === 'income' ? 'var(--color-success)' : 'var(--color-error)'};">
										{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
									</span>
									{#if showActions}
										<div class="flex space-x-1">
											{#if onedit}
												<button
													type="button"
													onclick={() => handleEdit(transaction)}
													class="text-xs font-medium hover:underline"
													style="color: var(--color-accent);"
												>
													Edit
												</button>
											{/if}
											{#if ondelete}
												<button
													type="button"
													onclick={() => handleDelete(transaction)}
													class="text-xs font-medium hover:underline"
													style="color: var(--color-error);"
												>
													Delete
												</button>
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
