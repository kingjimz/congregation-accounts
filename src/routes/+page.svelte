<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions, loading, error, transactionStore } from '$lib/stores/transactions';
	import { openingBalances, openingBalanceStore } from '$lib/stores/opening-balances';
	import { Alert, Button, Modal, Card } from '$lib/components/ui';
	import TransactionForm from '$lib/components/forms/TransactionForm.svelte';
	import TransactionList from '$lib/components/transaction/TransactionList.svelte';
	import MonthPicker from '$lib/components/dashboard/MonthPicker.svelte';
	import FinancialChart from '$lib/components/dashboard/FinancialChart.svelte';
	import ChartSummary from '$lib/components/dashboard/ChartSummary.svelte';
	import { TransactionService } from '$lib/services/TransactionService';
	import { formatCurrency } from '$lib/utils';
	import type { TransactionFormData, Transaction, OpeningBalance } from '$lib/types';

	// UI state
	let showTransactionForm = $state(false);
	let showOpeningBalanceForm = $state(false);
	let showEditTransactionForm = $state(false);
	let showDeleteConfirmation = $state(false);
	let submitting = $state(false);
	let selectedMonth = $state(new Date().toISOString().slice(0, 7)); // YYYY-MM format
	let editingTransaction = $state<Transaction | null>(null);
	let deletingTransactionId = $state<string | null>(null);

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);

	// Filter state
	let transactionFilter = $state<'all' | 'income' | 'expense'>('all');

	// Opening balance form state
	let newOpeningBalance = $state(0);
	let openingBalanceNote = $state('');
	let openingBalanceDate = $state(new Date().toISOString().slice(0, 10));

	// Load data on mount
	onMount(async () => {
		console.log('Dashboard loaded for authenticated user');
		await Promise.all([
			transactionStore.loadTransactions(),
			openingBalanceStore.loadOpeningBalances()
		]);
	});


	// Get monthly data for selected month
	const monthlyData = $derived(() => {
		if (selectedMonth === '') {
			// Show all transactions
			return {
				transactions: [...$transactions].sort((a, b) => b.date.localeCompare(a.date)),
				openingBalance: 0
			};
		}
		return TransactionService.getMonthlyData(selectedMonth, $transactions, $openingBalances);
	});

	// Get all transactions for display with filter applied
	const allTransactions = $derived(() => {
		const transactions = monthlyData().transactions;
		if (transactionFilter === 'all') {
			return transactions;
		}
		return transactions.filter(t => t.type === transactionFilter);
	});


	// Helper functions for category classification
	function isLocalCategory(category: string): boolean {
		return category.toLowerCase().includes('local congregation');
	}

	function isWorldwideCategory(category: string): boolean {
		return category.toLowerCase().includes('worldwide work');
	}

	// Calculate summary totals
	const summaryTotals = $derived(() => {
		const transactions = monthlyData().transactions;
		const openingBalanceValue = monthlyData().openingBalance;
		const openingBalance = typeof openingBalanceValue === 'object' && openingBalanceValue !== null 
			? Number(openingBalanceValue.balance || 0) 
			: 0;
		const totalDonations = transactions
			.filter(t => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);
		const totalExpenses = transactions
			.filter(t => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);
		const endBalance = openingBalance + totalDonations - totalExpenses;

		// Worldwide Work donations
		const worldwideDonations = transactions
			.filter(t => t.type === 'income' && isWorldwideCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		// Local Congregation donations
		const localDonations = transactions
			.filter(t => t.type === 'income' && isLocalCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		return {
			openingBalance,
			totalDonations,
			totalExpenses,
			endBalance,
			worldwideDonations,
			localDonations
		};
	});

	// Calculate pagination values
	$effect(() => {
		totalPages = Math.ceil(allTransactions().length / itemsPerPage) || 1;
		// Reset to first page when month changes or if current page exceeds total pages
		if (currentPage > totalPages) {
			currentPage = 1;
		}
	});

	// Get paginated transactions
	const paginatedTransactions = $derived(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return allTransactions().slice(startIndex, endIndex);
	});

	// Pagination helpers
	function nextPage() {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	function previousPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	// Get page numbers to display
	const pageNumbers = $derived(() => {
		const pages: number[] = [];
		const maxVisible = 5; // Maximum number of page buttons to show

		if (totalPages <= maxVisible) {
			// Show all pages if total is less than max
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Show limited pages with ellipsis
			if (currentPage <= 3) {
				// Near the beginning
				for (let i = 1; i <= 4; i++) {
					pages.push(i);
				}
				pages.push(-1); // Ellipsis marker
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				// Near the end
				pages.push(1);
				pages.push(-1); // Ellipsis marker
				for (let i = totalPages - 3; i <= totalPages; i++) {
					pages.push(i);
				}
			} else {
				// In the middle
				pages.push(1);
				pages.push(-1); // Ellipsis marker
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i);
				}
				pages.push(-1); // Ellipsis marker
				pages.push(totalPages);
			}
		}

		return pages;
	});

	// Reset page when month changes
	$effect(() => {
		selectedMonth; // Track month changes
		currentPage = 1;
	});

	// Event handlers
	async function handleTransactionSubmit(data: TransactionFormData) {
		submitting = true;
		try {
			// Ensure date is set before submitting
			const transactionData = {
				...data,
				date: data.date || new Date().toISOString().split('T')[0]
			};
			await transactionStore.addTransaction(transactionData);
			showTransactionForm = false;

			// Automatically switch to the month of the new transaction
			const transactionMonth = transactionData.date.substring(0, 7);
			if (transactionMonth !== selectedMonth) {
				selectedMonth = transactionMonth;
			}

			// Reset pagination to first page to show the new transaction
			currentPage = 1;
		} catch (err) {
			console.error('Failed to add transaction:', err);
		} finally {
			submitting = false;
		}
	}

	function handleDeleteTransaction(event: { id: string }) {
		deletingTransactionId = event.id;
		showDeleteConfirmation = true;
	}

	async function confirmDelete() {
		if (!deletingTransactionId) return;

		submitting = true;
		try {
			await transactionStore.deleteTransaction(deletingTransactionId);
			// Reset to first page if current page becomes empty
			const newTotal = allTransactions.length - 1;
			const newTotalPages = Math.ceil(newTotal / itemsPerPage) || 1;
			if (currentPage > newTotalPages) {
				currentPage = newTotalPages;
			}
			showDeleteConfirmation = false;
			deletingTransactionId = null;
		} catch (err) {
			console.error('Failed to delete transaction:', err);
			alert('Failed to delete transaction. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function cancelDelete() {
		showDeleteConfirmation = false;
		deletingTransactionId = null;
	}

	function handleEditTransaction(event: { transaction: Transaction }) {
		editingTransaction = event.transaction;
		showEditTransactionForm = true;
	}

	async function handleUpdateTransaction(data: TransactionFormData) {
		if (!editingTransaction?.id) return;

		submitting = true;
		try {
			const transactionData = {
				...data,
				date: data.date || new Date().toISOString().split('T')[0]
			};
			await transactionStore.updateTransaction(editingTransaction.id, transactionData);
			showEditTransactionForm = false;
			editingTransaction = null;

			// Automatically switch to the month of the updated transaction if date changed
			const transactionMonth = transactionData.date.substring(0, 7);
			if (transactionMonth !== selectedMonth) {
				selectedMonth = transactionMonth;
				currentPage = 1;
			}
		} catch (err) {
			console.error('Failed to update transaction:', err);
			alert('Failed to update transaction. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function handleMonthChange(month: string) {
		selectedMonth = month;
	}

	async function handleSetOpeningBalance() {
		if (newOpeningBalance < 0) {
			alert('Starting balance cannot be negative');
			return;
		}

		try {
			await openingBalanceStore.setMonthOpeningBalance(
				selectedMonth,
				newOpeningBalance,
				openingBalanceNote || undefined,
				openingBalanceDate || undefined
			);

			// Reset form
			newOpeningBalance = 0;
			openingBalanceNote = '';
			openingBalanceDate = new Date().toISOString().slice(0, 10);
			showOpeningBalanceForm = false;
		} catch (err) {
			console.error('Failed to set starting balance:', err);
			alert('Failed to set starting balance. Please try again.');
		}
	}

	function handleDismissError() {
		transactionStore.clearError();
	}

	function handleAmountKeydown(event: KeyboardEvent) {
		// Allow: backspace, delete, tab, escape, enter
		if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
			// Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
			(event.keyCode === 65 && event.ctrlKey === true) ||
			(event.keyCode === 67 && event.ctrlKey === true) ||
			(event.keyCode === 86 && event.ctrlKey === true) ||
			(event.keyCode === 88 && event.ctrlKey === true) ||
			// Allow: home, end, left, right
			(event.keyCode >= 35 && event.keyCode <= 39)) {
			// let it happen, don't do anything
			return;
		}

		// Allow decimal point
		if (event.key === '.' && !(event.target as HTMLInputElement).value.includes('.')) {
			return;
		}

		// Ensure that it is a number and stop the keypress
		if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
			event.preventDefault();
		}
	}
</script>

<svelte:head>
	<title>Congregation Accounts Dashboard</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8" style="background: var(--color-bg-secondary); min-height: 100vh;">
	<!-- Error Alert -->
	{#if $error}
		<Alert
			variant="error"
			message={$error}
			dismissible
			ondismiss={handleDismissError}
		/>
	{/if}

	<!-- Loading State -->
	{#if $loading}
		<Card>
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
				<span class="ml-3" style="color: var(--color-text-secondary);">Loading transactions...</span>
			</div>
		</Card>
	{:else}
		<!-- Header with Actions -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold" style="color: var(--color-text-primary);">Dashboard</h1>
				<p style="color: var(--color-text-secondary);">Manage congregation accounts and track financial activities</p>
			</div>
			<div>
				<Button
					variant="primary"
					onclick={() => showTransactionForm = true}
				>
					Add Transaction
				</Button>
			</div>
		</div>

		<!-- Month Picker -->
		<MonthPicker
			value={selectedMonth}
			loading={$loading}
			onchange={handleMonthChange}
			showAll={true}
		/>

		<!-- Summary Card -->
		<Card>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<!-- Start of Month Balance -->
				<div class="summary-card">
					<div class="summary-header">
						<h3 class="summary-label">Start of Month Balance</h3>
						<button
							type="button"
							onclick={() => showOpeningBalanceForm = true}
							class="summary-button"
							title="Set Start of Month Balance"
							aria-label="Set Start of Month Balance"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
							</svg>
						</button>
					</div>
					<p class="summary-value">{formatCurrency(summaryTotals().openingBalance)}</p>
				</div>

				<!-- Total Donations -->
				<div class="summary-card">
					<h3 class="summary-label">Total Donations</h3>
					<p class="summary-value summary-value-success">
						+{formatCurrency(summaryTotals().totalDonations)}
					</p>
				</div>

				<!-- Total Expenses -->
				<div class="summary-card">
					<h3 class="summary-label">Total Expenses</h3>
					<p class="summary-value summary-value-error">
						-{formatCurrency(summaryTotals().totalExpenses)}
					</p>
				</div>

				<!-- Worldwide Work Donations -->
				<div class="summary-card">
					<h3 class="summary-label">Worldwide Work Donations</h3>
					<p class="summary-value summary-value-success">
						+{formatCurrency(summaryTotals().worldwideDonations)}
					</p>
				</div>

				<!-- Local Congregation Donations -->
				<div class="summary-card">
					<h3 class="summary-label">Local Congregation Donations</h3>
					<p class="summary-value summary-value-success">
						+{formatCurrency(summaryTotals().localDonations)}
					</p>
				</div>

				<!-- End of Month Balance -->
				<div class="summary-card">
					<h3 class="summary-label">End of Month Balance</h3>
					<p class="summary-value summary-value-white">
						{formatCurrency(summaryTotals().endBalance)}
					</p>
				</div>
			</div>
		</Card>

		<!-- Financial Chart -->
		<Card title="Financial Overview" padding="sm">
			<div class="h-96 -mt-2">
				<FinancialChart
					transactions={monthlyData().transactions}
					month={selectedMonth || 'All'}
				/>
			</div>
		</Card>

		<!-- Chart Summary & Analysis -->
		<ChartSummary
			month={selectedMonth || 'All'}
		/>

		<!-- Transaction Table - Full Width -->
		<div class="w-full">
			<!-- Filter Buttons -->
			<div class="mb-4 flex gap-2">
				<button
					onclick={() => { transactionFilter = 'all'; currentPage = 1; }}
					class="px-4 py-2 rounded-lg font-medium transition-all duration-200 {transactionFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}"
					style="{transactionFilter === 'all' ? '' : 'background: var(--color-bg-secondary); color: var(--color-text-primary);'}"
				>
					All
				</button>
				<button
					onclick={() => { transactionFilter = 'income'; currentPage = 1; }}
					class="px-4 py-2 rounded-lg font-medium transition-all duration-200 {transactionFilter === 'income' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}"
					style="{transactionFilter === 'income' ? '' : 'background: var(--color-bg-secondary); color: var(--color-text-primary);'}"
				>
					Donations
				</button>
				<button
					onclick={() => { transactionFilter = 'expense'; currentPage = 1; }}
					class="px-4 py-2 rounded-lg font-medium transition-all duration-200 {transactionFilter === 'expense' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}"
					style="{transactionFilter === 'expense' ? '' : 'background: var(--color-bg-secondary); color: var(--color-text-primary);'}"
				>
					Expenses
				</button>
				</div>

			<TransactionList
				transactions={paginatedTransactions()}
				title="All Transactions"
				showActions={true}
				ondelete={handleDeleteTransaction}
				onedit={handleEditTransaction}
			/>

			<!-- Pagination Controls -->
			{#if totalPages > 1}
				<div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg" style="background: var(--color-bg-primary); border: 1px solid var(--color-border-primary);">
						<!-- Page Info -->
						<div class="text-sm" style="color: var(--color-text-secondary);">
							Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, allTransactions().length)} of {allTransactions().length} transactions
						</div>

						<!-- Page Navigation -->
						<div class="flex items-center gap-2">
							<!-- Previous Button -->
							<button
								onclick={previousPage}
								disabled={currentPage === 1}
								class="px-3 py-1 rounded-lg transition-all duration-200 {currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50'}"
								style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); color: var(--color-text-primary);"
								aria-label="Previous page"
							>
								<svg class="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
								</svg>
							</button>

							<!-- Page Numbers -->
							<div class="flex items-center gap-1">
								{#each pageNumbers() as pageNum}
									{#if pageNum === -1}
										<span class="px-2" style="color: var(--color-text-secondary);">...</span>
									{:else}
										<button
											onclick={() => goToPage(pageNum)}
											class="min-w-[32px] px-2 py-1 rounded-lg font-medium transition-all duration-200 {currentPage === pageNum ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50'}"
											style="{currentPage === pageNum ? '' : 'background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); color: var(--color-text-primary);'}"
										>
											{pageNum}
										</button>
									{/if}
								{/each}
							</div>

							<!-- Next Button -->
							<button
								onclick={nextPage}
								disabled={currentPage === totalPages}
								class="px-3 py-1 rounded-lg transition-all duration-200 {currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50'}"
								style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); color: var(--color-text-primary);"
								aria-label="Next page"
							>
								<svg class="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
								</svg>
							</button>
						</div>

						<!-- Items per page selector -->
						<div class="flex items-center gap-2">
							<label for="items-per-page" class="text-sm" style="color: var(--color-text-secondary);">
								Show:
							</label>
							<select
								id="items-per-page"
								bind:value={itemsPerPage}
								onchange={() => currentPage = 1}
								class="px-3 py-1 rounded-lg border focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
								style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>
					</div>
				{/if}
		</div>
	{/if}

	<!-- Transaction Form Modal -->
	<Modal 
		open={showTransactionForm} 
		title="Add New Transaction"
		size="md"
		onclose={() => showTransactionForm = false}
	>
		<TransactionForm
			loading={submitting}
			onsubmit={handleTransactionSubmit}
			oncancel={() => showTransactionForm = false}
		/>
	</Modal>

	<!-- Opening Balance Form Modal -->
	<Modal
		open={showOpeningBalanceForm}
		title="Set Start of Month Balance"
		size="sm"
		onclose={() => showOpeningBalanceForm = false}
	>
		<div class="space-y-4">
			<div>
				<label for="opening-balance" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
					Start of Month Balance Amount
				</label>
				<input
					id="opening-balance"
					type="text"
					bind:value={newOpeningBalance}
					placeholder="0.00"
					onkeydown={handleAmountKeydown}
					class="block w-full rounded-lg border px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
				/>
			</div>

			<div>
				<label for="opening-balance-date" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
					Date
				</label>
				<input
					id="opening-balance-date"
					type="date"
					bind:value={openingBalanceDate}
					required
					class="block w-full rounded-lg border px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
				/>
			</div>

			<div>
				<label for="opening-balance-note" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
					Note (Optional)
				</label>
				<textarea
					id="opening-balance-note"
					bind:value={openingBalanceNote}
					rows="3"
					placeholder="Add a note about this starting balance..."
					class="block w-full rounded-lg border px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
				></textarea>
			</div>

			<div class="flex justify-end space-x-3 pt-4">
				<Button
					variant="secondary"
					onclick={() => showOpeningBalanceForm = false}
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					onclick={handleSetOpeningBalance}
				>
					Set Balance
				</Button>
			</div>
		</div>
	</Modal>

	<!-- Edit Transaction Form Modal -->
	<Modal
		open={showEditTransactionForm}
		title="Edit Transaction"
		size="md"
		onclose={() => {
			showEditTransactionForm = false;
			editingTransaction = null;
		}}
	>
		{#if editingTransaction}
			<TransactionForm
				loading={submitting}
				initialData={{
					date: editingTransaction.date,
					description: editingTransaction.description,
					category: editingTransaction.category,
					amount: editingTransaction.amount,
					type: editingTransaction.type
				}}
				onsubmit={handleUpdateTransaction}
				oncancel={() => {
					showEditTransactionForm = false;
					editingTransaction = null;
				}}
			/>
		{/if}
	</Modal>

	<!-- Delete Confirmation Modal -->
	<Modal
		open={showDeleteConfirmation}
		title="Delete Transaction"
		size="sm"
		onclose={cancelDelete}
	>
		<div class="space-y-4">
			<div class="text-center py-4">
				<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
					<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold mb-2" style="color: var(--color-text-primary);">
					Confirm Delete
				</h3>
				<p class="text-sm" style="color: var(--color-text-secondary);">
					Are you sure you want to delete this transaction? This action cannot be undone.
				</p>
			</div>

			<div class="flex justify-center gap-3 pt-2">
				<Button
					variant="secondary"
					onclick={cancelDelete}
					disabled={submitting}
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					onclick={confirmDelete}
					disabled={submitting}
					class="bg-red-600 hover:bg-red-700 text-white"
				>
					{submitting ? 'Deleting...' : 'Delete Transaction'}
				</Button>
			</div>
		</div>
	</Modal>
</div>

<style>
	.summary-card {
		padding: 1rem;
		border-radius: 0.75rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.summary-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 3px;
		height: 100%;
		background: linear-gradient(180deg, #e5e7eb, #d1d5db);
		opacity: 1;
	}

	.summary-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		border-color: var(--color-border-primary);
	}

	.summary-card:hover::before {
		opacity: 1;
		width: 4px;
	}

	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}

	.summary-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.3;
	}

	.summary-button {
		padding: 0.25rem;
		border-radius: 0.375rem;
		border: none;
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.summary-button:hover {
		background: #6366f1;
		color: white;
		transform: scale(1.05);
	}

	.summary-button:active {
		transform: scale(0.95);
	}

	.summary-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.summary-value-success {
		color: var(--color-success);
	}

	.summary-value-error {
		color: var(--color-error);
	}

	.summary-value-white {
		color: white;
	}

	.filter-button {
		font-weight: 500;
		transition: all 0.2s ease;
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		position: relative;
		padding: 0.5rem 1rem;
	}

	.filter-button:hover {
		color: var(--color-text-primary);
	}

	.filter-active {
		color: var(--color-text-primary);
	}

	.filter-active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(90deg, #e5e7eb, #d1d5db);
		border-radius: 1px;
	}

	@media (max-width: 768px) {
		.summary-card {
			padding: 0.875rem;
		}

		.summary-value {
			font-size: 1.25rem;
		}

		.summary-label {
			font-size: 0.75rem;
		}
	}
</style>
