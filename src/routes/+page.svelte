<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions, loading, error, transactionStore } from '$lib/stores/transactions';
	import { openingBalances, openingBalanceStore } from '$lib/stores/opening-balances';
	import type { Transaction } from '$lib/firestore';

	// Reactive variable to track if data is being submitted
	let submitting = false;

	// Form state for new transactions
	let newTransaction = {
		description: '',
		category: '',
		amount: 0,
		type: 'income' as 'income' | 'expense'
	};

	// Date selector for monthly view
	let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

	// Opening balance management
	let showOpeningBalanceForm = false;
	let newOpeningBalance = 0;
	let openingBalanceNote = '';

	// Categories organized by type and purpose
	const incomeCategories = [
		'Worldwide Work Donations',
		'Local Congregation Donations',
		'Other Income'
	];

	const expenseCategories = [
		'Worldwide Work Expenses',
		'Local Congregation Expenses', 
		'Other Expenses'
	];

	// Test Firebase connection on component mount
	onMount(async () => {
		console.log('Main dashboard loaded for authenticated user');
		// Load transactions and opening balances from Firestore
		await Promise.all([
			transactionStore.loadTransactions(),
			openingBalanceStore.loadOpeningBalances()
		]);
	});

	// Get categories based on selected type
	$: availableCategories = newTransaction.type === 'income' ? incomeCategories : expenseCategories;

	// Reset category when type changes
	$: if (newTransaction.type) {
		if (newTransaction.type === 'income' && !incomeCategories.includes(newTransaction.category)) {
			newTransaction.category = '';
		} else if (newTransaction.type === 'expense' && !expenseCategories.includes(newTransaction.category)) {
			newTransaction.category = '';
		}
	}

	// Monthly calculations based on selected month
	$: monthlyTransactions = $transactions.filter(t => t.date.startsWith(selectedMonth));

	$: monthlyIncome = monthlyTransactions
		.filter(t => t.type === 'income')
		.reduce((sum, t) => sum + t.amount, 0);

	$: monthlyExpenses = monthlyTransactions
		.filter(t => t.type === 'expense')
		.reduce((sum, t) => sum + t.amount, 0);

	// Get opening balance for selected month
	$: currentOpeningBalance = $openingBalances.find(ob => ob.month === selectedMonth);
	$: openingBalanceAmount = currentOpeningBalance?.balance || 0;

	// Calculate end of month balance: Opening Balance + Income - Expenses
	$: monthlyBalance = openingBalanceAmount + monthlyIncome - monthlyExpenses;

	// Get all available months from transactions for the dropdown
	$: availableMonths = [...new Set($transactions.map(t => t.date.slice(0, 7)))]
		.sort()
		.reverse(); // Most recent first

	// Recent transactions for the selected month
	$: recentMonthlyTransactions = monthlyTransactions
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 10);

	// Check if we need to suggest setting up opening balance for next month
	$: nextMonth = getNextMonth(selectedMonth);
	$: nextMonthOpeningBalance = $openingBalances.find(ob => ob.month === nextMonth);
	$: shouldSetupNextMonth = monthlyTransactions.length > 0 && !nextMonthOpeningBalance;

	// Functions
	async function addTransaction() {
		if (!newTransaction.description || !newTransaction.category || newTransaction.amount <= 0) {
			alert('Please fill in all fields with valid values');
			return;
		}

		submitting = true;
		try {
			const transactionData = {
				date: new Date().toISOString().split('T')[0],
				description: newTransaction.description,
				category: newTransaction.category,
				amount: newTransaction.amount,
				type: newTransaction.type
			};

			await transactionStore.addTransaction(transactionData);
			
			// Reset form
			newTransaction = {
				description: '',
				category: '',
				amount: 0,
				type: 'income'
			};

			console.log('Transaction added successfully');
		} catch (err) {
			console.error('Failed to add transaction:', err);
			alert('Failed to add transaction. Please try again.');
		} finally {
			submitting = false;
		}
	}

	async function deleteTransactionById(id: string) {
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

	function formatMonthYear(monthString: string): string {
		const [year, month] = monthString.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		});
	}

	function getNextMonth(monthString: string): string {
		const [year, month] = monthString.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		date.setMonth(date.getMonth() + 1);
		return date.toISOString().slice(0, 7);
	}

	async function setOpeningBalance() {
		if (newOpeningBalance < 0) {
			alert('Opening balance cannot be negative');
			return;
		}

		try {
			await openingBalanceStore.setMonthOpeningBalance(
				selectedMonth, 
				newOpeningBalance, 
				openingBalanceNote || undefined
			);
			
			// Reset form
			newOpeningBalance = 0;
			openingBalanceNote = '';
			showOpeningBalanceForm = false;
			
			console.log('Opening balance set successfully');
		} catch (err) {
			console.error('Failed to set opening balance:', err);
			alert('Failed to set opening balance. Please try again.');
		}
	}

	async function setupNextMonthBalance() {
		const nextMonthStr = getNextMonth(selectedMonth);
		try {
			await openingBalanceStore.setMonthOpeningBalance(
				nextMonthStr, 
				monthlyBalance, 
				`Auto-forwarded from ${formatMonthYear(selectedMonth)}`
			);
			console.log('Next month balance set up successfully');
		} catch (err) {
			console.error('Failed to setup next month balance:', err);
			alert('Failed to setup next month balance. Please try again.');
		}
	}

	function generateMonthlyReport() {
		const monthName = formatMonthYear(selectedMonth);
		
		alert(`
MONTHLY REPORT - ${monthName}

=== MONTHLY BALANCE CALCULATION ===
Opening Balance: ${formatCurrency(openingBalanceAmount)}
Total Income: ${formatCurrency(monthlyIncome)}
Total Expenses: ${formatCurrency(monthlyExpenses)}
End of Month Balance: ${formatCurrency(monthlyBalance)}

=== TRANSACTION COUNT ===
Total Transactions: ${monthlyTransactions.length}
Income Transactions: ${monthlyTransactions.filter(t => t.type === 'income').length}
Expense Transactions: ${monthlyTransactions.filter(t => t.type === 'expense').length}

=== CALCULATION BREAKDOWN ===
${formatCurrency(openingBalanceAmount)} + ${formatCurrency(monthlyIncome)} - ${formatCurrency(monthlyExpenses)} = ${formatCurrency(monthlyBalance)}
		`);
	}
</script>

<div class="dashboard">
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

	<!-- Month Selector -->
	<section class="month-selector">
		<div class="selector-container">
			<label for="month-select">Select Month:</label>
			<select id="month-select" bind:value={selectedMonth}>
				{#each availableMonths as month}
					<option value={month}>{formatMonthYear(month)}</option>
				{/each}
				{#if availableMonths.length === 0}
					<option value={selectedMonth}>{formatMonthYear(selectedMonth)}</option>
				{/if}
			</select>
		</div>
		<div class="selected-month-display">
			<h2>📅 {formatMonthYear(selectedMonth)} Report</h2>
		</div>
	</section>

	<!-- Opening Balance Section -->
	<section class="opening-balance-section">
		<div class="balance-info">
			<div class="current-opening-balance">
				<h3>💰 Opening Balance</h3>
				<p class="balance-amount">{formatCurrency(openingBalanceAmount)}</p>
				{#if currentOpeningBalance?.note}
					<p class="balance-note">{currentOpeningBalance.note}</p>
				{/if}
			</div>
			
			{#if !currentOpeningBalance}
				<button class="set-balance-btn" on:click={() => showOpeningBalanceForm = true}>
					Set Opening Balance
				</button>
			{:else}
				<button class="update-balance-btn" on:click={() => showOpeningBalanceForm = true}>
					Update Opening Balance
				</button>
			{/if}
		</div>

		{#if shouldSetupNextMonth}
			<div class="next-month-setup">
				<p>💡 Ready to setup {formatMonthYear(nextMonth)}?</p>
				<button class="setup-next-btn" on:click={setupNextMonthBalance}>
					Forward Balance to {formatMonthYear(nextMonth)} ({formatCurrency(monthlyBalance)})
				</button>
			</div>
		{/if}

		{#if showOpeningBalanceForm}
			<div class="opening-balance-form">
				<h4>{currentOpeningBalance ? 'Update' : 'Set'} Opening Balance for {formatMonthYear(selectedMonth)}</h4>
				<form on:submit|preventDefault={setOpeningBalance}>
					<div class="form-group">
						<label for="opening-balance">Opening Balance Amount</label>
						<input
							id="opening-balance"
							type="number"
							step="0.01"
							min="0"
							bind:value={newOpeningBalance}
							placeholder="0.00"
							required
						/>
					</div>
					<div class="form-group">
						<label for="balance-note">Note (Optional)</label>
						<input
							id="balance-note"
							type="text"
							bind:value={openingBalanceNote}
							placeholder="e.g., Initial balance, Forwarded from previous month"
						/>
					</div>
					<div class="form-actions">
						<button type="submit" class="save-btn">Save Opening Balance</button>
						<button type="button" class="cancel-btn" on:click={() => showOpeningBalanceForm = false}>Cancel</button>
					</div>
				</form>
			</div>
		{/if}
	</section>

	<!-- Monthly Summary Cards -->
	<section class="summary-cards">
		<div class="card opening-card">
			<div class="card-icon">🏦</div>
			<div class="card-content">
				<h3>Opening Balance</h3>
				<p class="amount">{formatCurrency(openingBalanceAmount)}</p>
			</div>
		</div>

		<div class="card income-card">
			<div class="card-icon">💰</div>
			<div class="card-content">
				<h3>Monthly Income</h3>
				<p class="amount">{formatCurrency(monthlyIncome)}</p>
			</div>
		</div>

		<div class="card expense-card">
			<div class="card-icon">💸</div>
			<div class="card-content">
				<h3>Monthly Expenses</h3>
				<p class="amount">{formatCurrency(monthlyExpenses)}</p>
			</div>
		</div>

		<div class="card balance-card" class:positive={monthlyBalance >= 0} class:negative={monthlyBalance < 0}>
			<div class="card-icon">{monthlyBalance >= 0 ? '📈' : '📉'}</div>
			<div class="card-content">
				<h3>End of Month Balance</h3>
				<p class="amount">{formatCurrency(monthlyBalance)}</p>
			</div>
		</div>
	</section>

	<!-- Quick Transaction Entry -->
	<section class="transaction-form">
		<h2>Add New Transaction</h2>
		<form on:submit|preventDefault={addTransaction}>
			<div class="form-row">
				<div class="form-group">
					<label for="description">Description</label>
					<input
						id="description"
						type="text"
						bind:value={newTransaction.description}
						placeholder="Enter transaction description"
						required
					/>
				</div>

				<div class="form-group">
					<label for="category">Category</label>
					<select id="category" bind:value={newTransaction.category} required>
						<option value="">Select category</option>
						{#each availableCategories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="amount">Amount</label>
					<input
						id="amount"
						type="number"
						step="0.01"
						min="0"
						bind:value={newTransaction.amount}
						placeholder="0.00"
						required
					/>
				</div>

				<div class="form-group">
					<label for="type">Type</label>
					<select id="type" bind:value={newTransaction.type}>
						<option value="income">Income</option>
						<option value="expense">Expense</option>
					</select>
				</div>
			</div>

			<button type="submit" class="add-btn" disabled={submitting || $loading}>
				{submitting ? 'Adding...' : 'Add Transaction'}
			</button>
		</form>
	</section>

	<!-- Monthly Transactions -->
	<section class="recent-transactions">
		<div class="section-header">
			<h2>Transactions for {formatMonthYear(selectedMonth)}</h2>
			<button class="generate-summary-btn" on:click={generateMonthlyReport}>
				Generate Monthly Report
			</button>
		</div>

		<div class="transactions-list">
			{#each recentMonthlyTransactions as transaction (transaction.id)}
				<div class="transaction-item" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
					<div class="transaction-info">
						<div class="transaction-description">{transaction.description}</div>
						<div class="transaction-meta">
							<span class="category">{transaction.category}</span>
							<span class="date">{formatDate(transaction.date)}</span>
						</div>
					</div>
					<div class="transaction-controls">
						<div class="transaction-amount" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
							{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
						</div>
						<button 
							class="delete-btn"
							on:click={() => deleteTransactionById(transaction.id!)}
							title="Delete transaction"
							disabled={$loading}
						>
							🗑️
						</button>
					</div>
				</div>
			{/each}

			{#if monthlyTransactions.length === 0 && !$loading}
				<div class="no-transactions">
					<p>No transactions found for {formatMonthYear(selectedMonth)}.</p>
					<p>Add your first transaction above!</p>
				</div>
			{/if}
		</div>

		{#if monthlyTransactions.length > 10}
			<div class="view-all">
				<a href="/transactions" class="view-all-btn">View All Transactions ({monthlyTransactions.length} total)</a>
			</div>
		{:else if monthlyTransactions.length > 0}
			<div class="transaction-count">
				<p>Showing all {monthlyTransactions.length} transaction{monthlyTransactions.length === 1 ? '' : 's'} for this month</p>
			</div>
		{/if}
	</section>
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		gap: 2rem;
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

	/* Month Selector */
	.month-selector {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.selector-container {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.selector-container label {
		font-weight: 600;
		color: #1e293b;
		font-size: 1rem;
	}

	.selector-container select {
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		background: white;
		color: #1e293b;
		cursor: pointer;
		transition: border-color 0.2s, box-shadow 0.2s;
		min-width: 200px;
	}

	.selector-container select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.selected-month-display h2 {
		margin: 0;
		color: #1e293b;
		font-size: 1.5rem;
		font-weight: 700;
	}

	/* Opening Balance Section */
	.opening-balance-section {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.balance-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.current-opening-balance h3 {
		margin: 0 0 0.5rem 0;
		color: #1e293b;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.balance-amount {
		margin: 0 0 0.25rem 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #2563eb;
	}

	.balance-note {
		margin: 0;
		font-size: 0.875rem;
		color: #64748b;
		font-style: italic;
	}

	.set-balance-btn, .update-balance-btn {
		background: #2563eb;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.set-balance-btn:hover, .update-balance-btn:hover {
		background: #1d4ed8;
	}

	.next-month-setup {
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.next-month-setup p {
		margin: 0 0 0.75rem 0;
		color: #0369a1;
		font-weight: 500;
	}

	.setup-next-btn {
		background: #10b981;
		color: white;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.setup-next-btn:hover {
		background: #059669;
	}

	.opening-balance-form {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 1rem;
	}

	.opening-balance-form h4 {
		margin: 0 0 1rem 0;
		color: #1e293b;
		font-size: 1rem;
		font-weight: 600;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.save-btn {
		background: #10b981;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-btn:hover {
		background: #059669;
	}

	.cancel-btn {
		background: #6b7280;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.cancel-btn:hover {
		background: #4b5563;
	}

	/* Summary Cards */
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.card-icon {
		font-size: 2.5rem;
		min-width: 60px;
		text-align: center;
	}

	.card-content h3 {
		margin: 0 0 0.5rem 0;
		color: #64748b;
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card-content .amount {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
	}

	.income-card {
		border-left: 4px solid #10b981;
	}

	.opening-card {
		border-left: 4px solid #2563eb;
	}

	.expense-card {
		border-left: 4px solid #ef4444;
	}

	.balance-card.positive {
		border-left: 4px solid #10b981;
	}

	.balance-card.negative {
		border-left: 4px solid #ef4444;
	}

	.balance-card.negative .amount {
		color: #ef4444;
	}

	.balance-card.positive .amount {
		color: #10b981;
	}

	/* Transaction Form */
	.transaction-form {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.transaction-form h2 {
		margin: 0 0 1.5rem 0;
		color: #1e293b;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		margin-bottom: 0.5rem;
		color: #374151;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.form-group input,
	.form-group select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.add-btn {
		background: #2563eb;
		color: white;
		padding: 0.75rem 2rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s, transform 0.2s;
		margin-top: 1rem;
	}

	.add-btn:hover:not(:disabled) {
		background: #1d4ed8;
		transform: translateY(-1px);
	}

	.add-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.add-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		transform: none;
	}

	/* Recent Transactions */
	.recent-transactions {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		margin: 0;
		color: #1e293b;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.generate-summary-btn {
		background: #10b981;
		color: white;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.generate-summary-btn:hover {
		background: #059669;
	}

	.transactions-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.transaction-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		transition: border-color 0.2s, background-color 0.2s;
	}

	.transaction-item:hover {
		border-color: #d1d5db;
		background-color: #f9fafb;
	}

	.transaction-item.income {
		border-left: 4px solid #10b981;
	}

	.transaction-item.expense {
		border-left: 4px solid #ef4444;
	}

	.transaction-info {
		flex: 1;
	}

	.transaction-description {
		font-weight: 500;
		color: #1e293b;
		margin-bottom: 0.25rem;
	}

	.transaction-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: #64748b;
	}

	.category {
		background: #f1f5f9;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.transaction-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.transaction-amount {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.transaction-amount.income {
		color: #10b981;
	}

	.transaction-amount.expense {
		color: #ef4444;
	}

	.delete-btn {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
		min-width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-btn:hover:not(:disabled) {
		background: #fee2e2;
		border-color: #fca5a5;
		transform: scale(1.05);
	}

	.delete-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.no-transactions {
		text-align: center;
		padding: 3rem 1rem;
		color: #64748b;
	}

	.view-all {
		text-align: center;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.view-all-btn {
		color: #2563eb;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border: 1px solid #2563eb;
		border-radius: 6px;
		transition: background-color 0.2s, color 0.2s;
	}

	.view-all-btn:hover {
		background: #2563eb;
		color: white;
	}

	.transaction-count {
		text-align: center;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.transaction-count p {
		margin: 0;
		color: #64748b;
		font-size: 0.875rem;
		font-style: italic;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.dashboard {
			gap: 1.5rem;
		}

		.month-selector {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}

		.opening-balance-section {
			padding: 1rem;
		}

		.balance-info {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}

		.form-actions {
			flex-direction: column;
		}

		.selector-container {
			flex-direction: column;
			gap: 0.5rem;
		}

		.selector-container select {
			min-width: auto;
			width: 100%;
		}

		.selected-month-display h2 {
			font-size: 1.25rem;
		}

		.summary-cards {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.transaction-form,
		.recent-transactions {
			padding: 1.5rem;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.section-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.transaction-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.transaction-controls {
			align-self: flex-end;
			width: 100%;
			justify-content: space-between;
		}
	}

	@media (max-width: 480px) {
		.card {
			padding: 1rem;
		}

		.card-content .amount {
			font-size: 1.5rem;
		}

		.transaction-form,
		.recent-transactions {
			padding: 1rem;
		}
	}
</style>
