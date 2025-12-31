<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import type { Transaction } from '$lib/types';

	Chart.register(...registerables);

	interface Props {
		transactions: Transaction[];
		month?: string;
		filter?: 'all' | 'income' | 'expense';
	}

	let { transactions, month = 'All', filter = 'all' }: Props = $props();

	let incomeCanvasRef: HTMLCanvasElement;
	let expenseCanvasRef: HTMLCanvasElement;
	let incomeChartInstance: Chart | null = null;
	let expenseChartInstance: Chart | null = null;
	
	// Load chart type from localStorage or default to 'line'
	const getStoredChartType = (): 'bar' | 'line' => {
		if (typeof window === 'undefined') return 'line';
		const stored = localStorage.getItem('chartType');
		return (stored === 'bar' || stored === 'line') ? stored : 'line';
	};
	
	let chartType = $state<'bar' | 'line'>(getStoredChartType());
	
	// Save chart type to localStorage when it changes
	function setChartType(type: 'bar' | 'line') {
		chartType = type;
		if (typeof window !== 'undefined') {
			localStorage.setItem('chartType', type);
		}
	}

	// Format month for display
	function formatMonthForTitle(monthStr: string): string {
		if (monthStr === '' || monthStr === 'All') return 'All Time';

		const [year, month] = monthStr.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		const monthName = date.toLocaleString('default', { month: 'long' });
		return `${monthName} ${year}`;
	}

	// Helper functions for category classification
	function isLocalCategory(category: string): boolean {
		return category.toLowerCase().includes('local congregation');
	}

	function isWorldwideCategory(category: string): boolean {
		return category.toLowerCase().includes('worldwide work');
	}

	// Process income data - separate local congregation and worldwide work donations
	function processIncomeData(transactions: Transaction[]) {
		const incomeTransactions = transactions
			.filter(t => t.type === 'income')
			.sort((a, b) => a.date.localeCompare(b.date));

		const localDonations = incomeTransactions.filter(t => isLocalCategory(t.category));
		const worldwideDonations = incomeTransactions.filter(t => isWorldwideCategory(t.category));

		return {
			local: localDonations,
			worldwide: worldwideDonations,
			all: incomeTransactions
		};
	}

	// Helper functions for expense category classification
	function isResolutionCategory(category: string): boolean {
		return category.toLowerCase().includes('resolution');
	}

	function isKhocCategory(category: string): boolean {
		return category.toLowerCase().includes('khoc');
	}

	// Process expense data - separate local congregation, worldwide work, resolution, and KHOC expenses
	function processExpenseData(transactions: Transaction[]) {
		const expenseTransactions = transactions
			.filter(t => t.type === 'expense')
			.sort((a, b) => a.date.localeCompare(b.date));

		const localExpenses = expenseTransactions.filter(t => isLocalCategory(t.category));
		const worldwideExpenses = expenseTransactions.filter(t => isWorldwideCategory(t.category));
		const resolutionExpenses = expenseTransactions.filter(t => isResolutionCategory(t.category));
		const khocExpenses = expenseTransactions.filter(t => isKhocCategory(t.category));

		return {
			local: localExpenses,
			worldwide: worldwideExpenses,
			resolution: resolutionExpenses,
			khoc: khocExpenses,
			all: expenseTransactions
		};
	}

	// Create or update income chart
	function updateIncomeChart() {
		if (!incomeCanvasRef) return;

		const incomeData = processIncomeData(transactions);
		
		// Get all unique dates from both local and worldwide donations
		const allDates = [...new Set([
			...incomeData.local.map((t: Transaction) => t.date),
			...incomeData.worldwide.map((t: Transaction) => t.date)
		])].sort();

		const labels = allDates.map(date => {
			const d = new Date(date);
			return `${d.getMonth() + 1}/${d.getDate()}`;
		});

		// Create data arrays for each category, filling missing dates with 0
		const localData = allDates.map(date => {
			const transaction = incomeData.local.find(t => t.date === date);
			return transaction ? transaction.amount : 0;
		});

		const worldwideData = allDates.map(date => {
			const transaction = incomeData.worldwide.find(t => t.date === date);
			return transaction ? transaction.amount : 0;
		});

		// Create tooltip labels
		const tooltipLabels = allDates.map(date => {
			const localTransaction = incomeData.local.find(t => t.date === date);
			const worldwideTransaction = incomeData.worldwide.find(t => t.date === date);
			
			// Format date to be shorter (MM/DD)
			const d = new Date(date);
			const shortDate = `${d.getMonth() + 1}/${d.getDate()}`;
			
			let tooltip = shortDate;
			if (localTransaction && worldwideTransaction) {
				tooltip = `${shortDate} - Donations`;
			} else if (localTransaction) {
				tooltip = `${shortDate} - Local`;
			} else if (worldwideTransaction) {
				tooltip = `${shortDate} - Worldwide`;
			}
			return tooltip;
		});

		// Destroy existing chart if it exists
		if (incomeChartInstance) {
			incomeChartInstance.destroy();
		}

		// Create new chart
		const ctx = incomeCanvasRef.getContext('2d');
		if (!ctx) return;

		incomeChartInstance = new Chart(ctx, {
			type: chartType,
			data: {
				labels: labels,
				datasets: [
					{
						label: 'LCE',
						data: localData,
						backgroundColor: chartType === 'bar' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.2)',
						borderColor: 'rgba(34, 197, 94, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					},
					{
						label: 'WWW',
						data: worldwideData,
						backgroundColor: chartType === 'bar' ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.2)',
						borderColor: 'rgba(59, 130, 246, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'top',
						labels: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-text-primary')
								.trim()
						}
					},
					title: {
						display: true,
						text: 'Donations',
						color: getComputedStyle(document.documentElement)
							.getPropertyValue('--color-text-primary')
							.trim()
					},
					tooltip: {
						callbacks: {
							title: function(context: any) {
								return 'Donations';
							}
						}
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-text-secondary')
								.trim()
						},
						grid: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-border-primary')
								.trim()
						}
					},
					x: {
						ticks: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-text-secondary')
								.trim()
						},
						grid: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-border-primary')
								.trim()
						}
					}
				}
			}
		});
	}

	// Create or update expense chart
	function updateExpenseChart() {
		if (!expenseCanvasRef) return;

		const expenseData = processExpenseData(transactions);
		
		// Get all unique dates from all expense categories
		const allDates = [...new Set([
			...expenseData.local.map((t: Transaction) => t.date),
			...expenseData.worldwide.map((t: Transaction) => t.date),
			...expenseData.resolution.map((t: Transaction) => t.date),
			...expenseData.khoc.map((t: Transaction) => t.date)
		])].sort();

		const labels = allDates.map(date => {
			const d = new Date(date);
			return `${d.getMonth() + 1}/${d.getDate()}`;
		});

		// Create data arrays for each category, filling missing dates with 0
		const localData = allDates.map(date => {
			const transaction = expenseData.local.find(t => t.date === date);
			return transaction ? transaction.amount : 0;
		});

		const worldwideData = allDates.map(date => {
			const transaction = expenseData.worldwide.find(t => t.date === date);
			return transaction ? transaction.amount : 0;
		});

		const resolutionData = allDates.map(date => {
			const transaction = expenseData.resolution.find(t => t.date === date);
			return transaction ? transaction.amount : 0;
		});

		const khocData = allDates.map(date => {
			const transaction = expenseData.khoc.find(t => t.date === date);
			return transaction ? transaction.amount : 0;
		});

		// Create tooltip labels
		const tooltipLabels = allDates.map(date => {
			const localTransaction = expenseData.local.find(t => t.date === date);
			const worldwideTransaction = expenseData.worldwide.find(t => t.date === date);
			const resolutionTransaction = expenseData.resolution.find(t => t.date === date);
			const khocTransaction = expenseData.khoc.find(t => t.date === date);
			
			// Format date to be shorter (MM/DD)
			const d = new Date(date);
			const shortDate = `${d.getMonth() + 1}/${d.getDate()}`;
			
			let tooltip = shortDate;
			const categories = [];
			if (localTransaction) categories.push('Local');
			if (worldwideTransaction) categories.push('Worldwide');
			if (resolutionTransaction) categories.push('Resolution');
			if (khocTransaction) categories.push('KHOC');
			
			if (categories.length > 0) {
				tooltip = `${shortDate} - ${categories.join(', ')}`;
			}
			return tooltip;
		});

		// Destroy existing chart if it exists
		if (expenseChartInstance) {
			expenseChartInstance.destroy();
		}

		// Create new chart
		const ctx = expenseCanvasRef.getContext('2d');
		if (!ctx) return;

		expenseChartInstance = new Chart(ctx, {
			type: chartType,
			data: {
				labels: labels,
				datasets: [
					{
						label: 'LCE',
						data: localData,
						backgroundColor: chartType === 'bar' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.2)',
						borderColor: 'rgba(239, 68, 68, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					},
					{
						label: 'WWW',
						data: worldwideData,
						backgroundColor: chartType === 'bar' ? 'rgba(168, 85, 247, 0.7)' : 'rgba(168, 85, 247, 0.2)',
						borderColor: 'rgba(168, 85, 247, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					},
					{
						label: 'Resolution',
						data: resolutionData,
						backgroundColor: chartType === 'bar' ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.2)',
						borderColor: 'rgba(245, 158, 11, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					},
					{
						label: 'KHOC',
						data: khocData,
						backgroundColor: chartType === 'bar' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.2)',
						borderColor: 'rgba(34, 197, 94, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'top',
						labels: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-text-primary')
								.trim()
						}
					},
					title: {
						display: true,
						text: 'Expenses',
						color: getComputedStyle(document.documentElement)
							.getPropertyValue('--color-text-primary')
							.trim()
					},
					tooltip: {
						callbacks: {
							title: function(context: any) {
								return 'Expenses';
							}
						}
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-text-secondary')
								.trim()
						},
						grid: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-border-primary')
								.trim()
						}
					},
					x: {
						ticks: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-text-secondary')
								.trim()
						},
						grid: {
							color: getComputedStyle(document.documentElement)
								.getPropertyValue('--color-border-primary')
								.trim()
						}
					}
				}
			}
		});
	}

	// Update charts when transactions or chart type change
	$effect(() => {
		transactions;
		month;
		chartType;
		if (incomeCanvasRef && expenseCanvasRef) {
			updateIncomeChart();
			updateExpenseChart();
		}
	});

	onMount(() => {
		updateIncomeChart();
		updateExpenseChart();
	});

	onDestroy(() => {
		if (incomeChartInstance) {
			incomeChartInstance.destroy();
		}
		if (expenseChartInstance) {
			expenseChartInstance.destroy();
		}
	});
</script>

<div class="w-full h-full space-y-2">
	<!-- Chart Type Switcher -->
	<div class="flex justify-end gap-2 pb-1">
		<button
			onclick={() => setChartType('line')}
			class="filter-tab {chartType === 'line' ? 'filter-tab-active' : ''}"
		>
			<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
			</svg>
			Line
		</button>
		<button
			onclick={() => setChartType('bar')}
			class="filter-tab {chartType === 'bar' ? 'filter-tab-active' : ''}"
		>
			<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			Bar
		</button>
	</div>

	<!-- Split Charts -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full" style="height: calc(100% - 3rem);">
		<!-- Income Chart -->
		<div class="w-full h-full">
			<canvas bind:this={incomeCanvasRef}></canvas>
		</div>

		<!-- Expense Chart -->
		<div class="w-full h-full">
			<canvas bind:this={expenseCanvasRef}></canvas>
		</div>
	</div>
</div>

<style>
	.filter-tab {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: all 0.2s ease;
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		cursor: pointer;
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.filter-tab:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-primary);
	}

	.filter-tab-active {
		background: #4f46e5 !important;
		color: white !important;
		border-color: #4f46e5 !important;
		font-weight: 600;
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
	}

	.filter-tab-active:hover {
		background: #4338ca !important;
		border-color: #4338ca !important;
	}
</style>
