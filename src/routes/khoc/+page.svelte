<script lang="ts">
	import { onMount } from 'svelte';
	import { khocTransactions, khocLoading, khocError, khocTransactionStore } from '$lib/stores/khoc-transactions';
	import { khocOpeningBalances, khocOpeningBalanceStore } from '$lib/stores/khoc-opening-balances';
	import { Alert, Button, Modal, Card } from '$lib/components/ui';
	import KhocTransactionForm from '$lib/components/forms/KhocTransactionForm.svelte';
	import TransactionList from '$lib/components/transaction/TransactionList.svelte';
	import MonthPicker from '$lib/components/dashboard/MonthPicker.svelte';
	import MonthlyImages from '$lib/components/dashboard/MonthlyImages.svelte';
	import { TransactionService } from '$lib/services/TransactionService';
	import { formatCurrency, sortTransactions, getSortPreference, saveSortPreference, type SortField, type SortOrder } from '$lib/utils';
	import type { TransactionFormData, Transaction } from '$lib/types';

	let username = $state('');
	let password = $state('');
	let isAuthenticated = $state(false);
	let showError = $state(false);
	let errorMessage = $state('');

	const KHOC_USERNAME = 'accounts.servant@khoc.com';
	const KHOC_PASSWORD = 'khocaccounts';

	let showTransactionForm = $state(false);
	let showOpeningBalanceForm = $state(false);
	let showEditTransactionForm = $state(false);
	let showDeleteConfirmation = $state(false);
	let submitting = $state(false);
	let selectedMonth = $state(new Date().toISOString().slice(0, 7));
	let editingTransaction = $state<Transaction | null>(null);
	let deletingTransactionId = $state<string | null>(null);

	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	let transactionFilter = $state<'all' | 'income' | 'expense'>('all');
	let sortField = $state<SortField>('date');
	let sortOrder = $state<SortOrder>('desc');

	let newOpeningBalance = $state(0);
	let openingBalanceNote = $state('');
	let openingBalanceDate = $state(new Date().toISOString().slice(0, 10));

	onMount(async () => {
		isAuthenticated = sessionStorage.getItem('khoc_authenticated') === 'true';
		if (isAuthenticated) {
			const preference = getSortPreference();
			sortField = preference.field; sortOrder = preference.order;
			await Promise.all([khocTransactionStore.loadTransactions(), khocOpeningBalanceStore.loadOpeningBalances()]);
		}
	});

	const monthlyData = $derived(() => {
		if (selectedMonth === '') {
			return { transactions: [...$khocTransactions].sort((a, b) => b.date.localeCompare(a.date)), openingBalance: 0 };
		}
		return TransactionService.getMonthlyData(selectedMonth, $khocTransactions, $khocOpeningBalances);
	});

	const filteredTransactions = $derived(() => {
		const transactions = monthlyData().transactions;
		if (transactionFilter === 'all') return transactions;
		return transactions.filter(t => t.type === transactionFilter);
	});

	const sortedTransactions = $derived(() => sortTransactions(filteredTransactions(), sortField, sortOrder));
	const allTransactions = $derived(() => sortedTransactions());

	function isEsperanzaCategory(category: string): boolean { return category.toLowerCase() === 'esp'; }
	function isBolaoenCategory(category: string): boolean { return category.toLowerCase() === 'bol'; }

	const categoryTotals = $derived(() => {
		const unfilteredTransactions = monthlyData().transactions;
		const esperanzaDonations = unfilteredTransactions.filter(t => t.type === 'income' && isEsperanzaCategory(t.category)).reduce((sum, t) => sum + t.amount, 0);
		const bolaoenDonations = unfilteredTransactions.filter(t => t.type === 'income' && isBolaoenCategory(t.category)).reduce((sum, t) => sum + t.amount, 0);
		const totalExpenses = unfilteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
		return { esperanza: { donations: esperanzaDonations }, bolaoen: { donations: bolaoenDonations }, total: { donations: esperanzaDonations + bolaoenDonations, expenses: totalExpenses } };
	});

	const summaryTotals = $derived(() => {
		const openingBalanceValue = monthlyData().openingBalance;
		const openingBalance = typeof openingBalanceValue === 'object' && openingBalanceValue !== null ? Number((openingBalanceValue as { balance?: number }).balance || 0) : Number(openingBalanceValue || 0);
		const totalDonations = categoryTotals().total.donations;
		const totalExpenses = categoryTotals().total.expenses;
		return { openingBalance, totalDonations, totalExpenses, endBalance: openingBalance + totalDonations - totalExpenses, esperanzaDonations: categoryTotals().esperanza.donations, bolaoenDonations: categoryTotals().bolaoen.donations };
	});

	$effect(() => { totalPages = Math.ceil(allTransactions().length / itemsPerPage) || 1; if (currentPage > totalPages) currentPage = 1; });

	const paginatedTransactions = $derived(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return allTransactions().slice(startIndex, startIndex + itemsPerPage);
	});

	function nextPage() { if (currentPage < totalPages) currentPage++; }
	function previousPage() { if (currentPage > 1) currentPage--; }
	function goToPage(page: number) { if (page >= 1 && page <= totalPages) currentPage = page; }

	const pageNumbers = $derived(() => {
		const pages: number[] = [];
		const maxVisible = 5;
		if (totalPages <= maxVisible) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
		else {
			if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push(-1); pages.push(totalPages); }
			else if (currentPage >= totalPages - 2) { pages.push(1); pages.push(-1); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i); }
			else { pages.push(1); pages.push(-1); for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i); pages.push(-1); pages.push(totalPages); }
		}
		return pages;
	});

	$effect(() => { selectedMonth; currentPage = 1; });

	async function handleTransactionSubmit(data: TransactionFormData) {
		submitting = true;
		try {
			const transactionData = { ...data, date: data.date || new Date().toISOString().split('T')[0] };
			await khocTransactionStore.addTransaction(transactionData);
			showTransactionForm = false;
			const transactionMonth = transactionData.date.substring(0, 7);
			if (transactionMonth !== selectedMonth) selectedMonth = transactionMonth;
			currentPage = 1;
		} catch (err) { console.error('Failed to add KHOC transaction:', err); }
		finally { submitting = false; }
	}

	function handleDeleteTransaction(event: { id: string }) { deletingTransactionId = event.id; showDeleteConfirmation = true; }

	async function confirmDelete() {
		if (!deletingTransactionId) return;
		submitting = true;
		try {
			await khocTransactionStore.deleteTransaction(deletingTransactionId);
			const newTotal = allTransactions.length - 1;
			const newTotalPages = Math.ceil(newTotal / itemsPerPage) || 1;
			if (currentPage > newTotalPages) currentPage = newTotalPages;
			showDeleteConfirmation = false; deletingTransactionId = null;
		} catch (err) { console.error('Failed to delete KHOC transaction:', err); alert('Failed to delete transaction.'); }
		finally { submitting = false; }
	}

	function cancelDelete() { showDeleteConfirmation = false; deletingTransactionId = null; }

	function handleEditTransaction(event: { transaction: Transaction }) { editingTransaction = event.transaction; showEditTransactionForm = true; }

	async function handleUpdateTransaction(data: TransactionFormData) {
		if (!editingTransaction?.id) return;
		submitting = true;
		try {
			const transactionData = { ...data, date: data.date || new Date().toISOString().split('T')[0] };
			await khocTransactionStore.updateTransaction(editingTransaction.id, transactionData);
			showEditTransactionForm = false; editingTransaction = null;
			const transactionMonth = transactionData.date.substring(0, 7);
			if (transactionMonth !== selectedMonth) { selectedMonth = transactionMonth; currentPage = 1; }
		} catch (err) { console.error('Failed to update KHOC transaction:', err); alert('Failed to update transaction.'); }
		finally { submitting = false; }
	}

	function handleMonthChange(month: string) { selectedMonth = month; }

	async function handleSetOpeningBalance() {
		const balanceAmount = Number(newOpeningBalance);
		if (isNaN(balanceAmount) || balanceAmount < 0) { alert('Please enter a valid starting balance'); return; }
		try {
			await khocOpeningBalanceStore.setMonthOpeningBalance(selectedMonth, balanceAmount, openingBalanceNote || undefined, openingBalanceDate || undefined);
			newOpeningBalance = 0; openingBalanceNote = ''; openingBalanceDate = new Date().toISOString().slice(0, 10); showOpeningBalanceForm = false;
		} catch (err) { console.error('Failed to set KHOC starting balance:', err); alert('Failed to set starting balance.'); }
	}

	function handleDismissError() { khocTransactionStore.clearError(); }

	function handleAmountKeydown(event: KeyboardEvent) {
		if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 || (event.keyCode === 65 && event.ctrlKey) || (event.keyCode === 67 && event.ctrlKey) || (event.keyCode === 86 && event.ctrlKey) || (event.keyCode === 88 && event.ctrlKey) || (event.keyCode >= 35 && event.keyCode <= 39)) return;
		if (event.key === '.' && !(event.target as HTMLInputElement).value.includes('.')) return;
		if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) event.preventDefault();
	}

	function handleLogin() {
		showError = false;
		if (username === KHOC_USERNAME && password === KHOC_PASSWORD) {
			isAuthenticated = true; sessionStorage.setItem('khoc_authenticated', 'true');
			Promise.all([khocTransactionStore.loadTransactions(), khocOpeningBalanceStore.loadOpeningBalances()]);
		} else { showError = true; errorMessage = 'Invalid username or password'; password = ''; }
	}

	function handleLogout() { isAuthenticated = false; sessionStorage.removeItem('khoc_authenticated'); username = ''; password = ''; }
	function handleKeydown(event: KeyboardEvent) { if (event.key === 'Enter') handleLogin(); }

	function handleSortChange(event: { field: SortField; order: SortOrder }) {
		sortField = event.field; sortOrder = event.order;
		saveSortPreference({ field: event.field, order: event.order }); currentPage = 1;
	}
</script>

<svelte:head>
	<title>KHOC - Congregation Accounts</title>
</svelte:head>

{#if !isAuthenticated}
	<div class="khoc-login">
		<div class="login-card">
			<div class="login-brand">
				<div class="login-icon">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
					</svg>
				</div>
			</div>
			<div class="text-center mb-6">
				<h2 class="text-lg font-bold mb-1" style="color: var(--color-text-primary);">KHOC Access</h2>
				<p class="text-xs" style="color: var(--color-text-secondary);">Enter your credentials to continue</p>
			</div>

			{#if showError}
				<Alert variant="error" message={errorMessage} />
				<div class="mb-4"></div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
				<div>
					<label for="username" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Username</label>
					<input id="username" type="email" bind:value={username} onkeydown={handleKeydown} placeholder="accounts.servant@khoc.com" required
						class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2"
						style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);" />
				</div>
				<div>
					<label for="password" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Password</label>
					<input id="password" type="password" bind:value={password} onkeydown={handleKeydown} placeholder="Enter password" required
						class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2"
						style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);" />
				</div>
				<button type="submit" class="w-full py-2.5 rounded-md text-sm font-semibold text-white transition-colors" style="background: var(--color-accent);">
					Access KHOC
				</button>
			</form>
		</div>
	</div>
{:else}
	<div class="dashboard">
		{#if $khocError}
			<Alert variant="error" message={$khocError} dismissible ondismiss={handleDismissError} />
		{/if}

		{#if $khocLoading}
			<Card>
				<div class="flex items-center justify-center py-16">
					<div class="animate-spin rounded-full h-6 w-6 border-2 border-transparent" style="border-top-color: var(--color-accent);"></div>
					<span class="ml-3 text-sm" style="color: var(--color-text-secondary);">Loading KHOC transactions...</span>
				</div>
			</Card>
		{:else}
			<div class="page-header">
				<div>
					<h1 class="page-title">KHOC Financial Overview</h1>
					<p class="page-subtitle">Kingdom Hall Operating Committee</p>
				</div>
				<div class="header-actions">
					<Button variant="primary" onclick={() => showTransactionForm = true}>
						<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
						Add Transaction
					</Button>
					<Button variant="danger" onclick={handleLogout}>
						<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
						Logout
					</Button>
				</div>
			</div>

			<MonthPicker value={selectedMonth} loading={$khocLoading} onchange={handleMonthChange} showAll={true} />

			<!-- KPI Cards -->
			<div class="kpi-grid">
				<div class="kpi-card">
					<div class="kpi-header">
						<div class="kpi-icon kpi-icon-neutral"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg></div>
						<button type="button" onclick={() => showOpeningBalanceForm = true} class="kpi-action" title="Set Balance"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></button>
					</div>
					<p class="kpi-label">Opening Balance</p>
					<p class="kpi-value tabular-nums">{formatCurrency(summaryTotals().openingBalance)}</p>
				</div>
				<div class="kpi-card">
					<div class="kpi-header"><div class="kpi-icon kpi-icon-income"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg></div></div>
					<p class="kpi-label">Total Donations</p>
					<p class="kpi-value tabular-nums" style="color: var(--color-income);">+{formatCurrency(summaryTotals().totalDonations)}</p>
				</div>
				<div class="kpi-card">
					<div class="kpi-header"><div class="kpi-icon kpi-icon-expense"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"/></svg></div></div>
					<p class="kpi-label">Total Expenses</p>
					<p class="kpi-value tabular-nums" style="color: var(--color-expense);">-{formatCurrency(summaryTotals().totalExpenses)}</p>
				</div>
				<div class="kpi-card">
					<div class="kpi-header"><div class="kpi-icon kpi-icon-info"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"/></svg></div></div>
					<p class="kpi-label">Esperanza</p>
					<p class="kpi-value tabular-nums" style="color: var(--color-income);">+{formatCurrency(summaryTotals().esperanzaDonations)}</p>
				</div>
				<div class="kpi-card">
					<div class="kpi-header"><div class="kpi-icon kpi-icon-income"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"/></svg></div></div>
					<p class="kpi-label">Bolaoen</p>
					<p class="kpi-value tabular-nums" style="color: var(--color-income);">+{formatCurrency(summaryTotals().bolaoenDonations)}</p>
				</div>
				<div class="kpi-card kpi-card-highlight">
					<div class="kpi-header"><div class="kpi-icon kpi-icon-highlight"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg></div></div>
					<p class="kpi-label" style="color: rgba(255,255,255,0.8);">Closing Balance</p>
					<p class="kpi-value tabular-nums" style="color: #ffffff;">{formatCurrency(summaryTotals().endBalance)}</p>
				</div>
			</div>

			<MonthlyImages selectedMonth={selectedMonth} source="khoc" />

			<div class="w-full">
				<div class="filter-bar">
					<button onclick={() => { transactionFilter = 'all'; currentPage = 1; }} class="filter-tab {transactionFilter === 'all' ? 'filter-active' : ''}">All</button>
					<button onclick={() => { transactionFilter = 'income'; currentPage = 1; }} class="filter-tab {transactionFilter === 'income' ? 'filter-active' : ''}">Donations</button>
					<button onclick={() => { transactionFilter = 'expense'; currentPage = 1; }} class="filter-tab {transactionFilter === 'expense' ? 'filter-active' : ''}">Expenses</button>
				</div>

				<TransactionList transactions={paginatedTransactions()} allTransactionsForTotals={monthlyData().transactions} title="All Transactions" showActions={true} ondelete={handleDeleteTransaction} onedit={handleEditTransaction} sortField={sortField} sortOrder={sortOrder} onsortchange={handleSortChange} />

				{#if totalPages > 1}
					<div class="pagination">
						<div class="pagination-info">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, allTransactions().length)} of {allTransactions().length}</div>
						<div class="pagination-controls">
							<button onclick={previousPage} disabled={currentPage === 1} class="pagination-btn"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
							{#each pageNumbers() as pageNum}
								{#if pageNum === -1}<span class="pagination-ellipsis">...</span>
								{:else}<button onclick={() => goToPage(pageNum)} class="pagination-btn {currentPage === pageNum ? 'pagination-active' : ''}">{pageNum}</button>{/if}
							{/each}
							<button onclick={nextPage} disabled={currentPage === totalPages} class="pagination-btn"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
						</div>
						<div class="pagination-size">
							<label for="khoc-items-per-page" class="text-xs" style="color: var(--color-text-secondary);">Show:</label>
							<select id="khoc-items-per-page" bind:value={itemsPerPage} onchange={() => currentPage = 1} class="pagination-select">
								<option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
							</select>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<Modal open={showTransactionForm} title="Add New Transaction" size="md" onclose={() => showTransactionForm = false}>
			<KhocTransactionForm loading={submitting} onsubmit={handleTransactionSubmit} oncancel={() => showTransactionForm = false} />
		</Modal>

		<Modal open={showOpeningBalanceForm} title="Set Opening Balance" size="sm" onclose={() => showOpeningBalanceForm = false}>
			<div class="space-y-4">
				<div>
					<label for="opening-balance" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Amount</label>
					<input id="opening-balance" type="text" bind:value={newOpeningBalance} placeholder="0.00" onkeydown={handleAmountKeydown} class="block w-full rounded-md border px-3 py-2 text-sm" style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);" />
				</div>
				<div>
					<label for="opening-balance-date" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Date</label>
					<input id="opening-balance-date" type="date" bind:value={openingBalanceDate} required class="block w-full rounded-md border px-3 py-2 text-sm" style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);" />
				</div>
				<div>
					<label for="opening-balance-note" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Note (Optional)</label>
					<textarea id="opening-balance-note" bind:value={openingBalanceNote} rows="2" placeholder="Add a note..." class="block w-full rounded-md border px-3 py-2 text-sm" style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"></textarea>
				</div>
				<div class="flex justify-end gap-2 pt-2">
					<Button variant="secondary" onclick={() => showOpeningBalanceForm = false}>Cancel</Button>
					<Button variant="primary" onclick={handleSetOpeningBalance}>Set Balance</Button>
				</div>
			</div>
		</Modal>

		<Modal open={showEditTransactionForm} title="Edit Transaction" size="md" onclose={() => { showEditTransactionForm = false; editingTransaction = null; }}>
			{#if editingTransaction}
				<KhocTransactionForm loading={submitting} initialData={{ date: editingTransaction.date, description: editingTransaction.description, category: editingTransaction.category, amount: editingTransaction.amount, type: editingTransaction.type }} onsubmit={handleUpdateTransaction} oncancel={() => { showEditTransactionForm = false; editingTransaction = null; }} />
			{/if}
		</Modal>

		<Modal open={showDeleteConfirmation} title="Delete Transaction" size="sm" onclose={cancelDelete}>
			<div class="text-center py-4 space-y-4">
				<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full" style="background: var(--color-error-bg);">
					<svg class="h-5 w-5" style="color: var(--color-error);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
				</div>
				<div>
					<h3 class="text-sm font-semibold mb-1" style="color: var(--color-text-primary);">Are you sure?</h3>
					<p class="text-xs" style="color: var(--color-text-secondary);">This action cannot be undone.</p>
				</div>
				<div class="flex justify-center gap-2 pt-2">
					<Button variant="secondary" onclick={cancelDelete} disabled={submitting}>Cancel</Button>
					<Button variant="danger" onclick={confirmDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</Button>
				</div>
			</div>
		</Modal>
	</div>
{/if}

<style>
	/* KHOC Login */
	.khoc-login {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100svh - 56px);
		padding: 1rem;
	}

	.login-card {
		width: 100%;
		max-width: 380px;
		padding: 2rem;
		border-radius: 0.5rem;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		box-shadow: var(--shadow-lg);
	}

	.login-brand {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.login-icon {
		width: 48px;
		height: 48px;
		background: var(--color-accent);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Dashboard */
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.page-header { flex-direction: row; align-items: center; justify-content: space-between; }
	}

	.page-title { font-size: 1.375rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
	.page-subtitle { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0.25rem 0 0 0; }
	.header-actions { display: flex; gap: 0.5rem; align-items: center; }

	/* KPI Grid */
	.kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
	@media (min-width: 768px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
	@media (min-width: 1024px) { .kpi-grid { grid-template-columns: repeat(6, 1fr); } }

	.kpi-card { background: var(--color-surface-elevated); border: 1px solid var(--color-border-primary); border-radius: 0.5rem; padding: 1rem; }
	.kpi-card-highlight { background: var(--color-accent); border-color: var(--color-accent); }
	.kpi-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
	.kpi-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
	.kpi-icon-neutral { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
	.kpi-icon-income { background: var(--color-income-light); color: var(--color-income); }
	.kpi-icon-expense { background: var(--color-expense-light); color: var(--color-expense); }
	.kpi-icon-info { background: var(--color-info-bg); color: var(--color-info); }
	.kpi-icon-highlight { background: rgba(255,255,255,0.2); color: #ffffff; }
	.kpi-action { padding: 0.25rem; border-radius: 4px; border: none; background: transparent; color: var(--color-text-tertiary); cursor: pointer; transition: all 0.15s; }
	.kpi-action:hover { background: var(--color-accent-light); color: var(--color-accent); }
	.kpi-label { font-size: 0.6875rem; font-weight: 500; color: var(--color-text-secondary); margin: 0 0 0.25rem 0; text-transform: uppercase; letter-spacing: 0.03em; }
	.kpi-value { font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary); margin: 0; line-height: 1.2; }

	/* Filter Bar */
	.filter-bar { display: flex; gap: 0.25rem; margin-bottom: 0.75rem; padding: 0.25rem; background: var(--color-bg-tertiary); border-radius: 0.5rem; width: fit-content; }
	.filter-tab { padding: 0.375rem 0.875rem; border-radius: 0.375rem; font-size: 0.8125rem; font-weight: 500; color: var(--color-text-secondary); background: transparent; border: none; cursor: pointer; transition: all 0.15s; }
	.filter-tab:hover { color: var(--color-text-primary); }
	.filter-active { background: var(--color-bg-primary); color: var(--color-text-primary); box-shadow: var(--shadow-sm); }

	/* Pagination */
	.pagination { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.5rem; background: var(--color-bg-primary); border: 1px solid var(--color-border-primary); align-items: center; }
	@media (min-width: 640px) { .pagination { flex-direction: row; justify-content: space-between; } }
	.pagination-info { font-size: 0.75rem; color: var(--color-text-secondary); }
	.pagination-controls { display: flex; align-items: center; gap: 0.25rem; }
	.pagination-btn { min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-size: 0.75rem; font-weight: 500; border: 1px solid var(--color-border-primary); background: var(--color-bg-primary); color: var(--color-text-primary); cursor: pointer; transition: all 0.15s; }
	.pagination-btn:hover:not(:disabled) { background: var(--color-surface-hover); }
	.pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.pagination-active { background: var(--color-accent) !important; color: #ffffff !important; border-color: var(--color-accent) !important; }
	.pagination-ellipsis { padding: 0 0.25rem; color: var(--color-text-tertiary); font-size: 0.75rem; }
	.pagination-size { display: flex; align-items: center; gap: 0.375rem; }
	.pagination-select { padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--color-border-primary); background: var(--color-bg-primary); color: var(--color-text-primary); font-size: 0.75rem; }

	@media (max-width: 640px) {
		.kpi-grid { grid-template-columns: repeat(2, 1fr); }
		.kpi-value { font-size: 0.9375rem; }
		.dashboard { padding: 1rem; gap: 1rem; }
	}
</style>
