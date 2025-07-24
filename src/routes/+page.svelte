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

	// Date selector for monthly view - intelligently set to most recent month with data
	let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format (fallback)

	// Update selectedMonth to the most recent month with data when stores are loaded
	$: if ($transactions.length > 0 || $openingBalances.length > 0) {
		const allMonths = [...new Set([
			...$transactions.map(t => t.date.slice(0, 7)),
			...$openingBalances.map(ob => ob.month)
		])].sort().reverse();
		
		if (allMonths.length > 0 && !allMonths.includes(selectedMonth)) {
			selectedMonth = allMonths[0]; // Set to most recent month with data
		}
	}

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

	// Get all available months from transactions and opening balances for the dropdown
	$: availableMonths = [...new Set([
		...$transactions.map(t => t.date.slice(0, 7)),
		...$openingBalances.map(ob => ob.month),
		selectedMonth // Always include the currently selected month
	])]
		.sort()
		.reverse(); // Most recent first

	// Recent transactions for the selected month
	$: recentMonthlyTransactions = monthlyTransactions
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 5);

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
				date: getTodayLocalDate(),
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

	function formatCategoryName(category: string): string {
		// Create shortcuts for long category names
		const categoryShortcuts = {
			'Local Congregation Donations': 'Local Donations',
			'Worldwide Work Donations': 'Worldwide Donations',
			'Local Congregation Expenses': 'Local Expenses',
			'Worldwide Work Expenses': 'Worldwide Expenses'
		};
		
		return categoryShortcuts[category] || category;
	}

	function getTodayLocalDate(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	async function setOpeningBalance() {
		if (newOpeningBalance < 0) {
			alert('Starting balance cannot be negative');
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
			
			console.log('Starting balance set successfully');
		} catch (err) {
			console.error('Failed to set starting balance:', err);
			alert('Failed to set starting balance. Please try again.');
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
Starting Balance: ${formatCurrency(openingBalanceAmount)}
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

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
	<!-- Error Message -->
	{#if $error}
		<div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
			<p class="text-red-800 font-medium flex items-center">
				<span class="text-xl mr-2">⚠️</span>
				{$error}
			</p>
			<button 
				on:click={() => transactionStore.clearError()}
				class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
			>
				Dismiss
			</button>
		</div>
	{/if}

	<!-- Loading Indicator -->
	{#if $loading}
		<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
			<p class="text-indigo-900 font-medium text-center flex items-center justify-center">
				<span class="text-2xl mr-3 animate-spin">🔄</span>
				Loading transactions...
			</p>
		</div>
	{/if}

	<!-- Month Selector -->
	<section class="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div class="flex flex-col sm:flex-row sm:items-center gap-4">
				<label for="month-select" class="text-gray-800 font-semibold text-lg">Select Month:</label>
				<select 
					id="month-select" 
					bind:value={selectedMonth}
					class="px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 min-w-48 shadow-sm"
				>
					{#each availableMonths as month}
						<option value={month}>{formatMonthYear(month)}</option>
					{/each}
					{#if availableMonths.length === 0}
						<option value={selectedMonth}>{formatMonthYear(selectedMonth)}</option>
					{/if}
				</select>
			</div>
			<div>
				<h2 class="text-xl font-bold flex items-center">
					<svg class="w-8 h-8 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
					</svg>
					<span class="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
						{formatMonthYear(selectedMonth)} Report
					</span>
				</h2>
			</div>
		</div>
	</section>

	<!-- Starting Balance Section -->
	<section class="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
			<div class="flex-1">
				<h3 class="text-xl font-bold text-gray-900 mb-3 flex items-center">
					<span class="text-3xl mr-3">💰</span>
					Starting Balance
				</h3>
				<p class="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
					{formatCurrency(openingBalanceAmount)}
				</p>
				{#if currentOpeningBalance?.note}
					<p class="text-sm text-gray-600 italic bg-gray-50 px-3 py-1 rounded-lg inline-block">
						{currentOpeningBalance.note}
					</p>
				{/if}
			</div>
			
			{#if !currentOpeningBalance}
				<button 
					class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
					on:click={() => showOpeningBalanceForm = true}
				>
					Set Starting Balance
				</button>
			{:else}
				<button 
					class="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
					on:click={() => showOpeningBalanceForm = true}
				>
					Update Starting Balance
				</button>
			{/if}
		</div>

		{#if shouldSetupNextMonth}
			<div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
				<p class="text-indigo-900 font-medium mb-3 flex items-center">
					<span class="text-xl mr-2">💡</span>
					Ready to setup {formatMonthYear(nextMonth)}?
				</p>
				<button 
					class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
					on:click={setupNextMonthBalance}
				>
					Forward Balance to {formatMonthYear(nextMonth)} ({formatCurrency(monthlyBalance)})
				</button>
			</div>
		{/if}

		{#if showOpeningBalanceForm}
			<div class="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 mt-4 shadow-inner">
				<h4 class="text-lg font-semibold text-gray-900 mb-4">
					{currentOpeningBalance ? 'Update' : 'Set'} Starting Balance for {formatMonthYear(selectedMonth)}
				</h4>
				<form on:submit|preventDefault={setOpeningBalance} class="space-y-4">
					<div>
						<label for="opening-balance" class="block text-sm font-medium text-gray-700 mb-2">
							Start of month balance
						</label>
						<input
							id="opening-balance"
							type="number"
							step="0.01"
							min="0"
							bind:value={newOpeningBalance}
							placeholder="0.00"
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
						/>
					</div>
					<div>
						<label for="balance-note" class="block text-sm font-medium text-gray-700 mb-2">
							Note (Optional)
						</label>
						<input
							id="balance-note"
							type="text"
							bind:value={openingBalanceNote}
							placeholder="e.g., Initial balance, Forwarded from previous month"
							class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
						/>
					</div>
					<div class="flex flex-col sm:flex-row gap-3">
						<button 
							type="submit" 
							class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							Save Balance
						</button>
						<button 
							type="button" 
							class="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
							on:click={() => showOpeningBalanceForm = false}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}
	</section>

	<!-- Monthly Summary Cards -->
	<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
			<div class="flex items-center">
				<div class="text-4xl mr-4">🏦</div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Starting Balance</h3>
					<p class="text-2xl font-bold text-gray-900">{formatCurrency(openingBalanceAmount)}</p>
				</div>
			</div>
		</div>

		<div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-white">
			<div class="flex items-center">
				<div class="text-4xl mr-4">💰</div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-green-100 uppercase tracking-wide mb-1">Monthly Income</h3>
					<p class="text-2xl font-bold">{formatCurrency(monthlyIncome)}</p>
				</div>
			</div>
		</div>

		<div class="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-white">
			<div class="flex items-center">
				<div class="text-4xl mr-4">💸</div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-red-100 uppercase tracking-wide mb-1">Monthly Expenses</h3>
					<p class="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</p>
				</div>
			</div>
		</div>

		<div class="bg-gradient-to-br {monthlyBalance >= 0 ? 'from-indigo-500 to-purple-600' : 'from-orange-500 to-red-600'} rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-white">
			<div class="flex items-center">
				<div class="text-4xl mr-4">{monthlyBalance >= 0 ? '📈' : '📉'}</div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold {monthlyBalance >= 0 ? 'text-indigo-100' : 'text-orange-100'} uppercase tracking-wide mb-1">Month End Balance</h3>
					<p class="text-2xl font-bold">{formatCurrency(monthlyBalance)}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Quick Transaction Entry -->
	<section class="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
			<span class="text-3xl mr-3">✨</span>
			Add New Transaction
		</h2>
		<form on:submit|preventDefault={addTransaction} class="space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label for="description" class="block text-sm font-semibold text-gray-700 mb-2">
						Description
					</label>
					<input
						id="description"
						type="text"
						bind:value={newTransaction.description}
						placeholder="Enter transaction description"
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
					/>
				</div>

				<div>
					<label for="category" class="block text-sm font-semibold text-gray-700 mb-2">
						Category
					</label>
					<select 
						id="category" 
						bind:value={newTransaction.category} 
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
					>
						<option value="">Select category</option>
						{#each availableCategories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label for="amount" class="block text-sm font-semibold text-gray-700 mb-2">
						Amount
					</label>
					<input
						id="amount"
						type="number"
						step="0.01"
						min="0"
						bind:value={newTransaction.amount}
						placeholder="0.00"
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
					/>
				</div>

				<div>
					<label for="type" class="block text-sm font-semibold text-gray-700 mb-2">
						Type
					</label>
					<select 
						id="type" 
						bind:value={newTransaction.type}
						class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
					>
						<option value="income">💰 Income</option>
						<option value="expense">💸 Expense</option>
					</select>
				</div>
			</div>

			<button 
				type="submit" 
				disabled={submitting || $loading}
				class="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
			>
				{submitting ? '✨ Adding...' : '➕ Add Transaction'}
			</button>
		</form>
	</section>

	<!-- Monthly Transactions -->
	<section class="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
			<h2 class="text-2xl font-bold text-gray-900 flex items-center">
				<span class="text-3xl mr-3">📊</span>
				Transactions for {formatMonthYear(selectedMonth)}
			</h2>
			<button 
				class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
				on:click={generateMonthlyReport}
			>
				📋 Generate Report
			</button>
		</div>

		<div class="space-y-3">
			{#each recentMonthlyTransactions as transaction (transaction.id)}
				<div class="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md {transaction.type === 'income' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}">
					<div class="flex-1">
						<div class="font-semibold text-gray-900 mb-1">{transaction.description}</div>
						<div class="flex flex-wrap items-center gap-3 text-sm text-gray-600">
							<span class="bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-1 rounded-full font-medium">
								{formatCategoryName(transaction.category)}
							</span>
							<span class="flex items-center">
								<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
								</svg>
								{formatDate(transaction.date)}
							</span>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="text-lg font-bold {transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
							{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
						</div>
						<button 
							class="bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transform hover:-translate-y-0.5"
							on:click={() => deleteTransactionById(transaction.id!)}
							title="Delete transaction"
							disabled={$loading}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
							</svg>
						</button>
					</div>
				</div>
			{/each}

			{#if monthlyTransactions.length === 0 && !$loading}
				<div class="text-center py-16 text-gray-500">
					<div class="text-8xl mb-6">📝</div>
					<p class="text-xl font-semibold mb-3 text-gray-700">No transactions found for {formatMonthYear(selectedMonth)}</p>
					<p class="text-gray-600">Add your first transaction using the form above!</p>
				</div>
			{/if}
		</div>

		{#if monthlyTransactions.length > 5}
			<div class="text-center mt-6 pt-6 border-t border-gray-200">
				<a 
					href="/transactions" 
					class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
				>
					📋 View All Transactions ({monthlyTransactions.length} total)
				</a>
			</div>
		{:else if monthlyTransactions.length > 0}
			<div class="text-center mt-6 pt-6 border-t border-gray-200">
				<p class="text-sm text-gray-500 italic bg-gray-50 px-4 py-2 rounded-lg inline-block">
					Showing all {monthlyTransactions.length} transaction{monthlyTransactions.length === 1 ? '' : 's'} for this month
				</p>
			</div>
		{/if}
	</section>
</div>

<style>
	/* Custom animations and utilities for enhanced UX */
	@keyframes fadeIn {
		from { 
			opacity: 0; 
			transform: translateY(20px); 
		}
		to { 
			opacity: 1; 
			transform: translateY(0); 
		}
	}
	
	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	
	@keyframes pulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}
	
	.animate-fade-in {
		animation: fadeIn 0.5s ease-out;
	}
	
	.animate-slide-up {
		animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	.animate-pulse-subtle {
		animation: pulse 2s infinite;
	}

	/* Glassmorphism effect enhancements */
	.glass-effect {
		background: rgba(255, 255, 255, 0.85);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	/* Custom gradient background */
	.gradient-bg {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
</style>
