<script lang="ts">
	// Transaction interface
	interface Transaction {
		id: string;
		date: string;
		description: string;
		category: string;
		amount: number;
		type: 'income' | 'expense';
	}

	// Sample data - in a real app, this would come from a database
	let transactions: Transaction[] = [
		{
			id: '1',
			date: '2025-07-20',
			description: 'Monthly Worldwide Work Contribution',
			category: 'Worldwide Work Donations',
			amount: 250.00,
			type: 'income'
		},
		{
			id: '2',
			date: '2025-07-19',
			description: 'Sent to Worldwide Work',
			category: 'Worldwide Work Expenses',
			amount: 200.00,
			type: 'expense'
		},
		{
			id: '3',
			date: '2025-07-18',
			description: 'Kingdom Hall Maintenance',
			category: 'Local Congregation Expenses',
			amount: 125.50,
			type: 'expense'
		},
		{
			id: '4',
			date: '2025-07-15',
			description: 'Literature Contribution',
			category: 'Literature Contributions',
			amount: 75.00,
			type: 'income'
		},
		{
			id: '5',
			date: '2025-07-14',
			description: 'Local Congregation Donation',
			category: 'Local Congregation Donations',
			amount: 180.00,
			type: 'income'
		},
		{
			id: '6',
			date: '2025-07-12',
			description: 'Utilities - Electric',
			category: 'Local Congregation Expenses',
			amount: 89.25,
			type: 'expense'
		},
		{
			id: '7',
			date: '2025-07-10',
			description: 'Assembly Hall Contribution',
			category: 'Assembly Hall Contributions',
			amount: 180.00,
			type: 'income'
		},
		{
			id: '8',
			date: '2025-07-08',
			description: 'Cleaning Supplies',
			category: 'Local Congregation Expenses',
			amount: 45.75,
			type: 'expense'
		},
		{
			id: '9',
			date: '2025-07-05',
			description: 'Internet Service',
			category: 'Local Congregation Expenses',
			amount: 65.00,
			type: 'expense'
		},
		{
			id: '10',
			date: '2025-07-03',
			description: 'Local Contribution',
			category: 'Local Congregation Donations',
			amount: 120.00,
			type: 'income'
		}
	];

	// Filter and search state
	let searchTerm = '';
	let filterType: 'all' | 'income' | 'expense' = 'all';
	let filterCategory = '';
	let sortBy: 'date' | 'amount' | 'description' = 'date';
	let sortOrder: 'asc' | 'desc' = 'desc';

	// Get unique categories
	$: categories = [...new Set(transactions.map(t => t.category))].sort();

	// Filtered and sorted transactions
	$: filteredTransactions = transactions
		.filter(t => {
			const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
								 t.category.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesType = filterType === 'all' || t.type === filterType;
			const matchesCategory = !filterCategory || t.category === filterCategory;
			
			return matchesSearch && matchesType && matchesCategory;
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

	// Summary calculations
	$: filteredIncome = filteredTransactions
		.filter(t => t.type === 'income')
		.reduce((sum, t) => sum + t.amount, 0);
		
	$: filteredExpenses = filteredTransactions
		.filter(t => t.type === 'expense')
		.reduce((sum, t) => sum + t.amount, 0);

	// Worldwide Work vs Local breakdown for filtered transactions
	$: filteredWorldwideWorkIncome = filteredTransactions
		.filter(t => t.type === 'income' && t.category.includes('Worldwide Work'))
		.reduce((sum, t) => sum + t.amount, 0);
		
	$: filteredWorldwideWorkExpenses = filteredTransactions
		.filter(t => t.type === 'expense' && t.category.includes('Worldwide Work'))
		.reduce((sum, t) => sum + t.amount, 0);

	$: filteredLocalIncome = filteredTransactions
		.filter(t => t.type === 'income' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
		.reduce((sum, t) => sum + t.amount, 0);
		
	$: filteredLocalExpenses = filteredTransactions
		.filter(t => t.type === 'expense' && (t.category.includes('Local Congregation') || !t.category.includes('Worldwide Work')))
		.reduce((sum, t) => sum + t.amount, 0);

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

	function deleteTransaction(id: string) {
		if (confirm('Are you sure you want to delete this transaction?')) {
			transactions = transactions.filter(t => t.id !== id);
		}
	}

	function exportTransactions() {
		const csvContent = [
			['Date', 'Description', 'Category', 'Type', 'Amount'],
			...filteredTransactions.map(t => [
				t.date,
				t.description,
				t.category,
				t.type,
				t.amount.toString()
			])
		].map(row => row.join(',')).join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `congregation-transactions-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="transactions-page">
	<div class="page-header">
		<h1>All Transactions</h1>
		<button class="export-btn" on:click={exportTransactions}>
			📊 Export CSV
		</button>
	</div>

	<!-- Summary Stats -->
	<div class="summary-stats">
		<div class="stat-card">
			<h3>Filtered Income</h3>
			<p class="amount income">{formatCurrency(filteredIncome)}</p>
		</div>
		<div class="stat-card">
			<h3>Filtered Expenses</h3>
			<p class="amount expense">{formatCurrency(filteredExpenses)}</p>
		</div>
		<div class="stat-card">
			<h3>Net Amount</h3>
			<p class="amount" class:income={filteredIncome - filteredExpenses >= 0} class:expense={filteredIncome - filteredExpenses < 0}>
				{formatCurrency(filteredIncome - filteredExpenses)}
			</p>
		</div>
		<div class="stat-card">
			<h3>Total Records</h3>
			<p class="count">{filteredTransactions.length}</p>
		</div>
	</div>

	<!-- Detailed Breakdown -->
	<div class="detailed-breakdown">
		<div class="breakdown-card">
			<h3>🌍 Worldwide Work (Filtered)</h3>
			<div class="breakdown-stats">
				<div class="stat-item">
					<span>Donations: {formatCurrency(filteredWorldwideWorkIncome)}</span>
				</div>
				<div class="stat-item">
					<span>Expenses: {formatCurrency(filteredWorldwideWorkExpenses)}</span>
				</div>
				<div class="stat-item total">
					<span>Balance: {formatCurrency(filteredWorldwideWorkIncome - filteredWorldwideWorkExpenses)}</span>
				</div>
			</div>
		</div>
		
		<div class="breakdown-card">
			<h3>🏛️ Local Congregation (Filtered)</h3>
			<div class="breakdown-stats">
				<div class="stat-item">
					<span>Income: {formatCurrency(filteredLocalIncome)}</span>
				</div>
				<div class="stat-item">
					<span>Expenses: {formatCurrency(filteredLocalExpenses)}</span>
				</div>
				<div class="stat-item total">
					<span>Balance: {formatCurrency(filteredLocalIncome - filteredLocalExpenses)}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters and Search -->
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
	</div>

	<!-- Transactions Table -->
	<div class="transactions-table">
		<div class="table-header">
			<div class="col-date">Date</div>
			<div class="col-description">Description</div>
			<div class="col-category">Category</div>
			<div class="col-type">Type</div>
			<div class="col-amount">Amount</div>
			<div class="col-actions">Actions</div>
		</div>

		<div class="table-body">
			{#each filteredTransactions as transaction (transaction.id)}
				<div class="table-row" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
					<div class="col-date">{formatDate(transaction.date)}</div>
					<div class="col-description">{transaction.description}</div>
					<div class="col-category">
						<span class="category-tag">{transaction.category}</span>
					</div>
					<div class="col-type">
						<span class="type-badge" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
							{transaction.type}
						</span>
					</div>
					<div class="col-amount" class:income={transaction.type === 'income'} class:expense={transaction.type === 'expense'}>
						{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
					</div>
					<div class="col-actions">
						<button class="delete-btn" on:click={() => deleteTransaction(transaction.id)}>
							🗑️
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredTransactions.length === 0}
			<div class="no-results">
				<p>No transactions found matching your filters.</p>
				<a href="/" class="back-home-btn">← Back to Dashboard</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.transactions-page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.page-header h1 {
		margin: 0;
		color: #1e293b;
		font-size: 2rem;
		font-weight: 700;
	}

	.export-btn {
		background: #10b981;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.export-btn:hover {
		background: #059669;
	}

	/* Summary Stats */
	.summary-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		text-align: center;
	}

	.stat-card h3 {
		margin: 0 0 0.5rem 0;
		color: #64748b;
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-card .amount {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.stat-card .amount.income {
		color: #10b981;
	}

	.stat-card .amount.expense {
		color: #ef4444;
	}

	.stat-card .count {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #2563eb;
	}

	/* Detailed Breakdown */
	.detailed-breakdown {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.breakdown-card {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.breakdown-card h3 {
		margin: 0 0 1rem 0;
		color: #1e293b;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.breakdown-stats {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.breakdown-stats .stat-item {
		padding: 0.25rem 0;
		font-size: 0.875rem;
		color: #64748b;
	}

	.breakdown-stats .stat-item.total {
		border-top: 1px solid #e2e8f0;
		padding-top: 0.5rem;
		margin-top: 0.5rem;
		font-weight: 600;
		color: #1e293b;
	}

	/* Filters */
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
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
		font-weight: 500;
		font-size: 0.875rem;
	}

	.search-group input,
	.filter-group select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.search-group input:focus,
	.filter-group select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	/* Transactions Table */
	.transactions-table {
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1fr 1fr auto;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
		font-weight: 600;
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
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #f1f5f9;
		transition: background-color 0.2s;
		align-items: center;
	}

	.table-row:hover {
		background: #f9fafb;
	}

	.table-row.income {
		border-left: 4px solid #10b981;
	}

	.table-row.expense {
		border-left: 4px solid #ef4444;
	}

	.col-description {
		font-weight: 500;
		color: #1e293b;
	}

	.category-tag {
		background: #f1f5f9;
		color: #64748b;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
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

	.delete-btn:hover {
		background: #fee2e2;
	}

	.no-results {
		text-align: center;
		padding: 3rem 1rem;
		color: #64748b;
	}

	.back-home-btn {
		color: #2563eb;
		text-decoration: none;
		font-weight: 500;
		margin-top: 1rem;
		display: inline-block;
	}

	.back-home-btn:hover {
		text-decoration: underline;
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

		.summary-stats {
			grid-template-columns: repeat(2, 1fr);
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

	@media (max-width: 480px) {
		.summary-stats {
			grid-template-columns: 1fr;
		}
	}
</style>
