<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions, loading, error, transactionStore } from '$lib/stores/transactions';
	import { openingBalances, openingBalanceStore } from '$lib/stores/opening-balances';
	import AccountsReport from '$lib/components/AccountsReport.svelte';
	import type { Transaction } from '$lib/firestore';

	// Reactive variable to track if data is being submitted
	let submitting = false;

	// Filter and search state for transactions list
	let searchTerm = '';
	let filterType: 'all' | 'income' | 'expense' = 'all';
	let filterCategory = '';
	let sortBy: 'date' | 'amount' | 'description' = 'date';
	let sortOrder: 'asc' | 'desc' = 'desc';
	
	// Date filter state
	let startDate = '';
	let endDate = '';
	
	// Pagination state
	let currentPage = 1;
	let itemsPerPage = 10;
	
	// Monthly balance state - intelligently set to most recent month with data
	let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format (fallback)
	let hasInitializedMonth = false;
	
	// Update selectedMonth to the most recent month with data when stores are loaded (only once)
	$: if (($transactions.length > 0 || $openingBalances.length > 0) && !hasInitializedMonth) {
		const allMonths = [...new Set([
			...$transactions.map(t => t.date.slice(0, 7)),
			...$openingBalances.map(ob => ob.month)
		])].sort().reverse();
		
		if (allMonths.length > 0) {
			selectedMonth = allMonths[0]; // Set to most recent month with data
			hasInitializedMonth = true;
		}
	}
	
	// Opening balance manual entry state
	let showOpeningBalanceModal = false;
	let manualOpeningBalance = 0;
	let openingBalanceNote = '';
	let editingOpeningBalance = false;

	// Categories organized by type and purpose (same as homepage)
	const incomeCategories = [
		'Worldwide Work Donations',
		'Local Congregation Donations',
		'Other Donations'
	];

	const expenseCategories = [
		'Worldwide Work Expenses',
		'Local Congregation Expenses', 
		'Other Expenses'
	];

	// Update transaction modal state
	let showUpdateTransactionModal = false;
	let updateTransactionData: Transaction | null = null;
	let updateForm = {
		date: '',
		description: '',
		category: '',
		amount: 0,
		type: 'income' as 'income' | 'expense'
	};

	// Load transactions on component mount
	onMount(async () => {
		await transactionStore.loadTransactions();
		await openingBalanceStore.loadOpeningBalances();
	});

	// Get unique categories
	$: categories = [...new Set($transactions.map(t => t.category))].sort();

	// Get categories based on selected filter type
	$: availableCategories = filterType === 'income' ? incomeCategories : 
							 filterType === 'expense' ? expenseCategories : 
							 [...incomeCategories, ...expenseCategories];

	// Reset category filter when type changes
	$: if (filterType) {
		if (filterType === 'income' && !incomeCategories.includes(filterCategory)) {
			filterCategory = '';
		} else if (filterType === 'expense' && !expenseCategories.includes(filterCategory)) {
			filterCategory = '';
		}
	}

	// Reset category in update form when type changes
	$: if (updateForm.type) {
		if (updateForm.type === 'income' && !incomeCategories.includes(updateForm.category)) {
			updateForm.category = '';
		} else if (updateForm.type === 'expense' && !expenseCategories.includes(updateForm.category)) {
			updateForm.category = '';
		}
	}

	// Filtered and sorted transactions
	$: filteredTransactions = $transactions
		.filter(t => {
			const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
								 t.category.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesType = filterType === 'all' || t.type === filterType;
			const matchesCategory = !filterCategory || t.category === filterCategory;
			
			// Date filtering - prioritize month selector if no specific date range is set
			const transactionDate = new Date(t.date);
			let matchesDateFilter = true;
			
			if (startDate || endDate) {
				// If specific date range is set, use that
				const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
				const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
				matchesDateFilter = matchesStartDate && matchesEndDate;
			} else {
				// If no specific date range, filter by selected month
				const transactionMonth = t.date.slice(0, 7); // YYYY-MM format
				matchesDateFilter = transactionMonth === selectedMonth;
			}
			
			return matchesSearch && matchesType && matchesCategory && matchesDateFilter;
		})
		.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;
			
			switch (sortBy) {
				case 'date':
					aValue = new Date(a.date).getTime();
					bValue = new Date(b.date).getTime();
					break;
				case 'amount':
					aValue = a.amount;
					bValue = b.amount;
					break;
				case 'description':
					aValue = a.description.toLowerCase();
					bValue = b.description.toLowerCase();
					break;
				default:
					return 0;
			}
			
			if (sortOrder === 'asc') {
				return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
			} else {
				return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
			}
		});

	// Pagination calculations
	$: totalItems = filteredTransactions.length;
	$: totalPages = Math.ceil(totalItems / itemsPerPage);
	$: startIndex = (currentPage - 1) * itemsPerPage;
	$: endIndex = Math.min(startIndex + itemsPerPage, totalItems);
	$: paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
	
	// Reset to first page when filters change
	$: if (searchTerm || filterType || filterCategory || startDate || endDate || selectedMonth) {
		currentPage = 1;
	}

	// Helper function to get next month string
	function getNextMonth(monthString: string): string {
		const [year, month] = monthString.split('-').map(Number);
		const nextMonthDate = new Date(year, month, 1); // month is already 0-indexed after adding 1
		return nextMonthDate.toISOString().slice(0, 7);
	}

	// Helper function to get previous month string
	function getPreviousMonth(monthString: string): string {
		const [year, month] = monthString.split('-').map(Number);
		const prevMonthDate = new Date(year, month - 2, 1); // month - 2 because month is 1-indexed
		return prevMonthDate.toISOString().slice(0, 7);
	}

	// Helper function to get all month strings from earliest transaction to a given month
	function getMonthRange(fromMonth: string, toMonth: string): string[] {
		const months: string[] = [];
		let current = fromMonth;
		
		while (current <= toMonth) {
			months.push(current);
			current = getNextMonth(current);
		}
		
		return months;
	}

	// Helper function to calculate opening balance for any month using proper month-to-month chaining
	function calculateOpeningBalanceForMonth(monthString: string): number {
		// Check if there's a manual opening balance for this month
		const manualOpeningBalanceRecord = $openingBalances.find(ob => ob.month === monthString);
		
		if (manualOpeningBalanceRecord) {
			return manualOpeningBalanceRecord.balance;
		}
		
		// Find the earliest transaction month
		if ($transactions.length === 0) {
			return 0;
		}
		
		const earliestTransaction = $transactions
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
		const earliestMonth = new Date(earliestTransaction.date).toISOString().slice(0, 7);
		
		// If this is the earliest month, start with 0
		if (monthString === earliestMonth) {
			return 0;
		}
		
		// Calculate month by month from the earliest month to get the proper opening balance
		let runningBalance = 0;
		const monthsToCalculate = getMonthRange(earliestMonth, getPreviousMonth(monthString));
		
		for (const month of monthsToCalculate) {
			// Check for manual opening balance for this calculation month
			const monthManualBalance = $openingBalances.find(ob => ob.month === month);
			if (monthManualBalance) {
				runningBalance = monthManualBalance.balance;
			}
			
			// Add this month's activity
			const [year, monthNum] = month.split('-').map(Number);
			const startOfMonth = new Date(year, monthNum - 1, 1);
			const endOfMonth = new Date(year, monthNum, 0);
			
			const transactionsInMonth = $transactions.filter(t => t.date.startsWith(month));
			
			const monthIncome = transactionsInMonth
				.filter(t => t.type === 'income')
				.reduce((sum, t) => sum + t.amount, 0);
			const monthExpenses = transactionsInMonth
				.filter(t => t.type === 'expense')
				.reduce((sum, t) => sum + t.amount, 0);
			
			runningBalance = runningBalance + monthIncome - monthExpenses;
		}
		
		return runningBalance;
	}

	// Helper function to calculate closing balance for any month
	function calculateClosingBalanceForMonth(monthString: string): number {
		const [year, month] = monthString.split('-').map(Number);
		const startOfMonth = new Date(year, month - 1, 1);
		const endOfMonth = new Date(year, month, 0);
		
		// Get opening balance for this month
		const openingBalance = calculateOpeningBalanceForMonth(monthString);
		
		// Get transactions for this month
		const transactionsInMonth = $transactions.filter(t => t.date.startsWith(monthString));
		
		// Calculate month activity
		const monthIncome = transactionsInMonth
			.filter(t => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);
		const monthExpenses = transactionsInMonth
			.filter(t => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);
		
		// Return closing balance
		return openingBalance + monthIncome - monthExpenses;
	}

	// Modified monthly balance calculations with proper next month opening balance logic
	$: monthlyBalanceData = (() => {
		const [year, month] = selectedMonth.split('-').map(Number);
		const startOfMonth = new Date(year, month - 1, 1);
		const endOfMonth = new Date(year, month, 0);
		
		// Check if there's a manual opening balance for this month
		const manualOpeningBalanceRecord = $openingBalances.find(ob => ob.month === selectedMonth);
		
		// Get transactions for the selected month (use same logic as dashboard)
		const transactionsInMonth = $transactions.filter(t => t.date.startsWith(selectedMonth));
		
		// Check if this month has any activity (transactions or manual opening balance)
		const hasActivity = transactionsInMonth.length > 0 || manualOpeningBalanceRecord;
		
		// Calculate or use manual opening balance
		let openingBalance: number;
		let isManualOpeningBalance = false;
		
		if (manualOpeningBalanceRecord) {
			openingBalance = manualOpeningBalanceRecord.balance;
			isManualOpeningBalance = true;
		} else if (hasActivity || $transactions.length > 0) {
			// Only calculate opening balance if there's activity or if there are transactions in the system
			openingBalance = calculateOpeningBalanceForMonth(selectedMonth);
		} else {
			// No activity and no transactions in system
			openingBalance = 0;
		}
		
		// Calculate month activity
		const monthIncome = transactionsInMonth
			.filter(t => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);
		const monthExpenses = transactionsInMonth
			.filter(t => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);
		
		// Calculate closing balance
		const closingBalance = openingBalance + monthIncome - monthExpenses;
		
		// Breakdown by category for the month
		const monthWorldwideIncome = transactionsInMonth
			.filter(t => t.type === 'income' && t.category.includes('Worldwide Work'))
			.reduce((sum, t) => sum + t.amount, 0);
		const monthWorldwideExpenses = transactionsInMonth
			.filter(t => t.type === 'expense' && t.category.includes('Worldwide Work'))
			.reduce((sum, t) => sum + t.amount, 0);
			
		const monthLocalIncome = transactionsInMonth
			.filter(t => t.type === 'income' && t.category.includes('Local Congregation'))
			.reduce((sum, t) => sum + t.amount, 0);
		const monthLocalExpenses = transactionsInMonth
			.filter(t => t.type === 'expense' && t.category.includes('Local Congregation'))
			.reduce((sum, t) => sum + t.amount, 0);
		
		const monthOtherIncome = transactionsInMonth
			.filter(t => t.type === 'income' && t.category.includes('Other'))
			.reduce((sum, t) => sum + t.amount, 0);
		const monthOtherExpenses = transactionsInMonth
			.filter(t => t.type === 'expense' && t.category.includes('Other'))
			.reduce((sum, t) => sum + t.amount, 0);
		
		return {
			month: startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
			openingBalance,
			isManualOpeningBalance,
			openingBalanceNote: manualOpeningBalanceRecord?.note || '',
			monthIncome,
			monthExpenses,
			closingBalance,
			transactionCount: transactionsInMonth.length,
			hasActivity,
			worldwideWork: {
				income: monthWorldwideIncome,
				expenses: monthWorldwideExpenses,
				balance: monthWorldwideIncome - monthWorldwideExpenses
			},
			localCongregation: {
				income: monthLocalIncome,
				expenses: monthLocalExpenses,
				balance: monthLocalIncome - monthLocalExpenses
			},
			other: {
				income: monthOtherIncome,
				expenses: monthOtherExpenses,
				balance: monthOtherIncome - monthOtherExpenses
			}
		};
	})();

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-PH', {
			style: 'currency',
			currency: 'PHP'
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function setMonthFilter(monthValue: string) {
		selectedMonth = monthValue;
		// Clear date range filters when month changes to ensure month filter takes priority
		startDate = '';
		endDate = '';
	}

	async function deleteTransaction(id: string) {
		if (!id) {
			console.error('Transaction ID is required for deletion');
			return;
		}

		if (confirm('Are you sure you want to delete this transaction?')) {
			try {
				await transactionStore.deleteTransaction(id);
				console.log('Transaction deleted successfully');
			} catch (err) {
				console.error('Failed to delete transaction:', err);
				alert('Failed to delete transaction. Please try again.');
			}
		}
	}

	function openUpdateTransactionModal(transaction: Transaction) {
		updateTransactionData = transaction;
		updateForm = {
			date: transaction.date,
			description: transaction.description,
			category: transaction.category,
			amount: transaction.amount,
			type: transaction.type
		};
		showUpdateTransactionModal = true;
	}

	function closeUpdateTransactionModal() {
		showUpdateTransactionModal = false;
		updateTransactionData = null;
		updateForm = {
			date: '',
			description: '',
			category: '',
			amount: 0,
			type: 'income'
		};
	}

	async function saveUpdatedTransaction() {
		if (!updateTransactionData?.id) return;

		try {
			await transactionStore.updateTransaction(updateTransactionData.id, {
				date: updateForm.date,
				description: updateForm.description,
				category: updateForm.category,
				amount: updateForm.amount,
				type: updateForm.type
			});
			closeUpdateTransactionModal();
		} catch (err) {
			console.error('Failed to update transaction:', err);
			alert('Failed to update transaction. Please try again.');
		}
	}

	function clearFilters() {
		searchTerm = '';
		filterType = 'all';
		filterCategory = '';
		startDate = '';
		endDate = '';
		currentPage = 1;
	}

	// Pagination functions
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	function nextPage() {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	function changeItemsPerPage(newItemsPerPage: number) {
		itemsPerPage = newItemsPerPage;
		currentPage = 1;
	}

	function setDateRange(range: 'today' | 'week' | 'month' | 'year') {
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth();
		const date = today.getDate();

		switch (range) {
			case 'today':
				startDate = today.toISOString().split('T')[0];
				endDate = today.toISOString().split('T')[0];
				break;
			case 'week':
				const weekStart = new Date(today);
				weekStart.setDate(date - today.getDay());
				const weekEnd = new Date(today);
				weekEnd.setDate(date + (6 - today.getDay()));
				startDate = weekStart.toISOString().split('T')[0];
				endDate = weekEnd.toISOString().split('T')[0];
				break;
			case 'month':
				const monthStart = new Date(year, month, 1);
				const monthEnd = new Date(year, month + 1, 0);
				startDate = monthStart.toISOString().split('T')[0];
				endDate = monthEnd.toISOString().split('T')[0];
				break;
			case 'year':
				const yearStart = new Date(year, 0, 1);
				const yearEnd = new Date(year, 11, 31);
				startDate = yearStart.toISOString().split('T')[0];
				endDate = yearEnd.toISOString().split('T')[0];
				break;
		}
	}

	function openOpeningBalanceModal() {
		const existingBalance = $openingBalances.find(ob => ob.month === selectedMonth);
		if (existingBalance) {
			manualOpeningBalance = existingBalance.balance;
			openingBalanceNote = existingBalance.note || '';
			editingOpeningBalance = true;
		} else {
			manualOpeningBalance = monthlyBalanceData.openingBalance;
			openingBalanceNote = '';
			editingOpeningBalance = false;
		}
		showOpeningBalanceModal = true;
	}

	function closeOpeningBalanceModal() {
		showOpeningBalanceModal = false;
		manualOpeningBalance = 0;
		openingBalanceNote = '';
		editingOpeningBalance = false;
	}

	async function saveOpeningBalance() {
		const success = await openingBalanceStore.setMonthOpeningBalance(
			selectedMonth, 
			manualOpeningBalance, 
			openingBalanceNote
		);
		
		if (success) {
			// The opening balance change affects future months, so we need to recalculate
			// The reactive statement will automatically update the display
			closeOpeningBalanceModal();
		}
	}

	async function deleteOpeningBalance() {
		if (confirm('Are you sure you want to delete the manual start of month balance? This will revert to using the previous month\'s closing balance.')) {
			const success = await openingBalanceStore.deleteMonthOpeningBalance(selectedMonth);
			if (success) {
				closeOpeningBalanceModal();
			}
		}
	}
</script>

<div class="transactions-page">
	<!-- Error Message -->
	{#if $error}
		<div class="error-message">
			<p>⚠️ {$error}</p>
			<button on:click={() => transactionStore.clearError()}>Dismiss</button>
		</div>
	{/if}

	<!-- Loading Indicator -->
	{#if $loading}
		<div class="loading-indicator">
			<p>🔄 Loading transactions...</p>
		</div>
	{/if}

	<div class="page-header">
		<h1>Monthly Balance Report</h1>
	</div>

	<!-- Monthly Balance Report -->
	<div class="monthly-balance-section">
		<div class="monthly-balance-header">
			<h2>📊 Monthly Financial Summary</h2>
			<div class="month-selector">
				<label for="month-select">Select Month:</label>
				<input 
					id="month-select"
					type="month" 
					bind:value={selectedMonth}
					on:change={() => setMonthFilter(selectedMonth)}
				/>
			</div>
		</div>

		<div class="monthly-balance-card">
			<h3>📅 {monthlyBalanceData.month} Summary</h3>
			
			<!-- Always show the balance flow, even if no activity -->
			<div class="balance-flow">
				<div class="balance-item opening">
					<h4>Start of month balance</h4>
					<p class="balance-amount" class:income={monthlyBalanceData.openingBalance >= 0} class:expense={monthlyBalanceData.openingBalance < 0}>
						{formatCurrency(monthlyBalanceData.openingBalance)}
					</p>
					<button class="edit-balance-btn" on:click={openOpeningBalanceModal}>
						{monthlyBalanceData.isManualOpeningBalance ? 'Edit' : 'Set Manual'} Balance
					</button>
				</div>

				<div class="balance-activity">
					<div class="activity-item income">
						<span class="activity-label">Monthly Donations</span>
						<span class="activity-amount">+{formatCurrency(monthlyBalanceData.monthIncome)}</span>
					</div>
					<div class="activity-item expense">
						<span class="activity-label">Monthly Expenses</span>
						<span class="activity-amount">-{formatCurrency(monthlyBalanceData.monthExpenses)}</span>
					</div>
				</div>

				<div class="balance-item closing">
					<h4>End of month balance</h4>
					<p class="balance-amount" class:income={monthlyBalanceData.closingBalance >= 0} class:expense={monthlyBalanceData.closingBalance < 0}>
						{formatCurrency(monthlyBalanceData.closingBalance)}
					</p>
					<p class="balance-note">This becomes next month's start of month balance</p>
				</div>
			</div>

			<!-- Show no data message only when there's no activity -->
			{#if !monthlyBalanceData.hasActivity}
				<div class="no-data-notice">
					<p class="no-data-text">📭 No transactions or manual balances found for this month.</p>
				</div>
			{/if}

			<div class="monthly-breakdown">
				<div class="monthly-category">
					<h4>🌍 Worldwide Work</h4>
					<div class="category-stats">
						<div class="stat-row">
							<span>Donations:</span>
							<span class="amount income">+{formatCurrency(monthlyBalanceData.worldwideWork.income)}</span>
						</div>
						<div class="stat-row">
							<span>Expenses:</span>
							<span class="amount expense">-{formatCurrency(monthlyBalanceData.worldwideWork.expenses)}</span>
						</div>
						<div class="stat-row total">
							<span>Net:</span>
							<span class="amount" class:income={monthlyBalanceData.worldwideWork.balance >= 0} class:expense={monthlyBalanceData.worldwideWork.balance < 0}>
								{formatCurrency(monthlyBalanceData.worldwideWork.balance)}
							</span>
						</div>
					</div>
				</div>

				<div class="monthly-category">
					<h4>🏛️ Local Congregation</h4>
					<div class="category-stats">
						<div class="stat-row">
							<span>Donations:</span>
							<span class="amount income">+{formatCurrency(monthlyBalanceData.localCongregation.income)}</span>
						</div>
						<div class="stat-row">
							<span>Expenses:</span>
							<span class="amount expense">-{formatCurrency(monthlyBalanceData.localCongregation.expenses)}</span>
						</div>
						<div class="stat-row total">
							<span>Net:</span>
							<span class="amount" class:income={monthlyBalanceData.localCongregation.balance >= 0} class:expense={monthlyBalanceData.localCongregation.balance < 0}>
								{formatCurrency(monthlyBalanceData.localCongregation.balance)}
							</span>
						</div>
					</div>
				</div>

				<div class="monthly-category">
					<h4>📋 Other</h4>
					<div class="category-stats">
						<div class="stat-row">
							<span>Donations:</span>
							<span class="amount income">+{formatCurrency(monthlyBalanceData.other.income)}</span>
						</div>
						<div class="stat-row">
							<span>Expenses:</span>
							<span class="amount expense">-{formatCurrency(monthlyBalanceData.other.expenses)}</span>
						</div>
						<div class="stat-row total">
							<span>Net:</span>
							<span class="amount" class:income={monthlyBalanceData.other.balance >= 0} class:expense={monthlyBalanceData.other.balance < 0}>
								{formatCurrency(monthlyBalanceData.other.balance)}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div class="monthly-summary">
				<p><strong>Total Transactions:</strong> {monthlyBalanceData.transactionCount}</p>
			</div>
		</div>
	</div>

	<!-- PDF Report Generation -->
	<div class="pdf-report-section">
		<AccountsReport
			month={selectedMonth}
			transactions={$transactions.filter(t => t.date.startsWith(selectedMonth))}
			openingBalance={$openingBalances.find(ob => ob.month === selectedMonth) || null}
			congregationName="Bolaoen Congregation"
		/>
	</div>

	<!-- Filters and Transactions List -->
	<div class="transactions-list-section">
		<div class="transactions-header">
			<h2>📋 All Transactions</h2>
			<div class="header-actions">
				<button class="clear-filters-btn" on:click={clearFilters}>
					🗑️ Clear Filters
				</button>
			</div>
		</div>

		<!-- Filters -->
		<div class="filters">
			<div class="filter-info">
				<p class="filter-note">
					📅 <strong>Date Filtering:</strong> 
					{#if startDate || endDate}
						Using custom date range. Clear dates to filter by selected month above.
					{:else}
						Currently showing transactions for {monthlyBalanceData.month} only.
					{/if}
				</p>
			</div>
			
			<div class="search-group">
				<label for="search">Search</label>
				<input
					id="search"
					type="text"
					bind:value={searchTerm}
					placeholder="Search transactions..."
				/>
			</div>

			<div class="filter-group">
				<label for="type-filter">Type</label>
				<select id="type-filter" bind:value={filterType}>
					<option value="all">All Types</option>
					<option value="income">Donations</option>
					<option value="expense">Expense</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="category-filter">Category</label>
				<select id="category-filter" bind:value={filterCategory}>
					<option value="">All Categories</option>
					{#each availableCategories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</div>

			<div class="filter-group">
				<label for="sort-by">Sort By</label>
				<select id="sort-by" bind:value={sortBy}>
					<option value="date">Date</option>
					<option value="amount">Amount</option>
					<option value="description">Description</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="sort-order">Order</label>
				<select id="sort-order" bind:value={sortOrder}>
					<option value="desc">Descending</option>
					<option value="asc">Ascending</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="start-date">Start Date</label>
				<input
					id="start-date"
					type="date"
					bind:value={startDate}
					placeholder="Start date"
				/>
			</div>

			<div class="filter-group">
				<label for="end-date">End Date</label>
				<input
					id="end-date"
					type="date"
					bind:value={endDate}
					placeholder="End date"
				/>
			</div>

			<div class="date-presets">
				<span class="presets-label">Quick Filters:</span>
				<div class="preset-buttons">
					<button type="button" class="preset-btn" on:click={() => setDateRange('today')}>Today</button>
					<button type="button" class="preset-btn" on:click={() => setDateRange('week')}>This Week</button>
					<button type="button" class="preset-btn" on:click={() => setDateRange('month')}>This Month</button>
					<button type="button" class="preset-btn" on:click={() => setDateRange('year')}>This Year</button>
				</div>
			</div>
		</div>

		<!-- Transactions Table -->
		<div class="transactions-table">
			<div class="table-header">
				<div class="col-date">Date</div>
				<div class="col-description">Description</div>
				<div class="col-type">Type</div>
				<div class="col-amount">Amount</div>
				<div class="col-actions">Actions</div>
			</div>

			<!-- Pagination Controls Top -->
			<div class="pagination-controls-top">
				<div class="pagination-info">
					<span>Showing {startIndex + 1}-{endIndex} of {totalItems} transactions</span>
				</div>
				<div class="items-per-page">
					<label for="items-per-page">Items per page:</label>
					<select 
						id="items-per-page" 
						bind:value={itemsPerPage} 
						on:change={() => changeItemsPerPage(itemsPerPage)}
					>
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
					</select>
				</div>
			</div>

			<div class="table-body">
				{#each paginatedTransactions as transaction (transaction.id)}
					<div class="table-row" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
						<div class="col-date">{formatDate(transaction.date)}</div>
						<div class="col-description">{transaction.description}</div>
						<div class="col-type">
							<span class="type-badge" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
								{transaction.type}
							</span>
						</div>
						<div class="col-amount" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
							{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
						</div>
						<div class="col-actions">
							<button 
								class="edit-btn" 
								on:click={() => openUpdateTransactionModal(transaction)}
								disabled={$loading}
								title="Edit transaction"
							>
								✏️
							</button>
							<button 
								class="delete-btn" 
								on:click={() => deleteTransaction(transaction.id!)}
								disabled={$loading}
								title="Delete transaction"
							>
								🗑️
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if paginatedTransactions.length === 0 && !$loading}
				<div class="no-results">
					<p>No transactions found matching your filters.</p>
				</div>
			{/if}

			<!-- Pagination Controls Bottom -->
			{#if totalPages > 1}
				<div class="pagination-controls">
					<button 
						class="pagination-btn" 
						on:click={prevPage} 
						disabled={currentPage === 1}
						title="Previous page"
					>
						‹ Previous
					</button>
					
					<div class="pagination-numbers">
						{#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
							let start = Math.max(1, currentPage - 2);
							let end = Math.min(totalPages, start + 4);
							start = Math.max(1, end - 4);
							return start + i;
						}).filter(page => page <= totalPages) as page}
							<button 
								class="pagination-number" 
								class:active={page === currentPage}
								on:click={() => goToPage(page)}
							>
								{page}
							</button>
						{/each}
					</div>
					
					<button 
						class="pagination-btn" 
						on:click={nextPage} 
						disabled={currentPage === totalPages}
						title="Next page"
					>
						Next ›
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Start of Month Balance Modal -->
	{#if showOpeningBalanceModal}
		<div class="modal-overlay" on:click={closeOpeningBalanceModal}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h3>
						{editingOpeningBalance ? 'Edit' : 'Set'} Start of Month Balance
					</h3>
					<button class="modal-close" on:click={closeOpeningBalanceModal}>×</button>
				</div>
				
				<div class="modal-body">
					<p class="modal-description">
						Set a manual start of month balance for <strong>{monthlyBalanceData.month}</strong>. 
						This will override the automatic calculation that uses the previous month's closing balance.
					</p>
					
					<div class="form-group">
						<label for="manual-balance">Start of Month Balance:</label>
						<input 
							id="manual-balance"
							type="number" 
							step="0.01" 
							bind:value={manualOpeningBalance}
							placeholder="Enter start of month balance"
						/>
					</div>
					
					<div class="form-group">
						<label for="balance-note">Note (Optional):</label>
						<textarea 
							id="balance-note"
							bind:value={openingBalanceNote}
							placeholder="Add a note about this balance..."
							rows="3"
						></textarea>
					</div>
					
					<div class="current-info">
						<p><strong>Current Start of Month Balance:</strong> 
							{formatCurrency(monthlyBalanceData.openingBalance)}
						</p>
						{#if monthlyBalanceData.isManualOpeningBalance}
							<p><small>This is currently a manual entry.</small></p>
						{:else}
							<p><small>This is currently calculated from the previous month's closing balance.</small></p>
						{/if}
						<p><strong>This Month's Closing Balance:</strong> 
							{formatCurrency(monthlyBalanceData.closingBalance)}
						</p>
						<p><small>The closing balance will become next month's start of month balance.</small></p>
					</div>
				</div>
				
				<div class="modal-footer">
					<button class="btn-secondary" on:click={closeOpeningBalanceModal}>
						Cancel
					</button>
					{#if editingOpeningBalance}
						<button class="btn-danger" on:click={deleteOpeningBalance}>
							Remove Manual Balance
						</button>
					{/if}
					<button class="btn-primary" on:click={saveOpeningBalance}>
						Save Balance
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Update Transaction Modal -->
	{#if showUpdateTransactionModal && updateTransactionData}
		<div class="modal-overlay" on:click={closeUpdateTransactionModal}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h3>Update Transaction</h3>
					<button class="modal-close" on:click={closeUpdateTransactionModal}>×</button>
				</div>
				
				<div class="modal-body">
					<form on:submit|preventDefault={saveUpdatedTransaction}>
						<div class="form-group">
							<label for="update-date">Date:</label>
							<input 
								id="update-date"
								type="date" 
								bind:value={updateForm.date}
								required
							/>
						</div>
						
						<div class="form-group">
							<label for="update-description">Description:</label>
							<input 
								id="update-description"
								type="text" 
								bind:value={updateForm.description}
								placeholder="Transaction description"
								required
							/>
						</div>
						
						<div class="form-group">
							<label for="update-category">Category:</label>
							<input 
								id="update-category"
								type="text" 
								bind:value={updateForm.category}
								placeholder="Transaction category"
								list="update-category-list"
								required
							/>
							<datalist id="update-category-list">
								{#each (updateForm.type === 'income' ? incomeCategories : expenseCategories) as category}
									<option value={category}></option>
								{/each}
							</datalist>
						</div>
						
						<div class="form-group">
							<label for="update-type">Type:</label>
							<select id="update-type" bind:value={updateForm.type} required>
								<option value="income">Income</option>
								<option value="expense">Expense</option>
							</select>
						</div>
						
						<div class="form-group">
							<label for="update-amount">Amount:</label>
							<input 
								id="update-amount"
								type="number" 
								step="0.01" 
								min="0"
								bind:value={updateForm.amount}
								placeholder="0.00"
								required
							/>
						</div>
					</form>
				</div>
				
				<div class="modal-footer">
					<button class="btn-secondary" on:click={closeUpdateTransactionModal}>
						Cancel
					</button>
					<button class="btn-primary" on:click={saveUpdatedTransaction}>
						Update Transaction
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.transactions-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Poppins', sans-serif;
		background: var(--color-bg-secondary);
		min-height: 100vh;
	}

	/* Error and Loading States */
	.error-message {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error-border);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-message p {
		margin: 0;
		color: var(--color-error);
		font-weight: 500;
	}

	.error-message button {
		background: var(--color-error);
		color: white;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.loading-indicator {
		background: var(--color-info-bg);
		border: 1px solid var(--color-info-border);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.loading-indicator p {
		margin: 0;
		color: var(--color-info);
		font-weight: 500;
	}

	.page-header {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 2rem;
		padding: 1.5rem 2rem;
		background: var(--color-bg-primary);
		border-radius: 16px;
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--color-border-primary);
	}

	.page-header h1 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 2rem;
		font-weight: 700;
	}

	/* Monthly Balance Section */
	.monthly-balance-section {
		margin-bottom: 2rem;
	}

	.pdf-report-section {
		margin-bottom: 2rem;
	}

	.monthly-balance-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.monthly-balance-header h2 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 1.5rem;
		font-weight: 700;
	}

	.month-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.month-selector label {
		color: var(--color-text-secondary);
		font-weight: 500;
		font-size: 0.875rem;
	}

	.month-selector input[type="month"] {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: 6px;
		font-size: 0.875rem;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.monthly-balance-card {
		background: var(--color-bg-primary);
		padding: 2rem;
		border-radius: 12px;
		box-shadow: var(--shadow-md);
		border: 1px solid var(--color-border-primary);
	}

	.monthly-balance-card h3 {
		margin: 0 0 1.5rem 0;
		color: var(--color-text-primary);
		font-size: 1.25rem;
		font-weight: 600;
		text-align: center;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--color-border-primary);
	}

	.balance-flow {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 2rem;
		align-items: center;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: var(--color-surface-primary);
		border-radius: 8px;
		border: 1px solid var(--color-border-secondary);
	}

	.balance-item {
		text-align: center;
	}

	.balance-item h4 {
		margin: 0 0 0.5rem 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.balance-amount {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.balance-amount.income {
		color: #10b981;
	}

	.balance-amount.expense {
		color: #ef4444;
	}

	.balance-type-indicator {
		margin: 0.25rem 0 0 0;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.balance-type-indicator.manual {
		color: var(--color-accent);
	}

	.balance-type-indicator.calculated {
		color: var(--color-text-secondary);
	}

	.balance-note {
		margin: 0.25rem 0 0 0;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		font-style: italic;
	}

	.edit-balance-btn {
		margin-top: 0.5rem;
		background: var(--color-surface-primary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.edit-balance-btn:hover {
		background: var(--color-surface-hover);
		border-color: #9ca3af;
	}

	.balance-activity {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0 1rem;
		border-left: 1px solid var(--color-border-primary);
		border-right: 1px solid var(--color-border-primary);
	}

	.activity-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.activity-item.income {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.activity-item.expense {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.activity-label {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.activity-amount {
		font-weight: 600;
	}

	.monthly-breakdown {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.monthly-category {
		padding: 1.5rem;
		background: var(--color-surface-primary);
		border-radius: 8px;
		border: 1px solid var(--color-border-primary);
	}

	.monthly-category h4 {
		margin: 0 0 1rem 0;
		color: var(--color-text-primary);
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.category-stats {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
		font-size: 0.875rem;
		color: var(--color-text-primary);
	}

	.stat-row.total {
		border-top: 1px solid var(--color-border-primary);
		padding-top: 0.75rem;
		margin-top: 0.5rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.stat-row .amount {
		font-weight: 600;
	}

	.stat-row .amount.income {
		color: #10b981;
	}

	.stat-row .amount.expense {
		color: #ef4444;
	}

	.monthly-summary {
		padding: 1rem;
		background: var(--color-surface-secondary);
		border-radius: 6px;
		text-align: center;
		border: 1px solid var(--color-border-secondary);
	}

	.monthly-summary p {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.monthly-summary .amount {
		font-weight: 600;
	}

	.monthly-summary .amount.income {
		color: #10b981;
	}

	.monthly-summary .amount.expense {
		color: #ef4444;
	}

	.no-data-message {
		text-align: center;
		padding: 3rem 2rem;
		color: var(--color-text-secondary);
		background: var(--color-surface-primary);
		border-radius: 8px;
		border: 2px dashed var(--color-border-secondary);
	}

	.no-data-message p {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.no-data-message p:first-child {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.no-data-notice {
		text-align: center;
		padding: 1rem;
		margin: 1rem 0;
		color: var(--color-text-secondary);
		background: var(--color-surface-primary);
		border-radius: 8px;
		border: 1px solid var(--color-border-secondary);
	}

	.no-data-text {
		margin: 0;
		font-size: 0.875rem;
		font-style: italic;
	}

	/* Transactions List Section */
	.transactions-list-section {
		margin-top: 3rem;
	}

	.transactions-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.transactions-header h2 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 1.5rem;
		font-weight: 700;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.clear-filters-btn {
		background: var(--color-text-secondary);
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.clear-filters-btn:hover {
		background: var(--color-text-tertiary);
	}

	/* Filters */
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		background: var(--color-bg-primary);
		padding: 2rem;
		border-radius: 16px;
		box-shadow: var(--shadow-lg);
		margin-bottom: 2rem;
		backdrop-filter: blur(10px);
		border: 1px solid var(--color-border-primary);
	}

	.filter-info {
		grid-column: 1 / -1;
		padding: 1rem;
		background: var(--color-info-bg);
		border: 1px solid var(--color-info-border);
		border-radius: 8px;
		margin-bottom: 0.5rem;
	}

	.filter-note {
		margin: 0;
		color: var(--color-info);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.search-group,
	.filter-group {
		display: flex;
		flex-direction: column;
	}

	.search-group label,
	.filter-group label {
		margin-bottom: 0.5rem;
		color: var(--color-text-secondary);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.search-group input,
	.filter-group select {
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-border-primary);
		border-radius: 12px;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.filter-group select option {
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.search-group input:focus,
	.filter-group select:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px var(--color-accent-alpha);
	}

	.search-group input::placeholder {
		color: var(--color-text-tertiary);
		opacity: 1;
	}

	.filter-group input[type="date"] {
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-border-primary);
		border-radius: 12px;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.filter-group input[type="date"]:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px var(--color-accent-alpha);
	}

	.date-presets {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.date-presets .presets-label {
		color: var(--color-text-secondary);
		font-weight: 500;
		font-size: 0.875rem;
	}

	.preset-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.preset-btn {
		background: var(--color-surface-primary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: 12px;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.preset-btn:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-secondary);
		transform: translateY(-1px);
	}

	.preset-btn:active {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
		transform: translateY(0);
	}

	/* Transactions Table */
	.transactions-table {
		background: var(--color-bg-primary);
		border-radius: 16px;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		border: 1px solid var(--color-border-primary);
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1fr 1fr auto;
		gap: 1.5rem;
		padding: 1.5rem 2rem;
		background: var(--color-surface-primary);
		border-bottom: 1px solid var(--color-border-primary);
		font-weight: 700;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-body {
		/* Removed max-height and overflow-y for pagination */
	}

	.table-row {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1fr 1fr auto;
		gap: 1.5rem;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid var(--color-border-secondary);
		transition: all 0.2s ease;
		align-items: center;
		background: var(--color-bg-primary);
	}

	.table-row:hover {
		background: var(--color-surface-hover);
		transform: translateX(4px);
		box-shadow: inset 4px 0 0 var(--color-accent);
	}

	.table-row.income {
		border-left: 4px solid #10b981;
		background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
	}

	.table-row.expense {
		border-left: 4px solid #ef4444;
		background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%);
	}

	.col-date {
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.col-description {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.category-tag {
		background: var(--color-surface-secondary);
		color: var(--color-text-secondary);
		padding: 0.5rem 1rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid var(--color-border-secondary);
	}

	.type-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.type-badge.income {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.type-badge.expense {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.col-amount {
		font-weight: 600;
		text-align: right;
	}

	.col-amount.income {
		color: #10b981;
	}

	.col-amount.expense {
		color: #ef4444;
	}

	.col-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.edit-btn,
	.delete-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s;
		font-size: 1rem;
	}

	.edit-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.delete-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.edit-btn:disabled,
	.delete-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.no-results {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--color-text-secondary);
	}

	/* Pagination Styles */
	.pagination-controls-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: var(--color-surface-primary);
		border-bottom: 1px solid var(--color-border-primary);
		font-size: 0.875rem;
	}

	.pagination-info {
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.items-per-page {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.items-per-page label {
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.items-per-page select {
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border-primary);
		border-radius: 4px;
		font-size: 0.875rem;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.pagination-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 2rem;
		background: var(--color-surface-primary);
		border-top: 1px solid var(--color-border-primary);
	}

	.pagination-btn {
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: 6px;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.pagination-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
		border-color: var(--color-border-secondary);
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-surface-secondary);
	}

	.pagination-numbers {
		display: flex;
		gap: 0.25rem;
	}

	.pagination-number {
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 40px;
		text-align: center;
	}

	.pagination-number:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-secondary);
	}

	.pagination-number.active {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}

	.pagination-number.active:hover {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: var(--color-bg-primary);
		border-radius: 12px;
		box-shadow: var(--shadow-xl);
		max-width: 500px;
		width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
		border: 1px solid var(--color-border-primary);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 1.5rem 0 1.5rem;
		border-bottom: 1px solid var(--color-border-primary);
		margin-bottom: 1.5rem;
	}

	.modal-header h3 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 1.25rem;
		font-weight: 600;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0;
		line-height: 1;
	}

	.modal-close:hover {
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: 0 1.5rem;
	}

	.modal-description {
		margin: 0 0 1.5rem 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--color-text-secondary);
		font-weight: 500;
		font-size: 0.875rem;
	}

	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s, box-shadow 0.2s;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.form-group select option {
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px var(--color-accent-alpha);
	}

	.form-group input::placeholder,
	.form-group textarea::placeholder {
		color: var(--color-text-tertiary);
		opacity: 1;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 80px;
	}

	.current-info {
		background: var(--color-surface-secondary);
		padding: 1rem;
		border-radius: 6px;
		margin-top: 1rem;
		border: 1px solid var(--color-border-secondary);
	}

	.current-info p {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid var(--color-border-primary);
		margin-top: 1.5rem;
	}

	.btn-primary {
		background: var(--color-accent);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary:hover {
		background: var(--color-accent-hover);
	}

	.btn-secondary {
		background: var(--color-surface-primary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-secondary);
	}

	.btn-danger {
		background: var(--color-error);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-danger:hover {
		background: var(--color-error-hover);
	}

	/* Responsive Design */
	@media (max-width: 1024px) {
		.table-header,
		.table-row {
			grid-template-columns: 2fr 1fr 1fr auto;
		}
		
		.col-date {
			display: none;
		}
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.monthly-balance-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.transactions-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.balance-flow {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.balance-activity {
			border: none;
			padding: 0;
		}

		.monthly-breakdown {
			grid-template-columns: 1fr;
		}

		.modal-content {
			width: 95vw;
			margin: 1rem;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.modal-footer {
			flex-direction: column-reverse;
			gap: 0.5rem;
		}

		.modal-footer button {
			width: 100%;
		}

		.filters {
			grid-template-columns: 1fr;
		}

		.table-header,
		.table-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.table-row {
			padding: 1rem;
			border-left: none !important;
			border-radius: 8px;
			margin-bottom: 0.5rem;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}

		.table-header {
			display: none;
		}

		.col-description::before { content: "Description: "; font-weight: 600; }
		.col-type::before { content: "Type: "; font-weight: 600; }
		.col-amount::before { content: "Amount: "; font-weight: 600; }
		.col-actions::before { content: "Actions: "; font-weight: 600; }
		
		.col-date {
			display: none;
		}

		.pagination-controls-top {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.pagination-controls {
			flex-direction: column;
			gap: 1rem;
		}

		.pagination-numbers {
			justify-content: center;
			flex-wrap: wrap;
		}
	}
</style>
