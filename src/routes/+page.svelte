<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions, loading, error, transactionStore } from '$lib/stores/transactions';
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

	// Categories organized by type and purpose
	const incomeCategories = [
		'Worldwide Work Donations',
		'Local Congregation Donations',
		'Literature Contributions',
		'Assembly Hall Contributions',
		'Other Income'
	];

	const expenseCategories = [
		'Worldwide Work Expenses',
		'Local Congregation Expenses', 
		'Kingdom Hall Maintenance',
		'Utilities',
		'Supplies',
		'Literature Costs',
		'Assembly Expenses',
		'Other Expenses'
	];

	// Test Firebase connection on component mount
	onMount(async () => {
		console.log('Main dashboard loaded for authenticated user');
		// Load transactions from Firestore
		await transactionStore.loadTransactions();
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

	// Computed values for dashboard summary
	$: totalIncome = $transactions
		.filter(t => t.type === 'income')
		.reduce((sum, t) => sum + t.amount, 0);

	$: totalExpenses = $transactions
		.filter(t => t.type === 'expense')
		.reduce((sum, t) => sum + t.amount, 0);

	$: balance = totalIncome - totalExpenses;

	$: recentTransactions = $transactions
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 5);

	// Calculate Worldwide Work and Local Congregation breakdowns
	$: worldwideWorkIncome = $transactions
		.filter(t => t.type === 'income' && t.category.includes('Worldwide Work'))
		.reduce((sum, t) => sum + t.amount, 0);
		
	$: worldwideWorkExpenses = $transactions
		.filter(t => t.type === 'expense' && t.category.includes('Worldwide Work'))
		.reduce((sum, t) => sum + t.amount, 0);

	$: localIncome = $transactions
		.filter(t => t.type === 'income' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
		.reduce((sum, t) => sum + t.amount, 0);
		
	$: localExpenses = $transactions
		.filter(t => t.type === 'expense' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
		.reduce((sum, t) => sum + t.amount, 0);

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
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function generateSummaryReport() {
		// Calculate Worldwide Work totals
		const worldwideWorkIncome = $transactions
			.filter(t => t.type === 'income' && t.category.includes('Worldwide Work'))
			.reduce((sum, t) => sum + t.amount, 0);
			
		const worldwideWorkExpenses = $transactions
			.filter(t => t.type === 'expense' && t.category.includes('Worldwide Work'))
			.reduce((sum, t) => sum + t.amount, 0);

		// Calculate Local Congregation totals
		const localIncome = $transactions
			.filter(t => t.type === 'income' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
			.reduce((sum, t) => sum + t.amount, 0);
			
		const localExpenses = $transactions
			.filter(t => t.type === 'expense' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
			.reduce((sum, t) => sum + t.amount, 0);

		// General breakdown by category
		const incomeByCategory = $transactions
			.filter(t => t.type === 'income')
			.reduce((acc, t) => {
				acc[t.category] = (acc[t.category] || 0) + t.amount;
				return acc;
			}, {} as Record<string, number>);

		const expensesByCategory = $transactions
			.filter(t => t.type === 'expense')
			.reduce((acc, t) => {
				acc[t.category] = (acc[t.category] || 0) + t.amount;
				return acc;
			}, {} as Record<string, number>);

		alert(`
CONGREGATION ACCOUNTS SUMMARY

=== WORLDWIDE WORK ===
Donations Received: ${formatCurrency(worldwideWorkIncome)}
Sent to Worldwide Work: ${formatCurrency(worldwideWorkExpenses)}
Worldwide Work Balance: ${formatCurrency(worldwideWorkIncome - worldwideWorkExpenses)}

=== LOCAL CONGREGATION ===
Local Income: ${formatCurrency(localIncome)}
Local Expenses: ${formatCurrency(localExpenses)}
Local Balance: ${formatCurrency(localIncome - localExpenses)}

=== DETAILED INCOME BY CATEGORY ===
${Object.entries(incomeByCategory)
	.map(([category, amount]) => `${category}: ${formatCurrency(amount)}`)
	.join('\n')}

Total Income: ${formatCurrency(totalIncome)}

=== DETAILED EXPENSES BY CATEGORY ===
${Object.entries(expensesByCategory)
	.map(([category, amount]) => `${category}: ${formatCurrency(amount)}`)
	.join('\n')}

Total Expenses: ${formatCurrency(totalExpenses)}

=== OVERALL SUMMARY ===
Current Balance: ${formatCurrency(balance)}
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
	<!-- Dashboard Summary Cards -->
	<section class="summary-cards">
		<div class="card income-card">
			<div class="card-icon">💰</div>
			<div class="card-content">
				<h3>Total Income</h3>
				<p class="amount">{formatCurrency(totalIncome)}</p>
			</div>
		</div>

		<div class="card expense-card">
			<div class="card-icon">💸</div>
			<div class="card-content">
				<h3>Total Expenses</h3>
				<p class="amount">{formatCurrency(totalExpenses)}</p>
			</div>
		</div>

		<div class="card balance-card" class:positive={balance >= 0} class:negative={balance < 0}>
			<div class="card-icon">{balance >= 0 ? '📈' : '📉'}</div>
			<div class="card-content">
				<h3>Current Balance</h3>
				<p class="amount">{formatCurrency(balance)}</p>
			</div>
		</div>
	</section>

	<!-- Worldwide Work vs Local Breakdown -->
	<section class="breakdown-cards">
		<div class="breakdown-section">
			<h3>🌍 Worldwide Work</h3>
			<div class="breakdown-stats">
				<div class="stat-item">
					<span class="stat-label">Donations Received:</span>
					<span class="stat-value income">{formatCurrency(worldwideWorkIncome)}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Sent to Worldwide Work:</span>
					<span class="stat-value expense">{formatCurrency(worldwideWorkExpenses)}</span>
				</div>
				<div class="stat-item total">
					<span class="stat-label">Worldwide Work Balance:</span>
					<span class="stat-value" class:income={worldwideWorkIncome - worldwideWorkExpenses >= 0} class:expense={worldwideWorkIncome - worldwideWorkExpenses < 0}>
						{formatCurrency(worldwideWorkIncome - worldwideWorkExpenses)}
					</span>
				</div>
			</div>
		</div>

		<div class="breakdown-section">
			<h3>🏛️ Local Congregation</h3>
			<div class="breakdown-stats">
				<div class="stat-item">
					<span class="stat-label">Local Income:</span>
					<span class="stat-value income">{formatCurrency(localIncome)}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Local Expenses:</span>
					<span class="stat-value expense">{formatCurrency(localExpenses)}</span>
				</div>
				<div class="stat-item total">
					<span class="stat-label">Local Balance:</span>
					<span class="stat-value" class:income={localIncome - localExpenses >= 0} class:expense={localIncome - localExpenses < 0}>
						{formatCurrency(localIncome - localExpenses)}
					</span>
				</div>
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

	<!-- Recent Transactions -->
	<section class="recent-transactions">
		<div class="section-header">
			<h2>Recent Transactions</h2>
			<button class="generate-summary-btn" on:click={generateSummaryReport}>
				Generate Summary Report
			</button>
		</div>

		<div class="transactions-list">
			{#each recentTransactions as transaction (transaction.id)}
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

			{#if $transactions.length === 0 && !$loading}
				<div class="no-transactions">
					<p>No transactions yet. Add your first transaction above!</p>
				</div>
			{/if}
		</div>

		{#if $transactions.length > 5}
			<div class="view-all">
				<a href="/transactions" class="view-all-btn">View All Transactions</a>
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

	/* Summary Cards */
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

	/* Breakdown Cards */
	.breakdown-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.breakdown-section {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.breakdown-section h3 {
		margin: 0 0 1rem 0;
		color: #1e293b;
		font-size: 1.125rem;
		font-weight: 600;
		text-align: center;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.breakdown-stats {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.stat-item.total {
		border-top: 1px solid #e2e8f0;
		padding-top: 0.75rem;
		margin-top: 0.5rem;
		font-weight: 600;
	}

	.stat-label {
		color: #64748b;
		font-size: 0.875rem;
	}

	.stat-value {
		font-weight: 600;
		font-size: 1rem;
	}

	.stat-value.income {
		color: #10b981;
	}

	.stat-value.expense {
		color: #ef4444;
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

	/* Responsive Design */
	@media (max-width: 768px) {
		.dashboard {
			gap: 1.5rem;
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
