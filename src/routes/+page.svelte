<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions, loading, error, transactionStore } from '$lib/stores/transactions';
	import { openingBalances, openingBalanceStore } from '$lib/stores/opening-balances';
	import { Alert, Button, Modal, Card, Select } from '$lib/components/ui';
	import TransactionForm from '$lib/components/forms/TransactionForm.svelte';
	import CombinedDonationForm from '$lib/components/forms/CombinedDonationForm.svelte';
	import TransactionList from '$lib/components/transaction/TransactionList.svelte';
	import MonthPicker from '$lib/components/dashboard/MonthPicker.svelte';
	import FinancialChart from '$lib/components/dashboard/FinancialChart.svelte';
	import ChartSummary from '$lib/components/dashboard/ChartSummary.svelte';
	import DonationForecast from '$lib/components/dashboard/DonationForecast.svelte';
	import MonthlyImages from '$lib/components/dashboard/MonthlyImages.svelte';
	import { TransactionService } from '$lib/services/TransactionService';
	import { PdfReportService, type MonthlyReportData } from '$lib/services/PdfReportService';
	import { formatCurrency, formatMonthYear, sortTransactions, getSortPreference, saveSortPreference, type SortField, type SortOrder } from '$lib/utils';
	import type { TransactionFormData, Transaction, OpeningBalance } from '$lib/types';

	// UI state
	let showTransactionForm = $state(false);
	let addTransactionTab = $state<'donations' | 'expenses'>('donations');
	let showOpeningBalanceForm = $state(false);
	let showEditTransactionForm = $state(false);
	let showDeleteConfirmation = $state(false);
	let submitting = $state(false);
	let selectedMonth = $state(new Date().toISOString().slice(0, 7));
	let editingTransaction = $state<Transaction | null>(null);
	let deletingTransactionId = $state<string | null>(null);
	let showReportMenu = $state(false);
	let isGeneratingReport = $state(false);
	let selectedTemplate = $state<'S-26_E' | 'S-30_E'>('S-30_E');

	const templateOptions = [
		{ value: 'S-26_E', label: 'S-26_E' },
		{ value: 'S-30_E', label: 'S-30_E' }
	];

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);

	// Filter state
	let transactionFilter = $state<'all' | 'income' | 'expense'>('all');

	// Sort state
	let sortField = $state<SortField>('date');
	let sortOrder = $state<SortOrder>('desc');

	// Opening balance form state
	let newOpeningBalance = $state(0);
	let openingBalanceNote = $state('');
	let openingBalanceDate = $state(new Date().toISOString().slice(0, 10));

	onMount(async () => {
		const preference = getSortPreference();
		sortField = preference.field;
		sortOrder = preference.order;

		await Promise.all([
			transactionStore.loadTransactions(),
			openingBalanceStore.loadOpeningBalances()
		]);
	});

	const monthlyData = $derived(() => {
		if (selectedMonth === '') {
			return {
				transactions: [...$transactions].sort((a, b) => b.date.localeCompare(a.date)),
				openingBalance: 0
			};
		}
		return TransactionService.getMonthlyData(selectedMonth, $transactions, $openingBalances);
	});

	const filteredTransactions = $derived(() => {
		const transactions = monthlyData().transactions;
		if (transactionFilter === 'all') return transactions;
		return transactions.filter(t => t.type === transactionFilter);
	});

	const sortedTransactions = $derived(() => {
		return sortTransactions(filteredTransactions(), sortField, sortOrder);
	});

	const allTransactions = $derived(() => sortedTransactions());

	function isLocalCategory(category: string): boolean {
		return category.toLowerCase().includes('local congregation');
	}

	function isWorldwideCategory(category: string): boolean {
		return category.toLowerCase().includes('worldwide work');
	}

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

		const worldwideDonations = transactions
			.filter(t => t.type === 'income' && isWorldwideCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		const localDonations = transactions
			.filter(t => t.type === 'income' && isLocalCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		return { openingBalance, totalDonations, totalExpenses, endBalance, worldwideDonations, localDonations };
	});

	$effect(() => {
		totalPages = Math.ceil(allTransactions().length / itemsPerPage) || 1;
		if (currentPage > totalPages) currentPage = 1;
	});

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
		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 4; i++) pages.push(i);
				pages.push(-1); pages.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				pages.push(1); pages.push(-1);
				for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
			} else {
				pages.push(1); pages.push(-1);
				for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
				pages.push(-1); pages.push(totalPages);
			}
		}
		return pages;
	});

	$effect(() => { selectedMonth; currentPage = 1; });

	async function handleTransactionSubmit(data: TransactionFormData) {
		submitting = true;
		try {
			const transactionData = { ...data, date: data.date || new Date().toISOString().split('T')[0] };
			await transactionStore.addTransaction(transactionData);
			showTransactionForm = false;
			const transactionMonth = transactionData.date.substring(0, 7);
			if (transactionMonth !== selectedMonth) selectedMonth = transactionMonth;
			currentPage = 1;
		} catch (err) { console.error('Failed to add transaction:', err); }
		finally { submitting = false; }
	}

	async function handleCombinedDonationSubmit(items: TransactionFormData[]) {
		submitting = true;
		try {
			for (const item of items) {
				const transactionData = { ...item, date: item.date || new Date().toISOString().split('T')[0] };
				await transactionStore.addTransaction(transactionData);
				const transactionMonth = transactionData.date.substring(0, 7);
				if (transactionMonth !== selectedMonth) selectedMonth = transactionMonth;
			}
			showTransactionForm = false;
			currentPage = 1;
		} catch (err) { console.error('Failed to add donations:', err); }
		finally { submitting = false; }
	}

	async function handleCombinedExpenseSubmit(items: TransactionFormData[]) {
		submitting = true;
		try {
			for (const item of items) {
				const transactionData = { ...item, date: item.date || new Date().toISOString().split('T')[0] };
				await transactionStore.addTransaction(transactionData);
				const transactionMonth = transactionData.date.substring(0, 7);
				if (transactionMonth !== selectedMonth) selectedMonth = transactionMonth;
			}
			showTransactionForm = false;
			currentPage = 1;
		} catch (err) { console.error('Failed to add expenses:', err); }
		finally { submitting = false; }
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
			const newTotal = allTransactions.length - 1;
			const newTotalPages = Math.ceil(newTotal / itemsPerPage) || 1;
			if (currentPage > newTotalPages) currentPage = newTotalPages;
			showDeleteConfirmation = false;
			deletingTransactionId = null;
		} catch (err) {
			console.error('Failed to delete transaction:', err);
			alert('Failed to delete transaction. Please try again.');
		} finally { submitting = false; }
	}

	function cancelDelete() { showDeleteConfirmation = false; deletingTransactionId = null; }

	function handleEditTransaction(event: { transaction: Transaction }) {
		editingTransaction = event.transaction;
		showEditTransactionForm = true;
	}

	async function handleUpdateTransaction(data: TransactionFormData) {
		if (!editingTransaction?.id) return;
		submitting = true;
		try {
			const transactionData = { ...data, date: data.date || new Date().toISOString().split('T')[0] };
			await transactionStore.updateTransaction(editingTransaction.id, transactionData);
			showEditTransactionForm = false;
			editingTransaction = null;
			const transactionMonth = transactionData.date.substring(0, 7);
			if (transactionMonth !== selectedMonth) { selectedMonth = transactionMonth; currentPage = 1; }
		} catch (err) {
			console.error('Failed to update transaction:', err);
			alert('Failed to update transaction. Please try again.');
		} finally { submitting = false; }
	}

	function handleMonthChange(month: string) { selectedMonth = month; }

	async function handleSetOpeningBalance() {
		if (newOpeningBalance < 0) { alert('Starting balance cannot be negative'); return; }
		try {
			await openingBalanceStore.setMonthOpeningBalance(selectedMonth, newOpeningBalance, openingBalanceNote || undefined, openingBalanceDate || undefined);
			newOpeningBalance = 0; openingBalanceNote = ''; openingBalanceDate = new Date().toISOString().slice(0, 10);
			showOpeningBalanceForm = false;
		} catch (err) { console.error('Failed to set starting balance:', err); alert('Failed to set starting balance.'); }
	}

	function handleDismissError() { transactionStore.clearError(); }

	function handleSortChange(event: { field: SortField; order: SortOrder }) {
		sortField = event.field; sortOrder = event.order;
		saveSortPreference({ field: event.field, order: event.order });
		currentPage = 1;
	}

	function prepareReportData(): MonthlyReportData {
		const ob = monthlyData().openingBalance;
		let openingBalance: OpeningBalance | null = null;
		if (typeof ob === 'number') {
			openingBalance = ob !== 0 ? { month: selectedMonth, balance: ob } : null;
		} else { openingBalance = ob as OpeningBalance | null; }
		return {
			month: selectedMonth, transactions: monthlyData().transactions, openingBalance,
			congregationName: 'Bolaoen Congregation',
			reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
		};
	}

	async function generateReport() {
		if (isGeneratingReport || !selectedMonth) return;
		isGeneratingReport = true; showReportMenu = false;
		try {
			const reportData = prepareReportData();
			const monthYear = formatMonthYear(selectedMonth).toUpperCase().replace(' ', '_');
			await PdfReportService.downloadReport(reportData, `${selectedTemplate}_${monthYear}.pdf`, selectedTemplate);
		} catch (error) { console.error('Error generating PDF:', error); alert('Failed to generate PDF report.'); }
		finally { isGeneratingReport = false; }
	}

	function handleAmountKeydown(event: KeyboardEvent) {
		if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
			(event.keyCode === 65 && event.ctrlKey === true) ||
			(event.keyCode === 67 && event.ctrlKey === true) ||
			(event.keyCode === 86 && event.ctrlKey === true) ||
			(event.keyCode === 88 && event.ctrlKey === true) ||
			(event.keyCode >= 35 && event.keyCode <= 39)) return;
		if (event.key === '.' && !(event.target as HTMLInputElement).value.includes('.')) return;
		if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) event.preventDefault();
	}
</script>

<svelte:head>
	<title>Dashboard - Congregation Accounts</title>
</svelte:head>

<div class="dashboard">
	{#if $error}
		<Alert variant="error" message={$error} dismissible ondismiss={handleDismissError} />
	{/if}

	{#if $loading}
		<Card>
			<div class="flex items-center justify-center py-16">
				<div class="animate-spin rounded-full h-6 w-6 border-2 border-transparent" style="border-top-color: var(--color-accent);"></div>
				<span class="ml-3 text-sm" style="color: var(--color-text-secondary);">Loading transactions...</span>
			</div>
		</Card>
	{:else}
		<!-- Page Header -->
		<div class="page-header">
			<div>
				<h1 class="page-title">Financial Overview</h1>
				<p class="page-subtitle">Manage congregation accounts and track financial activities</p>
			</div>
			<div class="header-actions">
				<Button variant="primary" onclick={() => showTransactionForm = true}>
					<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					Add Transaction
				</Button>
				{#if selectedMonth && selectedMonth !== ''}
					<div class="relative">
						<Button variant="secondary" onclick={() => showReportMenu = !showReportMenu} disabled={isGeneratingReport}>
							<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
							</svg>
							{isGeneratingReport ? 'Generating...' : 'Export Report'}
						</Button>
						{#if showReportMenu}
							<div class="report-dropdown">
								<div class="space-y-3">
									<Select label="Report Template" value={selectedTemplate} options={templateOptions} placeholder="Select a template..." disabled={isGeneratingReport}
										onchange={(value) => { selectedTemplate = value as 'S-26_E' | 'S-30_E'; }} />
									<Button variant="primary" onclick={generateReport} disabled={isGeneratingReport} class="w-full">
										{isGeneratingReport ? 'Generating...' : 'Download PDF'}
									</Button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Month Picker -->
		<MonthPicker value={selectedMonth} loading={$loading} onchange={handleMonthChange} showAll={true} />

		<!-- KPI Cards -->
		<div class="kpi-grid">
			<!-- Opening Balance -->
			<div class="kpi-card">
				<div class="kpi-header">
					<div class="kpi-icon kpi-icon-neutral">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
						</svg>
					</div>
					<button type="button" onclick={() => showOpeningBalanceForm = true} class="kpi-action" title="Set Balance" aria-label="Set Balance">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
						</svg>
					</button>
				</div>
				<p class="kpi-label">Opening Balance</p>
				<p class="kpi-value tabular-nums">{formatCurrency(summaryTotals().openingBalance)}</p>
			</div>

			<!-- Total Donations -->
			<div class="kpi-card">
				<div class="kpi-header">
					<div class="kpi-icon kpi-icon-income">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
						</svg>
					</div>
				</div>
				<p class="kpi-label">Total Donations</p>
				<p class="kpi-value tabular-nums" style="color: var(--color-income);">+{formatCurrency(summaryTotals().totalDonations)}</p>
			</div>

			<!-- Total Expenses -->
			<div class="kpi-card">
				<div class="kpi-header">
					<div class="kpi-icon kpi-icon-expense">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"/>
						</svg>
					</div>
				</div>
				<p class="kpi-label">Total Expenses</p>
				<p class="kpi-value tabular-nums" style="color: var(--color-expense);">-{formatCurrency(summaryTotals().totalExpenses)}</p>
			</div>

			<!-- Worldwide Donations -->
			<div class="kpi-card">
				<div class="kpi-header">
					<div class="kpi-icon kpi-icon-info">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/>
						</svg>
					</div>
				</div>
				<p class="kpi-label">Worldwide Work</p>
				<p class="kpi-value tabular-nums" style="color: var(--color-income);">+{formatCurrency(summaryTotals().worldwideDonations)}</p>
			</div>

			<!-- Local Donations -->
			<div class="kpi-card">
				<div class="kpi-header">
					<div class="kpi-icon kpi-icon-income">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"/>
						</svg>
					</div>
				</div>
				<p class="kpi-label">Congregation</p>
				<p class="kpi-value tabular-nums" style="color: var(--color-income);">+{formatCurrency(summaryTotals().localDonations)}</p>
			</div>

			<!-- End Balance -->
			<div class="kpi-card kpi-card-highlight">
				<div class="kpi-header">
					<div class="kpi-icon kpi-icon-highlight">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
						</svg>
					</div>
				</div>
				<p class="kpi-label" style="color: rgba(255,255,255,0.8);">Closing Balance</p>
				<p class="kpi-value tabular-nums" style="color: #ffffff;">{formatCurrency(summaryTotals().endBalance)}</p>
			</div>
		</div>

		<!-- Chart -->
		<Card title="Financial Overview" padding="sm">
			<div class="h-80">
				<FinancialChart transactions={monthlyData().transactions} month={selectedMonth || 'All'} />
			</div>
		</Card>

		<!-- Chart Summary -->
		<ChartSummary />

		<!-- Donation Forecast -->
		<DonationForecast transactions={$transactions} />

		<!-- Monthly Images -->
		<MonthlyImages selectedMonth={selectedMonth} />

		<!-- Transaction Table -->
		<div class="w-full">
			<!-- Filter Tabs -->
			<div class="filter-bar">
				<button onclick={() => { transactionFilter = 'all'; currentPage = 1; }} class="filter-tab {transactionFilter === 'all' ? 'filter-active' : ''}">
					All
				</button>
				<button onclick={() => { transactionFilter = 'income'; currentPage = 1; }} class="filter-tab {transactionFilter === 'income' ? 'filter-active' : ''}">
					Donations
				</button>
				<button onclick={() => { transactionFilter = 'expense'; currentPage = 1; }} class="filter-tab {transactionFilter === 'expense' ? 'filter-active' : ''}">
					Expenses
				</button>
			</div>

			<TransactionList
				transactions={paginatedTransactions()}
				allTransactionsForTotals={monthlyData().transactions}
				title="All Transactions"
				showActions={true}
				ondelete={handleDeleteTransaction}
				onedit={handleEditTransaction}
				sortField={sortField}
				sortOrder={sortOrder}
				onsortchange={handleSortChange}
			/>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="pagination">
					<div class="pagination-info">
						Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, allTransactions().length)} of {allTransactions().length}
					</div>
					<div class="pagination-controls">
						<button onclick={previousPage} disabled={currentPage === 1} class="pagination-btn" aria-label="Previous page">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
							</svg>
						</button>
						{#each pageNumbers() as pageNum}
							{#if pageNum === -1}
								<span class="pagination-ellipsis">...</span>
							{:else}
								<button onclick={() => goToPage(pageNum)} class="pagination-btn {currentPage === pageNum ? 'pagination-active' : ''}">
									{pageNum}
								</button>
							{/if}
						{/each}
						<button onclick={nextPage} disabled={currentPage === totalPages} class="pagination-btn" aria-label="Next page">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
							</svg>
						</button>
					</div>
					<div class="pagination-size">
						<label for="items-per-page" class="text-xs" style="color: var(--color-text-secondary);">Show:</label>
						<select id="items-per-page" bind:value={itemsPerPage} onchange={() => currentPage = 1} class="pagination-select">
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

	<!-- Add Transaction Modal -->
	<Modal open={showTransactionForm} title="Add New Transaction" size="md" onclose={() => { showTransactionForm = false; addTransactionTab = 'donations'; }}>
		<div class="flex border-b mb-4" style="border-color: var(--color-border-primary);">
			<button type="button" onclick={() => addTransactionTab = 'donations'}
				class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
				style="{addTransactionTab === 'donations' ? 'border-color: var(--color-accent); color: var(--color-accent);' : 'border-color: transparent; color: var(--color-text-secondary);'}">
				Donations
			</button>
			<button type="button" onclick={() => addTransactionTab = 'expenses'}
				class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
				style="{addTransactionTab === 'expenses' ? 'border-color: var(--color-accent); color: var(--color-accent);' : 'border-color: transparent; color: var(--color-text-secondary);'}">
				Expenses
			</button>
		</div>
		{#if addTransactionTab === 'donations'}
			<CombinedDonationForm loading={submitting} onsubmit={handleCombinedDonationSubmit} oncancel={() => { showTransactionForm = false; addTransactionTab = 'donations'; }} />
		{:else}
			<TransactionForm loading={submitting} initialData={{ type: 'expense' }} onsubmit={handleTransactionSubmit} oncancel={() => { showTransactionForm = false; addTransactionTab = 'donations'; }} />
		{/if}
	</Modal>

	<!-- Opening Balance Modal -->
	<Modal open={showOpeningBalanceForm} title="Set Opening Balance" size="sm" onclose={() => showOpeningBalanceForm = false}>
		<div class="space-y-4">
			<div>
				<label for="opening-balance" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Amount</label>
				<input id="opening-balance" type="text" bind:value={newOpeningBalance} placeholder="0.00" onkeydown={handleAmountKeydown}
					class="block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary); --tw-ring-color: var(--color-accent-alpha);" />
			</div>
			<div>
				<label for="opening-balance-date" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Date</label>
				<input id="opening-balance-date" type="date" bind:value={openingBalanceDate} required
					class="block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);" />
			</div>
			<div>
				<label for="opening-balance-note" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">Note (Optional)</label>
				<textarea id="opening-balance-note" bind:value={openingBalanceNote} rows="2" placeholder="Add a note..."
					class="block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
					style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"></textarea>
			</div>
			<div class="flex justify-end gap-2 pt-2">
				<Button variant="secondary" onclick={() => showOpeningBalanceForm = false}>Cancel</Button>
				<Button variant="primary" onclick={handleSetOpeningBalance}>Set Balance</Button>
			</div>
		</div>
	</Modal>

	<!-- Edit Transaction Modal -->
	<Modal open={showEditTransactionForm} title="Edit Transaction" size="md" onclose={() => { showEditTransactionForm = false; editingTransaction = null; }}>
		{#if editingTransaction}
			<TransactionForm loading={submitting}
				initialData={{ date: editingTransaction.date, description: editingTransaction.description, category: editingTransaction.category, amount: editingTransaction.amount, type: editingTransaction.type }}
				onsubmit={handleUpdateTransaction}
				oncancel={() => { showEditTransactionForm = false; editingTransaction = null; }} />
		{/if}
	</Modal>

	<!-- Delete Confirmation Modal -->
	<Modal open={showDeleteConfirmation} title="Delete Transaction" size="sm" onclose={cancelDelete}>
		<div class="text-center py-4 space-y-4">
			<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full" style="background: var(--color-error-bg);">
				<svg class="h-5 w-5" style="color: var(--color-error);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<div>
				<h3 class="text-sm font-semibold mb-1" style="color: var(--color-text-primary);">Are you sure?</h3>
				<p class="text-xs" style="color: var(--color-text-secondary);">This action cannot be undone.</p>
			</div>
			<div class="flex justify-center gap-2 pt-2">
				<Button variant="secondary" onclick={cancelDelete} disabled={submitting}>Cancel</Button>
				<Button variant="danger" onclick={confirmDelete} disabled={submitting}>
					{submitting ? 'Deleting...' : 'Delete'}
				</Button>
			</div>
		</div>
	</Modal>
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Page Header */
	.page-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.page-header {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.page-title {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.page-subtitle {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0.25rem 0 0 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.report-dropdown {
		position: absolute;
		right: 0;
		margin-top: 0.5rem;
		width: 16rem;
		padding: 1rem;
		border-radius: 0.5rem;
		z-index: 10;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		box-shadow: var(--shadow-lg);
	}

	/* KPI Grid */
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	@media (min-width: 768px) {
		.kpi-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.kpi-grid {
			grid-template-columns: repeat(6, 1fr);
		}
	}

	.kpi-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		padding: 1rem;
		position: relative;
	}

	.kpi-card-highlight {
		background: var(--color-accent);
		border-color: var(--color-accent);
	}

	.kpi-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.kpi-icon {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.kpi-icon-neutral {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}

	.kpi-icon-income {
		background: var(--color-income-light);
		color: var(--color-income);
	}

	.kpi-icon-expense {
		background: var(--color-expense-light);
		color: var(--color-expense);
	}

	.kpi-icon-info {
		background: var(--color-info-bg);
		color: var(--color-info);
	}

	.kpi-icon-highlight {
		background: rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}

	.kpi-action {
		padding: 0.25rem;
		border-radius: 4px;
		border: none;
		background: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.kpi-action:hover {
		background: var(--color-accent-light);
		color: var(--color-accent);
	}

	.kpi-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin: 0 0 0.25rem 0;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.kpi-value {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.2;
	}

	/* Filter Bar */
	.filter-bar {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		padding: 0.25rem;
		background: var(--color-bg-tertiary);
		border-radius: 0.5rem;
		width: fit-content;
	}

	.filter-tab {
		padding: 0.375rem 0.875rem;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.15s;
	}

	.filter-tab:hover {
		color: var(--color-text-primary);
	}

	.filter-active {
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-sm);
	}

	/* Pagination */
	.pagination {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		align-items: center;
	}

	@media (min-width: 640px) {
		.pagination {
			flex-direction: row;
			justify-content: space-between;
		}
	}

	.pagination-info {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.pagination-btn {
		min-width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.pagination-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.pagination-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination-active {
		background: var(--color-accent) !important;
		color: #ffffff !important;
		border-color: var(--color-accent) !important;
	}

	.pagination-ellipsis {
		padding: 0 0.25rem;
		color: var(--color-text-tertiary);
		font-size: 0.75rem;
	}

	.pagination-size {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.pagination-select {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.75rem;
	}

	@media (max-width: 640px) {
		.kpi-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.kpi-value {
			font-size: 0.9375rem;
		}

		.dashboard {
			padding: 1rem;
			gap: 1rem;
		}
	}
</style>
