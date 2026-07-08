<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { Card, Button } from '$lib/components/ui';
	import { aggregateMonthlyDonations, forecastDonations, formatCurrency, formatMonthYear } from '$lib/utils';
	import type { Transaction } from '$lib/types';
	import type { ForecastPoint, MonthlyTotal } from '$lib/utils/forecast';

	Chart.register(...registerables);

	const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	interface Props {
		transactions: Transaction[];
	}

	let { transactions }: Props = $props();

	let canvasRef: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	let viewMode = $state<'total' | 'category'>('category');
	let selectedYear = $state<string>(String(new Date().getFullYear()));

	function isLocalCategory(category: string): boolean {
		return category.toLowerCase().includes('local congregation');
	}

	function isWorldwideCategory(category: string): boolean {
		return category.toLowerCase().includes('worldwide work');
	}

	function formatShortMonth(monthStr: string): string {
		const [year, month] = monthStr.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	// Aggregate data
	const totalMonthly = $derived(aggregateMonthlyDonations(transactions));
	const localMonthly = $derived(aggregateMonthlyDonations(transactions, isLocalCategory));
	const worldwideMonthly = $derived(aggregateMonthlyDonations(transactions, isWorldwideCategory));

	// Card forecasts (3 months)
	const totalForecast = $derived(forecastDonations(totalMonthly, 3));
	const localForecast = $derived(forecastDonations(localMonthly, 3));
	const worldwideForecast = $derived(forecastDonations(worldwideMonthly, 3));

	// Chart forecasts (through December)
	const monthsToDecember = 13 - (new Date().getMonth() + 1);
	const totalChartForecast = $derived(forecastDonations(totalMonthly, monthsToDecember));
	const localChartForecast = $derived(forecastDonations(localMonthly, monthsToDecember));
	const worldwideChartForecast = $derived(forecastDonations(worldwideMonthly, monthsToDecember));

	const hasEnoughData = $derived(totalMonthly.length >= 3);

	// Derive available years from historical + chart forecast data
	const availableYears = $derived(() => {
		const years = new Set<string>();
		for (const m of totalMonthly) years.add(m.month.split('-')[0]);
		for (const f of totalChartForecast) years.add(f.month.split('-')[0]);
		return [...years].sort();
	});

	/**
	 * For a given year, returns 12-element arrays (Jan-Dec) of historical and forecast values.
	 */
	function getYearData(
		monthly: MonthlyTotal[],
		forecast: ForecastPoint[],
		year: string
	): { historical: (number | null)[]; forecasted: (number | null)[] } {
		const historical: (number | null)[] = new Array(12).fill(null);
		const forecasted: (number | null)[] = new Array(12).fill(null);

		for (const m of monthly) {
			if (m.month.startsWith(year)) {
				const monthIdx = parseInt(m.month.split('-')[1]) - 1;
				historical[monthIdx] = m.total;
			}
		}

		for (const f of forecast) {
			if (f.month.startsWith(year)) {
				const monthIdx = parseInt(f.month.split('-')[1]) - 1;
				forecasted[monthIdx] = f.predicted;
			}
		}

		return { historical, forecasted };
	}

	function getThemeColor(varName: string): string {
		return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
	}

	function buildTotalChart() {
		const { historical, forecasted } = getYearData(totalMonthly, totalChartForecast, selectedYear);

		// Connect the historical line to the first forecast point
		const lastHistIdx = historical.reduce((last, v, i) => v !== null ? i : last, -1);
		const historicalConnected = [...historical];
		if (lastHistIdx >= 0 && lastHistIdx < 11) {
			const nextForecast = forecasted[lastHistIdx + 1];
			if (nextForecast !== null) {
				historicalConnected[lastHistIdx + 1] = nextForecast;
			}
		}

		return {
			labels: MONTH_LABELS,
			datasets: [
				{
					label: 'Actual',
					data: historicalConnected,
					borderColor: 'rgba(34, 197, 94, 1)',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					borderWidth: 2,
					tension: 0.4,
					fill: true,
					pointRadius: 0,
					pointBackgroundColor: 'rgba(34, 197, 94, 1)',
					spanGaps: false
				},
				{
					label: 'Forecast',
					data: forecasted,
					borderColor: 'rgba(34, 197, 94, 0.6)',
					backgroundColor: 'rgba(34, 197, 94, 0.05)',
					borderWidth: 2,
					borderDash: [6, 4],
					tension: 0.4,
					fill: true,
					pointRadius: 0,
					pointStyle: 'rectRot',
					pointBackgroundColor: 'rgba(34, 197, 94, 0.6)',
					spanGaps: false
				}
			]
		};
	}

	function buildCategoryChart() {
		const local = getYearData(localMonthly, localChartForecast, selectedYear);
		const ww = getYearData(worldwideMonthly, worldwideChartForecast, selectedYear);

		// Connect historical to forecast for both categories
		function connectLines(hist: (number | null)[], fc: (number | null)[]): (number | null)[] {
			const connected = [...hist];
			const lastIdx = hist.reduce((last, v, i) => v !== null ? i : last, -1);
			if (lastIdx >= 0 && lastIdx < 11 && fc[lastIdx + 1] !== null) {
				connected[lastIdx + 1] = fc[lastIdx + 1];
			}
			return connected;
		}

		const localHistConnected = connectLines(local.historical, local.forecasted);
		const wwHistConnected = connectLines(ww.historical, ww.forecasted);

		return {
			labels: MONTH_LABELS,
			datasets: [
				{
					label: 'LCE (Actual)',
					data: localHistConnected,
					borderColor: 'rgba(34, 197, 94, 1)',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					borderWidth: 2,
					tension: 0.4,
					fill: false,
					pointRadius: 0,
					pointBackgroundColor: 'rgba(34, 197, 94, 1)',
					spanGaps: false
				},
				{
					label: 'LCE (Forecast)',
					data: local.forecasted,
					borderColor: 'rgba(34, 197, 94, 0.5)',
					borderWidth: 2,
					borderDash: [6, 4],
					tension: 0.4,
					fill: false,
					pointRadius: 0,
					pointStyle: 'rectRot',
					pointBackgroundColor: 'rgba(34, 197, 94, 0.5)',
					spanGaps: false
				},
				{
					label: 'WWW (Actual)',
					data: wwHistConnected,
					borderColor: 'rgba(59, 130, 246, 1)',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					borderWidth: 2,
					tension: 0.4,
					fill: false,
					pointRadius: 0,
					pointBackgroundColor: 'rgba(59, 130, 246, 1)',
					spanGaps: false
				},
				{
					label: 'WWW (Forecast)',
					data: ww.forecasted,
					borderColor: 'rgba(59, 130, 246, 0.5)',
					borderWidth: 2,
					borderDash: [6, 4],
					tension: 0.4,
					fill: false,
					pointRadius: 0,
					pointStyle: 'rectRot',
					pointBackgroundColor: 'rgba(59, 130, 246, 0.5)',
					spanGaps: false
				}
			]
		};
	}

	function updateChart() {
		if (!canvasRef || !hasEnoughData) return;

		if (chartInstance) chartInstance.destroy();

		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;

		const data = viewMode === 'total' ? buildTotalChart() : buildCategoryChart();

		chartInstance = new Chart(ctx, {
			type: 'line',
			data,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'top',
						labels: {
							color: getThemeColor('--color-text-primary'),
							usePointStyle: true,
							padding: 16,
							font: { size: 11 }
						}
					},
					title: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function(context: any) {
								const value = context.parsed.y;
								if (value === null) return '';
								return `${context.dataset.label}: ${formatCurrency(value)}`;
							}
						}
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							color: getThemeColor('--color-text-secondary'),
							callback: function(value: any) {
								return formatCurrency(value);
							}
						},
						grid: { color: getThemeColor('--color-border-primary') }
					},
					x: {
						ticks: { color: getThemeColor('--color-text-secondary') },
						grid: { color: getThemeColor('--color-border-primary') }
					}
				}
			}
		});
	}

	$effect(() => {
		transactions;
		viewMode;
		selectedYear;
		if (canvasRef && hasEnoughData) {
			updateChart();
		}
	});

	onMount(() => {
		if (hasEnoughData) updateChart();
	});

	onDestroy(() => {
		if (chartInstance) chartInstance.destroy();
	});
</script>

<Card padding="sm">
	{#snippet header()}
		<div class="flex items-center justify-between px-5 py-3">
			<h3 class="text-sm font-semibold m-0" style="color: var(--color-text-primary);">
				Donation Forecast
			</h3>
			{#if hasEnoughData}
				<div class="flex gap-1">
					<Button variant={viewMode === 'total' ? 'primary' : 'ghost'} size="sm" class="!ring-0 !ring-offset-0 !outline-none border border-[var(--color-accent)]" onclick={() => viewMode = 'total'}>
						Total
					</Button>
					<Button variant={viewMode === 'category' ? 'primary' : 'ghost'} size="sm" class="!ring-0 !ring-offset-0 !outline-none border border-[var(--color-accent)]" onclick={() => viewMode = 'category'}>
						By Category
					</Button>
				</div>
			{/if}
		</div>
	{/snippet}

	{#if !hasEnoughData}
		<div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
			<svg class="w-10 h-10" style="color: var(--color-text-tertiary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
			</svg>
			<p class="text-sm font-medium m-0" style="color: var(--color-text-primary);">Not enough data to forecast</p>
			<p class="text-xs m-0" style="color: var(--color-text-tertiary);">
				At least 3 months of donation history is needed. Currently have {totalMonthly.length} month{totalMonthly.length === 1 ? '' : 's'}.
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Forecast Cards -->
			{#if viewMode === 'total' && totalForecast.length > 0}
				<div class="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 gap-3">
					{#each totalForecast as point, i}
						<div class="rounded-lg p-3 border" style="background: var(--color-surface-primary); border-color: var(--color-border-primary);">
							<span class="text-xs font-medium" style="color: var(--color-text-secondary);">
								{formatShortMonth(point.month)}
							</span>
							<p class="text-base font-bold tabular-nums m-0 mt-1" style="color: var(--color-text-primary);">
								{formatCurrency(point.predicted)}
							</p>
							<p class="text-[10px] m-0 mt-1" style="color: var(--color-text-tertiary);">
								Forecast {i === 0 ? 'this month' : i === 1 ? 'next month' : 'in ' + (i + 1) + ' months'}
							</p>
						</div>
					{/each}
				</div>
			{/if}

			{#if viewMode === 'category' && (localForecast.length > 0 || worldwideForecast.length > 0)}
				<div class="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 gap-3">
					{#each { length: Math.max(localForecast.length, worldwideForecast.length) } as _, i}
						<div class="rounded-lg p-3 border" style="background: var(--color-surface-primary); border-color: var(--color-border-primary);">
							<div class="flex items-center justify-between mb-2">
								<span class="text-xs font-medium" style="color: var(--color-text-secondary);">
									{formatShortMonth((localForecast[i] || worldwideForecast[i]).month)}
								</span>
								<span class="text-[10px] m-0" style="color: var(--color-text-tertiary);">
									Forecast {i === 0 ? 'this month' : i === 1 ? 'next month' : 'in ' + (i + 1) + ' months'}
								</span>
							</div>
							{#if localForecast[i]}
								<div class="flex items-center justify-between">
									<span class="text-[11px] font-medium" style="color: rgba(34, 197, 94, 1);">LCE</span>
									<span class="text-sm font-bold tabular-nums" style="color: var(--color-text-primary);">
										{formatCurrency(localForecast[i].predicted)}
									</span>
								</div>
							{/if}
							{#if worldwideForecast[i]}
								<div class="flex items-center justify-between mt-1">
									<span class="text-[11px] font-medium" style="color: rgba(59, 130, 246, 1);">WWW</span>
									<span class="text-sm font-bold tabular-nums" style="color: var(--color-text-primary);">
										{formatCurrency(worldwideForecast[i].predicted)}
									</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Year Switcher + Chart -->
			<div>
				<div class="flex items-center gap-1 mb-3">
					{#each availableYears() as year}
						<button
							class="px-3 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-0"
							style={selectedYear === year
								? 'background: var(--color-accent); color: #fff;'
								: 'background: transparent; color: var(--color-text-secondary);'}
							onclick={() => selectedYear = year}
						>
							{year}
						</button>
					{/each}
				</div>
				<div class="h-64">
					<canvas bind:this={canvasRef}></canvas>
				</div>
			</div>
		</div>
	{/if}
</Card>
