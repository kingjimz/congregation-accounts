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
	let chartType = $state<'bar' | 'line'>('line');

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

	// Process income data - return individual transactions split by category
	function processIncomeData(transactions: Transaction[]) {
		const incomeTransactions = transactions
			.filter(t => t.type === 'income')
			.sort((a, b) => a.date.localeCompare(b.date));
		
		return {
			lce: incomeTransactions.filter(t => isLocalCategory(t.category)),
			www: incomeTransactions.filter(t => isWorldwideCategory(t.category))
		};
	}

	// Process expense data - return individual transactions split by category
	function processExpenseData(transactions: Transaction[]) {
		const expenseTransactions = transactions
			.filter(t => t.type === 'expense')
			.sort((a, b) => a.date.localeCompare(b.date));
		
		return {
			lce: expenseTransactions.filter(t => isLocalCategory(t.category)),
			www: expenseTransactions.filter(t => isWorldwideCategory(t.category))
		};
	}

	// Get all unique dates from transactions and create aligned data arrays
	function createAlignedData(lceTransactions: Transaction[], wwwTransactions: Transaction[]) {
		// Get all unique dates
		const allDates = new Set<string>();
		lceTransactions.forEach(t => allDates.add(t.date));
		wwwTransactions.forEach(t => allDates.add(t.date));
		const sortedDates = Array.from(allDates).sort();
		
		// Create maps for quick lookup
		const lceMap = new Map<string, Transaction[]>();
		const wwwMap = new Map<string, Transaction[]>();
		
		lceTransactions.forEach(t => {
			if (!lceMap.has(t.date)) {
				lceMap.set(t.date, []);
			}
			lceMap.get(t.date)!.push(t);
		});
		
		wwwTransactions.forEach(t => {
			if (!wwwMap.has(t.date)) {
				wwwMap.set(t.date, []);
			}
			wwwMap.get(t.date)!.push(t);
		});
		
		// Create aligned arrays
		const labels = sortedDates.map(dateStr => {
			const date = new Date(dateStr);
			return `${date.getMonth() + 1}/${date.getDate()}`;
		});
		
		const lceData = sortedDates.map(dateStr => {
			const transactions = lceMap.get(dateStr) || [];
			return transactions.reduce((sum, t) => sum + t.amount, 0);
		});
		
		const wwwData = sortedDates.map(dateStr => {
			const transactions = wwwMap.get(dateStr) || [];
			return transactions.reduce((sum, t) => sum + t.amount, 0);
		});
		
		const tooltips = sortedDates.map(dateStr => {
			const lce = lceMap.get(dateStr) || [];
			const www = wwwMap.get(dateStr) || [];
			const all = [...lce, ...www];
			if (all.length === 1) {
				return `${dateStr} - ${all[0].description}`;
			}
			return `${dateStr} - ${all.length} transactions`;
		});
		
		return { labels, lceData, wwwData, tooltips };
	}

	// Create or update income chart
	function updateIncomeChart() {
		if (!incomeCanvasRef) return;

		const { lce, www } = processIncomeData(transactions);
		const { labels, lceData, wwwData, tooltips } = createAlignedData(lce, www);

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
						data: lceData,
						backgroundColor: chartType === 'bar' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.2)',
						borderColor: 'rgba(34, 197, 94, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					},
					{
						label: 'WWW',
						data: wwwData,
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

		const { lce, www } = processExpenseData(transactions);
		const { labels, lceData, wwwData, tooltips } = createAlignedData(lce, www);

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
						data: lceData,
						backgroundColor: chartType === 'bar' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.2)',
						borderColor: 'rgba(239, 68, 68, 1)',
						borderWidth: chartType === 'bar' ? 1 : 2,
						tension: 0.4,
						fill: chartType === 'line'
					},
					{
						label: 'WWW',
						data: wwwData,
						backgroundColor: chartType === 'bar' ? 'rgba(251, 146, 60, 0.7)' : 'rgba(251, 146, 60, 0.2)',
						borderColor: 'rgba(251, 146, 60, 1)',
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
			onclick={() => chartType = 'line'}
			class="px-4 py-2 rounded-lg font-medium transition-all duration-200 {chartType === 'line' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}"
			style="{chartType === 'line' ? '' : 'background: var(--color-bg-secondary); color: var(--color-text-primary);'}"
		>
			<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
			</svg>
			Line
		</button>
		<button
			onclick={() => chartType = 'bar'}
			class="px-4 py-2 rounded-lg font-medium transition-all duration-200 {chartType === 'bar' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}"
			style="{chartType === 'bar' ? '' : 'background: var(--color-bg-secondary); color: var(--color-text-primary);'}"
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
