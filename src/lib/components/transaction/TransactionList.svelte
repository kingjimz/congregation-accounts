<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Button, Card, Select } from '$lib/components/ui';
	import { formatCurrency, formatDate, formatCategoryName, sortTransactions, getSortPreference, saveSortPreference, type SortField, type SortOrder } from '$lib/utils';
	import type { Transaction } from '$lib/types';

	interface Props {
		transactions: Transaction[];
		title?: string;
		showActions?: boolean;
		maxItems?: number;
		loading?: boolean;
		allTransactionsForTotals?: Transaction[];
		ondelete?: (event: { id: string }) => void;
		onedit?: (event: { transaction: Transaction }) => void;
		showSortControls?: boolean;
		sortField?: SortField;
		sortOrder?: SortOrder;
		onsortchange?: (event: { field: SortField; order: SortOrder }) => void;
	}

	let {
		transactions = [],
		title = 'Recent Transactions',
		showActions = true,
		maxItems,
		loading = false,
		allTransactionsForTotals,
		ondelete,
		onedit,
		showSortControls = true,
		sortField: propSortField,
		sortOrder: propSortOrder,
		onsortchange
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: { id: string };
		edit: { transaction: Transaction };
		sortchange: { field: SortField; order: SortOrder };
	}>();

	let internalSortField = $state<SortField>('date');
	let internalSortOrder = $state<SortOrder>('desc');
	let isInitialized = $state(false);

	const sortField = $derived(propSortField ?? internalSortField);
	const sortOrder = $derived(propSortOrder ?? internalSortOrder);

	onMount(() => {
		if (propSortField === undefined && propSortOrder === undefined) {
			const preference = getSortPreference();
			internalSortField = preference.field;
			internalSortOrder = preference.order;
		}
		isInitialized = true;
	});

	$effect(() => {
		if (isInitialized && propSortField === undefined && propSortOrder === undefined) {
			saveSortPreference({ field: internalSortField, order: internalSortOrder });
		}
	});

	const sortOptions = [
		{ value: 'date', label: 'Date' },
		{ value: 'amount', label: 'Amount' },
		{ value: 'description', label: 'Description' },
		{ value: 'category', label: 'Category' },
		{ value: 'type', label: 'Type' }
	];

	const displayTransactions = $derived(
		maxItems ? transactions.slice(0, maxItems) : transactions
	);

	const totals = $derived(() => {
		const transactionsForTotals = allTransactionsForTotals || transactions;
		const totalIncome = transactionsForTotals.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
		const totalExpenses = transactionsForTotals.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
		return { totalIncome, totalExpenses, netTotal: totalIncome - totalExpenses };
	});

	let openMenuId = $state<string | null>(null);

	function handleDelete(transaction: Transaction) {
		if (transaction.id) { ondelete?.({ id: transaction.id }); dispatch('delete', { id: transaction.id }); openMenuId = null; }
	}

	function handleEdit(transaction: Transaction) {
		onedit?.({ transaction }); dispatch('edit', { transaction }); openMenuId = null;
	}

	function toggleMenu(transactionId: string | undefined) {
		if (!transactionId) return;
		openMenuId = openMenuId === transactionId ? null : transactionId;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.menu-container')) openMenuId = null;
	}

	$effect(() => {
		if (openMenuId) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	function handleSortFieldChange(value: string) {
		const newField = value as SortField;
		if (propSortField !== undefined || propSortOrder !== undefined) {
			onsortchange?.({ field: newField, order: sortOrder }); dispatch('sortchange', { field: newField, order: sortOrder });
		} else { internalSortField = newField; }
	}

	function toggleSortOrder() {
		const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		if (propSortField !== undefined || propSortOrder !== undefined) {
			onsortchange?.({ field: sortField, order: newOrder }); dispatch('sortchange', { field: sortField, order: newOrder });
		} else { internalSortOrder = newOrder; }
	}
</script>

<Card title={title}>
	{#if showSortControls && !loading && transactions.length > 0}
		<div class="sort-controls">
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<label for="sort-field" class="text-xs font-medium whitespace-nowrap" style="color: var(--color-text-secondary);">Sort by:</label>
				<div class="flex-1 sm:flex-none min-w-[130px]">
					<Select id="sort-field" value={sortField} options={sortOptions} onchange={handleSortFieldChange} />
				</div>
				<Button variant="secondary" size="sm" onclick={toggleSortOrder}>
					{#if sortOrder === 'asc'}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
						</svg>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
						</svg>
					{/if}
				</Button>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-6 w-6 border-2 border-transparent" style="border-top-color: var(--color-accent);"></div>
			<span class="ml-2 text-sm" style="color: var(--color-text-secondary);">Loading transactions...</span>
		</div>
	{:else if displayTransactions.length === 0}
		<div class="text-center py-12">
			<svg class="w-10 h-10 mx-auto mb-3" style="color: var(--color-text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
			</svg>
			<p class="text-sm" style="color: var(--color-text-secondary);">No transactions found</p>
		</div>
	{:else}
		<div class="transaction-list">
			{#each displayTransactions as transaction (transaction.id)}
				<div class="transaction-row">
					<div class="transaction-type-indicator {transaction.type === 'income' ? 'type-income' : 'type-expense'}"></div>
					<div class="transaction-content">
						<div class="transaction-main">
							<div class="transaction-info">
								<span class="transaction-desc">{transaction.description}</span>
								<div class="transaction-meta">
									<span class="transaction-category">{formatCategoryName(transaction.category)}</span>
									<span class="transaction-date">{formatDate(transaction.date)}</span>
								</div>
							</div>
							<div class="transaction-amount-area">
								<span class="transaction-amount tabular-nums {transaction.type === 'income' ? 'amount-income' : 'amount-expense'}">
									{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
								</span>
								{#if showActions}
									<div class="relative menu-container">
										<button type="button" onclick={(e) => { e.stopPropagation(); toggleMenu(transaction.id); }} class="action-menu-btn" aria-label="Options">
											<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
												<circle cx="12" cy="5" r="1.5"/>
												<circle cx="12" cy="12" r="1.5"/>
												<circle cx="12" cy="19" r="1.5"/>
											</svg>
										</button>
										{#if openMenuId === transaction.id}
											<div class="action-dropdown">
												{#if onedit}
													<button type="button" onclick={(e) => { e.stopPropagation(); handleEdit(transaction); }} class="dropdown-item">
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
														</svg>
														Edit
													</button>
												{/if}
												{#if ondelete}
													<button type="button" onclick={(e) => { e.stopPropagation(); handleDelete(transaction); }} class="dropdown-item dropdown-danger">
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
														</svg>
														Delete
													</button>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}

			<!-- Totals -->
			{#if displayTransactions.length > 0}
				<div class="totals-row">
					<div class="totals-item">
						<span class="totals-label">Donations</span>
						<span class="totals-value tabular-nums" style="color: var(--color-income);">+{formatCurrency(totals().totalIncome)}</span>
					</div>
					<div class="totals-item">
						<span class="totals-label">Expenses</span>
						<span class="totals-value tabular-nums" style="color: var(--color-expense);">-{formatCurrency(totals().totalExpenses)}</span>
					</div>
					<div class="totals-item totals-net">
						<span class="totals-label">Net</span>
						<span class="totals-value tabular-nums" style="color: {totals().netTotal >= 0 ? 'var(--color-income)' : 'var(--color-expense)'};">
							{formatCurrency(totals().netTotal)}
						</span>
					</div>
				</div>
			{/if}
		</div>

		{#if maxItems && transactions.length > maxItems}
			<div class="mt-3 text-center">
				<p class="text-xs" style="color: var(--color-text-secondary);">Showing {maxItems} of {transactions.length}</p>
			</div>
		{/if}
	{/if}
</Card>

<style>
	.sort-controls {
		margin-bottom: 0.75rem;
		display: flex;
		padding: 0.625rem;
		border-radius: 0.375rem;
		background: var(--color-surface-primary);
		border: 1px solid var(--color-border-primary);
	}

	.transaction-list {
		display: flex;
		flex-direction: column;
	}

	.transaction-row {
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid var(--color-border-primary);
		transition: background 0.1s;
	}

	.transaction-row:last-of-type {
		border-bottom: none;
	}

	.transaction-row:hover {
		background: var(--color-surface-hover);
	}

	.transaction-type-indicator {
		width: 3px;
		flex-shrink: 0;
		border-radius: 3px 0 0 3px;
	}

	.type-income {
		background: var(--color-income);
	}

	.type-expense {
		background: var(--color-expense);
	}

	.transaction-content {
		flex: 1;
		padding: 0.75rem 1rem;
		min-width: 0;
	}

	.transaction-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.transaction-info {
		flex: 1;
		min-width: 0;
	}

	.transaction-desc {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-primary);
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.transaction-meta {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.125rem;
		font-size: 0.6875rem;
		color: var(--color-text-tertiary);
	}

	.transaction-category {
		padding: 0.0625rem 0.375rem;
		background: var(--color-bg-tertiary);
		border-radius: 3px;
		font-weight: 500;
	}

	.transaction-amount-area {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.transaction-amount {
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.amount-income {
		color: var(--color-income);
	}

	.amount-expense {
		color: var(--color-expense);
	}

	.action-menu-btn {
		padding: 0.25rem;
		border-radius: 4px;
		border: none;
		background: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-menu-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.action-dropdown {
		position: absolute;
		right: 0;
		margin-top: 0.25rem;
		width: 10rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		overflow: hidden;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
	}

	.dropdown-item:hover {
		background: var(--color-surface-hover);
	}

	.dropdown-danger {
		color: var(--color-error);
	}

	.dropdown-danger:hover {
		background: var(--color-error-bg);
	}

	/* Totals */
	.totals-row {
		display: flex;
		gap: 1.5rem;
		padding: 0.75rem 1rem;
		margin-top: 0.25rem;
		border-top: 2px solid var(--color-border-primary);
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.totals-item {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
	}

	.totals-net {
		padding-left: 1rem;
		border-left: 1px solid var(--color-border-primary);
	}

	.totals-label {
		font-size: 0.625rem;
		font-weight: 500;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.totals-value {
		font-size: 0.875rem;
		font-weight: 700;
	}

	.menu-container {
		position: relative;
	}
</style>
