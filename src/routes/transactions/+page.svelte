<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions, loading, error, transactionStore } from '$lib/stores/transactions';
	import { openingBalances, openingBalanceStore } from '$lib/stores/opening-balances';
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
	
	// Monthly balance state
	let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
	
	// Opening balance manual entry state
	let showOpeningBalanceModal = false;
	let manualOpeningBalance = 0;
	let openingBalanceNote = '';
	let editingOpeningBalance = false;

	// Load transactions on component mount
	onMount(async () => {
		await transactionStore.loadTransactions();
		await openingBalanceStore.loadOpeningBalances();
	});

	// Get unique categories
	$: categories = [...new Set($transactions.map(t => t.category))].sort();

	// Filtered and sorted transactions
	$: filteredTransactions = $transactions
		.filter(t => {
			const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
								 t.category.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesType = filterType === 'all' || t.type === filterType;
			const matchesCategory = !filterCategory || t.category === filterCategory;
			
			// Date filtering
			const transactionDate = new Date(t.date);
			const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
			const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
			
			return matchesSearch && matchesType && matchesCategory && matchesStartDate && matchesEndDate;
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
			
			const transactionsInMonth = $transactions.filter(t => {
				const transactionDate = new Date(t.date);
				return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
			});
			
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
		const transactionsInMonth = $transactions.filter(t => {
			const transactionDate = new Date(t.date);
			return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
		});
		
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
		
		// Get transactions for the selected month
		const transactionsInMonth = $transactions.filter(t => {
			const transactionDate = new Date(t.date);
			return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
		});
		
		// Calculate or use manual opening balance
		let openingBalance: number;
		let isManualOpeningBalance = false;
		
		if (manualOpeningBalanceRecord) {
			openingBalance = manualOpeningBalanceRecord.balance;
			isManualOpeningBalance = true;
		} else {
			// Use the proper opening balance calculation
			openingBalance = calculateOpeningBalanceForMonth(selectedMonth);
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
			.filter(t => t.type === 'income' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
			.reduce((sum, t) => sum + t.amount, 0);
		const monthLocalExpenses = transactionsInMonth
			.filter(t => t.type === 'expense' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
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
			worldwideWork: {
				income: monthWorldwideIncome,
				expenses: monthWorldwideExpenses,
				balance: monthWorldwideIncome - monthWorldwideExpenses
			},
			localCongregation: {
				income: monthLocalIncome,
				expenses: monthLocalExpenses,
				balance: monthLocalIncome - monthLocalExpenses
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

	function clearFilters() {
		searchTerm = '';
		filterType = 'all';
		filterCategory = '';
		startDate = '';
		endDate = '';
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
		if (confirm('Are you sure you want to delete the manual opening balance? This will revert to using the previous month\'s closing balance.')) {
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
			
			<div class="balance-flow">
				<div class="balance-item opening">
					<h4>Opening Balance</h4>
					<p class="balance-amount" class:income={monthlyBalanceData.openingBalance >= 0} class:expense={monthlyBalanceData.openingBalance < 0}>
						{formatCurrency(monthlyBalanceData.openingBalance)}
					</p>
					{#if monthlyBalanceData.isManualOpeningBalance}
						<p class="balance-type-indicator manual">📝 Manual Entry</p>
					{:else}
						<p class="balance-type-indicator calculated">🧮 Previous Month's Closing</p>
					{/if}
					{#if monthlyBalanceData.openingBalanceNote}
						<p class="balance-note">💬 {monthlyBalanceData.openingBalanceNote}</p>
					{/if}
					<button class="edit-balance-btn" on:click={openOpeningBalanceModal}>
						{monthlyBalanceData.isManualOpeningBalance ? 'Edit' : 'Set Manual'} Balance
					</button>
				</div>

				<div class="balance-activity">
					<div class="activity-item income">
						<span class="activity-label">Monthly Income</span>
						<span class="activity-amount">+{formatCurrency(monthlyBalanceData.monthIncome)}</span>
					</div>
					<div class="activity-item expense">
						<span class="activity-label">Monthly Expenses</span>
						<span class="activity-amount">-{formatCurrency(monthlyBalanceData.monthExpenses)}</span>
					</div>
				</div>

				<div class="balance-item closing">
					<h4>Closing Balance</h4>
					<p class="balance-amount" class:income={monthlyBalanceData.closingBalance >= 0} class:expense={monthlyBalanceData.closingBalance < 0}>
						{formatCurrency(monthlyBalanceData.closingBalance)}
					</p>
					<p class="balance-note">This becomes next month's opening balance</p>
				</div>
			</div>

			<div class="monthly-breakdown">
				<div class="monthly-category">
					<h4>🌍 Worldwide Work</h4>
					<div class="category-stats">
						<div class="stat-row">
							<span>Income:</span>
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
							<span>Income:</span>
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
			</div>

			<div class="monthly-summary">
				<p><strong>Total Transactions:</strong> {monthlyBalanceData.transactionCount}</p>
			</div>
		</div>
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
					<option value="income">Income</option>
					<option value="expense">Expense</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="category-filter">Category</label>
				<select id="category-filter" bind:value={filterCategory}>
					<option value="">All Categories</option>
					{#each categories as category}
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

			<div class="table-body">
				{#each filteredTransactions as transaction (transaction.id)}
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
								class="delete-btn" 
								on:click={() => deleteTransaction(transaction.id!)}
								disabled={$loading}
							>
								🗑️
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if filteredTransactions.length === 0 && !$loading}
				<div class="no-results">
					<p>No transactions found matching your filters.</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Opening Balance Modal -->
	{#if showOpeningBalanceModal}
		<div class="modal-overlay" on:click={closeOpeningBalanceModal}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h3>
						{editingOpeningBalance ? 'Edit' : 'Set'} Opening Balance
					</h3>
					<button class="modal-close" on:click={closeOpeningBalanceModal}>×</button>
				</div>
				
				<div class="modal-body">
					<p class="modal-description">
						Set a manual opening balance for <strong>{monthlyBalanceData.month}</strong>. 
						This will override the automatic calculation that uses the previous month's closing balance.
					</p>
					
					<div class="form-group">
						<label for="manual-balance">Opening Balance:</label>
						<input 
							id="manual-balance"
							type="number" 
							step="0.01" 
							bind:value={manualOpeningBalance}
							placeholder="Enter opening balance"
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
						<p><strong>Current Opening Balance:</strong> 
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
						<p><small>The closing balance will become next month's opening balance.</small></p>
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
</div>

<style>
	.transactions-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Poppins', sans-serif;
	}

	/* Error and Loading States */
	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-message p {
		margin: 0;
		color: #dc2626;
		font-weight: 500;
	}

	.error-message button {
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.loading-indicator {
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.loading-indicator p {
		margin: 0;
		color: #0369a1;
		font-weight: 500;
	}

	.page-header {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 2rem;
		padding: 1.5rem 2rem;
		background: white;
		border-radius: 16px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.page-header h1 {
		margin: 0;
		color: #1e293b;
		font-size: 2rem;
		font-weight: 700;
	}

	/* Monthly Balance Section */
	.monthly-balance-section {
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
		color: #1e293b;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.month-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.month-selector label {
		color: #374151;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.month-selector input[type="month"] {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
	}

	.monthly-balance-card {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.monthly-balance-card h3 {
		margin: 0 0 1.5rem 0;
		color: #1e293b;
		font-size: 1.25rem;
		font-weight: 600;
		text-align: center;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e2e8f0;
	}

	.balance-flow {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 2rem;
		align-items: center;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: #f8fafc;
		border-radius: 8px;
	}

	.balance-item {
		text-align: center;
	}

	.balance-item h4 {
		margin: 0 0 0.5rem 0;
		color: #64748b;
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
		color: #2563eb;
	}

	.balance-type-indicator.calculated {
		color: #64748b;
	}

	.balance-note {
		margin: 0.25rem 0 0 0;
		font-size: 0.75rem;
		color: #6b7280;
		font-style: italic;
	}

	.edit-balance-btn {
		margin-top: 0.5rem;
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.edit-balance-btn:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.balance-activity {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0 1rem;
		border-left: 1px solid #e2e8f0;
		border-right: 1px solid #e2e8f0;
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
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.monthly-category h4 {
		margin: 0 0 1rem 0;
		color: #1e293b;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e2e8f0;
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
	}

	.stat-row.total {
		border-top: 1px solid #e2e8f0;
		padding-top: 0.75rem;
		margin-top: 0.5rem;
		font-weight: 600;
		color: #1e293b;
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
		background: #f1f5f9;
		border-radius: 6px;
		text-align: center;
	}

	.monthly-summary p {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: #64748b;
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
		color: #1e293b;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.clear-filters-btn {
		background: #6b7280;
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
		background: #4b5563;
	}

	/* Filters */
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		background: white;
		padding: 2rem;
		border-radius: 16px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(99, 102, 241, 0.1);
	}

	.search-group,
	.filter-group {
		display: flex;
		flex-direction: column;
	}

	.search-group label,
	.filter-group label {
		margin-bottom: 0.5rem;
		color: #374151;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.search-group input,
	.filter-group select {
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		background: white;
	}

	.search-group input:focus,
	.filter-group select:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.filter-group input[type="date"] {
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		background: white;
	}

	.filter-group input[type="date"]:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.date-presets {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.date-presets .presets-label {
		color: #374151;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.preset-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.preset-btn {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 12px;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.preset-btn:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
		transform: translateY(-1px);
	}

	.preset-btn:active {
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		color: white;
		border-color: #6366f1;
		transform: translateY(0);
	}

	/* Transactions Table */
	.transactions-table {
		background: white;
		border-radius: 16px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		border: 1px solid rgba(99, 102, 241, 0.1);
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1fr 1fr auto;
		gap: 1.5rem;
		padding: 1.5rem 2rem;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border-bottom: 1px solid #e2e8f0;
		font-weight: 700;
		color: #374151;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-body {
		max-height: 600px;
		overflow-y: auto;
	}

	.table-row {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1fr 1fr auto;
		gap: 1.5rem;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #f1f5f9;
		transition: all 0.2s ease;
		align-items: center;
	}

	.table-row:hover {
		background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
		transform: translateX(4px);
		box-shadow: inset 4px 0 0 #6366f1;
	}

	.table-row.income {
		border-left: 4px solid #10b981;
		background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
	}

	.table-row.expense {
		border-left: 4px solid #ef4444;
		background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%);
	}

	.col-description {
		font-weight: 600;
		color: #1e293b;
	}

	.category-tag {
		background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
		color: #64748b;
		padding: 0.5rem 1rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid rgba(100, 116, 139, 0.2);
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

	.delete-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s;
		font-size: 1rem;
	}

	.delete-btn:hover:not(:disabled) {
		background: #fee2e2;
	}

	.delete-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.no-results {
		text-align: center;
		padding: 3rem 1rem;
		color: #64748b;
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
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		max-width: 500px;
		width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 1.5rem 0 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		margin-bottom: 1.5rem;
	}

	.modal-header h3 {
		margin: 0;
		color: #1e293b;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #64748b;
		padding: 0;
		line-height: 1;
	}

	.modal-close:hover {
		color: #374151;
	}

	.modal-body {
		padding: 0 1.5rem;
	}

	.modal-description {
		margin: 0 0 1.5rem 0;
		color: #64748b;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: #374151;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 80px;
	}

	.current-info {
		background: #f8fafc;
		padding: 1rem;
		border-radius: 6px;
		margin-top: 1rem;
	}

	.current-info p {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: #64748b;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e2e8f0;
		margin-top: 1.5rem;
	}

	.btn-primary {
		background: #2563eb;
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
		background: #1d4ed8;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.btn-danger {
		background: #ef4444;
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
		background: #dc2626;
	}

	/* Responsive Design */
	@media (max-width: 1024px) {
		.table-header,
		.table-row {
			grid-template-columns: 1fr 2fr 1fr 1fr;
		}
		
		.col-type,
		.col-actions {
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

		.col-date::before { content: "Date: "; font-weight: 600; }
		.col-description::before { content: "Description: "; font-weight: 600; }
		.col-category::before { content: "Category: "; font-weight: 600; }
		.col-amount::before { content: "Amount: "; font-weight: 600; }
	}
</style>
