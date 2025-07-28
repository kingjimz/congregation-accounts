<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { transactions, loading, error, transactionStore } from '$lib/stores/transactions';
	import { openingBalances, openingBalanceStore } from '$lib/stores/opening-balances';
	import { Alert, Button, Modal, Card } from '$lib/components/ui';
	import TransactionForm from '$lib/components/forms/TransactionForm.svelte';
	import TransactionList from '$lib/components/transaction/TransactionList.svelte';
	import MonthlyBalance from '$lib/components/dashboard/MonthlyBalance.svelte';
	import MonthSelector from '$lib/components/dashboard/MonthSelector.svelte';
	import AccountsReport from '$lib/components/AccountsReport.svelte';
	import { TransactionService } from '$lib/services/TransactionService';
	import type { TransactionFormData, Transaction } from '$lib/types';

	// UI state
	let showTransactionForm = $state(false);
	let showOpeningBalanceForm = $state(false);
	let submitting = $state(false);
	let selectedMonth = $state(new Date().toISOString().slice(0, 7)); // Current month as fallback

	// Opening balance form state
	let newOpeningBalance = $state(0);
	let openingBalanceNote = $state('');

	// Load data on mount
	onMount(async () => {
		console.log('Dashboard loaded for authenticated user');
		await Promise.all([
			transactionStore.loadTransactions(),
			openingBalanceStore.loadOpeningBalances()
		]);
	});

	// Get available months and update selected month when data loads
	const availableMonths = $derived(
		TransactionService.getAvailableMonths($transactions, $openingBalances)
	);

	// Auto-select most recent month with data when data loads
	$effect(() => {
		if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
			const mostRecent = TransactionService.getMostRecentMonth($transactions, $openingBalances);
			if (mostRecent) {
				selectedMonth = mostRecent;
			}
		}
	});

	// Get monthly data for selected month
	const monthlyData = $derived(
		TransactionService.getMonthlyData(selectedMonth, $transactions, $openingBalances)
	);

	// Get recent transactions for the selected month
	const recentTransactions = $derived(
		TransactionService.getRecentTransactions(monthlyData.transactions, 5)
	);

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
		} catch (err) {
			console.error('Failed to add transaction:', err);
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
				openingBalanceNote || undefined
			);
			
			// Reset form
			newOpeningBalance = 0;
			openingBalanceNote = '';
			showOpeningBalanceForm = false;
		} catch (err) {
			console.error('Failed to set starting balance:', err);
			alert('Failed to set starting balance. Please try again.');
		}
	}

	function handleDismissError() {
		transactionStore.clearError();
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
				<h1 class="text-2xl font-bold" style="color: var(--color-text-primary);">Financial Dashboard</h1>
				<p style="color: var(--color-text-secondary);">Manage congregation accounts and track financial activities</p>
			</div>
			<div class="flex flex-col sm:flex-row gap-2">
				<Button 
					variant="secondary"
					onclick={() => showOpeningBalanceForm = true}
				>
					Set Starting Balance
				</Button>
				<Button 
					variant="primary"
					onclick={() => showTransactionForm = true}
				>
					Add Transaction
				</Button>
			</div>
		</div>

		<!-- Month Selector -->
		<MonthSelector
			selectedMonth={selectedMonth}
			availableMonths={availableMonths}
			onchange={handleMonthChange}
		/>

		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Monthly Balance Card -->
			<div class="lg:col-span-1">
				<MonthlyBalance
					month={selectedMonth}
					transactions={monthlyData.transactions}
					openingBalance={monthlyData.openingBalance}
				/>

				<!-- PDF Report Generation -->
				<AccountsReport
					month={selectedMonth}
					transactions={monthlyData.transactions}
					openingBalance={monthlyData.openingBalance}
					congregationName="Bolaoen Congregation"
				/>
			</div>

			<!-- Recent Transactions -->
			<div class="lg:col-span-2">
				<TransactionList
					transactions={recentTransactions}
					title="Recent Transactions"
					maxItems={5}
					showActions={false}
				/>
				
				<!-- View All Transactions Button -->
				{#if recentTransactions.length > 0}
					<div class="mt-4 text-center">
						<Button 
							variant="secondary"
							onclick={() => goto('/transactions')}
							class="w-full sm:w-auto"
						>
							📋 View All Transactions
						</Button>
					</div>
				{/if}
			</div>
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
		title="Set Starting Balance"
		size="sm"
		onclose={() => showOpeningBalanceForm = false}
	>
		<div class="space-y-4">
			<div>
				<label for="opening-balance" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
					Starting Balance Amount
				</label>
				<input
					id="opening-balance"
					type="number"
					bind:value={newOpeningBalance}
					min="0"
					step="0.01"
					placeholder="0.00"
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
</div>
