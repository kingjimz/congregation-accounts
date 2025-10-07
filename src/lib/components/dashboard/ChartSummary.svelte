<script lang="ts">
	import type { Transaction, OpeningBalance } from '$lib/types';
	import { formatCurrency, formatMonthYear } from '$lib/utils';

	interface Props {
		transactions: Transaction[];
		month: string;
		openingBalance: OpeningBalance | null;
		loading?: boolean;
		onSetOpeningBalance?: () => void;
	}

	let { 
		transactions, 
		month, 
		openingBalance, 
		loading = false, 
		onSetOpeningBalance 
	}: Props = $props();

	// Helper functions for category detection
	function isLocalCategory(category: string): boolean {
		return category.toLowerCase().includes('local congregation');
	}

	function isWorldwideCategory(category: string): boolean {
		return category.toLowerCase().includes('worldwide work');
	}

	// Calculate category totals
	const categoryTotals = $derived(() => {
		const localDonations = transactions
			.filter(t => t.type === 'income' && isLocalCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		const localExpenses = transactions
			.filter(t => t.type === 'expense' && isLocalCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		const worldwideDonations = transactions
			.filter(t => t.type === 'income' && isWorldwideCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		const worldwideExpenses = transactions
			.filter(t => t.type === 'expense' && isWorldwideCategory(t.category))
			.reduce((sum, t) => sum + t.amount, 0);

		return {
			local: {
				donations: localDonations,
				expenses: localExpenses,
				balance: localDonations - localExpenses
			},
			worldwide: {
				donations: worldwideDonations,
				expenses: worldwideExpenses,
				balance: worldwideDonations - worldwideExpenses
			},
			total: {
				donations: localDonations + worldwideDonations,
				expenses: localExpenses + worldwideExpenses
			}
		};
	});

	// Analysis functions
	function analyzeFinancialData() {
		const incomeTransactions = transactions.filter(t => t.type === 'income');
		const expenseTransactions = transactions.filter(t => t.type === 'expense');
		
		const localDonations = incomeTransactions.filter(t => t.category.toLowerCase().includes('local congregation'));
		const worldwideDonations = incomeTransactions.filter(t => t.category.toLowerCase().includes('worldwide work'));
		const localExpenses = expenseTransactions.filter(t => t.category.toLowerCase().includes('local congregation'));
		const worldwideExpenses = expenseTransactions.filter(t => t.category.toLowerCase().includes('worldwide work'));

		// Calculate totals
		const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
		const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
		const netBalance = totalIncome - totalExpenses;
		
		// Opening balance calculations
		const openingBalanceAmount = Number(openingBalance?.balance || 0);
		const endingBalance = openingBalanceAmount + totalIncome - totalExpenses;

		const localDonationTotal = localDonations.reduce((sum, t) => sum + t.amount, 0);
		const worldwideDonationTotal = worldwideDonations.reduce((sum, t) => sum + t.amount, 0);
		const localExpenseTotal = localExpenses.reduce((sum, t) => sum + t.amount, 0);
		const worldwideExpenseTotal = worldwideExpenses.reduce((sum, t) => sum + t.amount, 0);

		// Calculate percentages
		const localDonationPercentage = totalIncome > 0 ? (localDonationTotal / totalIncome) * 100 : 0;
		const worldwideDonationPercentage = totalIncome > 0 ? (worldwideDonationTotal / totalIncome) * 100 : 0;
		const localExpensePercentage = totalExpenses > 0 ? (localExpenseTotal / totalExpenses) * 100 : 0;
		const worldwideExpensePercentage = totalExpenses > 0 ? (worldwideExpenseTotal / totalExpenses) * 100 : 0;

		// Analyze trends (compare with previous month if available)
		const currentMonth = month;
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonthNum = currentDate.getMonth() + 1;
		
		// Get previous month data for comparison
		const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
		const prevYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
		const prevMonthStr = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
		
		const prevMonthTransactions = transactions.filter(t => t.date.startsWith(prevMonthStr));
		const prevMonthIncome = prevMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
		const prevMonthExpenses = prevMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

		// Calculate growth rates
		const incomeGrowthRate = prevMonthIncome > 0 ? ((totalIncome - prevMonthIncome) / prevMonthIncome) * 100 : 0;
		const expenseGrowthRate = prevMonthExpenses > 0 ? ((totalExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : 0;

		return {
			totals: {
				income: totalIncome,
				expenses: totalExpenses,
				netBalance,
				openingBalance: openingBalanceAmount,
				endingBalance,
				localDonations: localDonationTotal,
				worldwideDonations: worldwideDonationTotal,
				localExpenses: localExpenseTotal,
				worldwideExpenses: worldwideExpenseTotal
			},
			percentages: {
				localDonations: localDonationPercentage,
				worldwideDonations: worldwideDonationPercentage,
				localExpenses: localExpensePercentage,
				worldwideExpenses: worldwideExpensePercentage
			},
			trends: {
				incomeGrowth: incomeGrowthRate,
				expenseGrowth: expenseGrowthRate,
				prevMonthIncome,
				prevMonthExpenses
			},
			counts: {
				totalTransactions: transactions.length,
				incomeCount: incomeTransactions.length,
				expenseCount: expenseTransactions.length,
				localDonationCount: localDonations.length,
				worldwideDonationCount: worldwideDonations.length
			}
		};
	}

	// Generate recommendations based on analysis
	function generateRecommendations(analysis: ReturnType<typeof analyzeFinancialData>) {
		const recommendations = [];
		const { totals, percentages, trends, counts } = analysis;

		// Income vs Expenses Analysis
		if (totals.netBalance < 0) {
			recommendations.push({
				type: 'warning',
				title: 'Negative Balance Alert',
				message: `Your expenses exceed income by ₱${Math.abs(totals.netBalance).toFixed(2)}. Consider reviewing expenses or increasing donations.`,
				priority: 'high'
			});
		} else if (totals.netBalance > 0 && totals.netBalance < totals.income * 0.1) {
			recommendations.push({
				type: 'info',
				title: 'Low Surplus',
				message: `You have a small surplus of ₱${totals.netBalance.toFixed(2)}. Consider building a larger reserve fund.`,
				priority: 'medium'
			});
		} else if (totals.netBalance > totals.income * 0.2) {
			recommendations.push({
				type: 'success',
				title: 'Healthy Surplus',
				message: `Great! You have a healthy surplus of ₱${totals.netBalance.toFixed(2)}. Consider investing in congregation improvements.`,
				priority: 'low'
			});
		}

		// Donation Distribution Analysis
		if (percentages.localDonations < 30) {
			recommendations.push({
				type: 'info',
				title: 'Local Donations Focus',
				message: `Local donations are ${percentages.localDonations.toFixed(1)}% of total income. Consider promoting local congregation needs.`,
				priority: 'medium'
			});
		}

		if (percentages.worldwideDonations < 20) {
			recommendations.push({
				type: 'info',
				title: 'Worldwide Work Support',
				message: `Worldwide work donations are ${percentages.worldwideDonations.toFixed(1)}% of total income. Consider increasing support for global ministry.`,
				priority: 'medium'
			});
		}

		// Growth Trend Analysis
		if (trends.incomeGrowth < -10) {
			recommendations.push({
				type: 'warning',
				title: 'Declining Income',
				message: `Income decreased by ${Math.abs(trends.incomeGrowth).toFixed(1)}% from last month. Review donation strategies.`,
				priority: 'high'
			});
		} else if (trends.incomeGrowth > 20) {
			recommendations.push({
				type: 'success',
				title: 'Strong Income Growth',
				message: `Excellent! Income increased by ${trends.incomeGrowth.toFixed(1)}% from last month. Maintain this momentum.`,
				priority: 'low'
			});
		}

		if (trends.expenseGrowth > 15) {
			recommendations.push({
				type: 'warning',
				title: 'Rising Expenses',
				message: `Expenses increased by ${trends.expenseGrowth.toFixed(1)}% from last month. Monitor spending patterns.`,
				priority: 'high'
			});
		}

		// Transaction Frequency Analysis
		if (counts.totalTransactions < 5) {
			recommendations.push({
				type: 'info',
				title: 'Low Activity',
				message: `Only ${counts.totalTransactions} transactions this month. Consider regular financial planning sessions.`,
				priority: 'medium'
			});
		}

		// Balance Distribution Analysis
		const localNetBalance = totals.localDonations - totals.localExpenses;
		const worldwideNetBalance = totals.worldwideDonations - totals.worldwideExpenses;

		if (localNetBalance < 0) {
			recommendations.push({
				type: 'warning',
				title: 'Local Congregation Deficit',
				message: `Local congregation has a deficit of ₱${Math.abs(localNetBalance).toFixed(2)}. Review local expenses.`,
				priority: 'high'
			});
		}

		if (worldwideNetBalance < 0) {
			recommendations.push({
				type: 'warning',
				title: 'Worldwide Work Deficit',
				message: `Worldwide work has a deficit of ₱${Math.abs(worldwideNetBalance).toFixed(2)}. Consider increasing worldwide donations.`,
				priority: 'high'
			});
		}

		return recommendations.sort((a, b) => {
			const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
			return priorityOrder[b.priority] - priorityOrder[a.priority];
		});
	}

	// Generate insights
	function generateInsights(analysis: ReturnType<typeof analyzeFinancialData>) {
		const insights = [];
		const { totals, percentages, trends, counts } = analysis;

		// Financial Health Score
		let healthScore = 100;
		if (totals.netBalance < 0) healthScore -= 30;
		else if (totals.netBalance < totals.income * 0.1) healthScore -= 10;
		
		if (trends.incomeGrowth < -10) healthScore -= 20;
		else if (trends.incomeGrowth > 10) healthScore += 10;
		
		if (trends.expenseGrowth > 15) healthScore -= 15;
		else if (trends.expenseGrowth < -5) healthScore += 5;

		healthScore = Math.max(0, Math.min(100, healthScore));

		insights.push({
			type: 'score',
			title: 'Financial Health Score',
			value: healthScore,
			description: healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention'
		});

		// Top Insights
		if (percentages.localDonations > percentages.worldwideDonations) {
			insights.push({
				type: 'insight',
				title: 'Local Focus',
				description: `Local congregation donations (${percentages.localDonations.toFixed(1)}%) exceed worldwide work donations (${percentages.worldwideDonations.toFixed(1)}%)`
			});
		}

		if (counts.incomeCount > counts.expenseCount) {
			insights.push({
				type: 'insight',
				title: 'Income Activity',
				description: `More income transactions (${counts.incomeCount}) than expense transactions (${counts.expenseCount})`
			});
		}

		if (totals.netBalance > 0) {
			insights.push({
				type: 'insight',
				title: 'Positive Cash Flow',
				description: `Net positive balance of ₱${totals.netBalance.toFixed(2)} indicates healthy financial management`
			});
		}

		return insights;
	}

	// Get analysis data
	const analysis = $derived(analyzeFinancialData());
	const recommendations = $derived(generateRecommendations(analysis));
	const insights = $derived(generateInsights(analysis));
	const firstInsight = $derived(insights.length > 0 ? insights[0] : null);

	// Format month for display
	function formatMonthForDisplay(monthStr: string): string {
		if (monthStr === '' || monthStr === 'All') return 'All Time';
		const [year, month] = monthStr.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		const monthName = date.toLocaleString('default', { month: 'long' });
		return `${monthName} ${year}`;
	}
</script>

<div class="chart-summary">
	<div class="summary-header">
		<h3 class="summary-title">
			<span class="summary-icon">📊</span>
			Financial Analysis & Insights
		</h3>
		<p class="summary-subtitle">Analysis for {formatMonthForDisplay(month)}</p>
	</div>

	<div class="summary-content">
		<!-- Monthly Summary Section -->
		<div class="monthly-summary-section">
			<h4 class="summary-section-title">Monthly Summary - {formatMonthYear(month)}</h4>
			
			{#if loading}
				<div class="flex items-center justify-center py-4">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
					<span class="ml-2" style="color: var(--color-text-secondary);">Loading balance...</span>
				</div>
			{:else}
				<div class="summary-balance-card">
					<!-- Opening Balance -->
					<div class="balance-row opening">
						<span class="balance-label">Start of month balance</span>
						<div class="balance-value-group">
							<span class="balance-amount">{formatCurrency(analysis.totals.openingBalance)}</span>
							{#if onSetOpeningBalance}
								<button
									type="button"
									onclick={onSetOpeningBalance}
									class="balance-edit-btn"
									title="Set Start of Month Balance"
									aria-label="Set Start of Month Balance"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
									</svg>
								</button>
							{/if}
						</div>
					</div>

					<!-- Income -->
					<div class="balance-row income">
						<span class="balance-label">Total Donations</span>
						<span class="balance-amount positive">+{formatCurrency(analysis.totals.income)}</span>
					</div>

					<!-- Expenses -->
					<div class="balance-row expense">
						<span class="balance-label">Total Expenses</span>
						<span class="balance-amount negative">-{formatCurrency(analysis.totals.expenses)}</span>
					</div>

					<!-- Ending Balance -->
					<div class="balance-row ending">
						<span class="balance-label">End of month balance</span>
						<span class="balance-amount {analysis.totals.endingBalance >= 0 ? 'positive' : 'negative'}">
							{formatCurrency(analysis.totals.endingBalance)}
						</span>
					</div>
				</div>

				<!-- Financial Health Score Progress Circle -->
				{#if firstInsight && firstInsight.type === 'score'}
					<div class="health-score-progress">
						<h4 class="progress-title">Financial Health Score</h4>
						<div class="progress-circle-container">
							<div class="progress-circle">
								<svg class="progress-ring" width="100" height="100">
									<circle
										class="progress-ring-background"
										cx="50"
										cy="50"
										r="40"
										fill="transparent"
										stroke="var(--color-border-secondary)"
										stroke-width="6"
									/>
									<circle
										class="progress-ring-fill"
										cx="50"
										cy="50"
										r="40"
										fill="transparent"
										stroke="var(--color-success)"
										stroke-width="6"
										stroke-linecap="round"
										stroke-dasharray="{2 * Math.PI * 40}"
										stroke-dashoffset="{2 * Math.PI * 40 * (1 - (firstInsight as any).value / 100)}"
									/>
								</svg>
								<div class="progress-content">
									<div class="progress-number">{(firstInsight as any).value}</div>
									<div class="progress-label">/100</div>
								</div>
							</div>
						</div>
						<div class="progress-description">
							{(firstInsight as any).description}
						</div>
					</div>
				{/if}
			{/if}
		</div>
		<!-- Key Metrics -->
		<div class="metrics-grid">
			<div class="metric-card">
				<div class="metric-icon income">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
					</svg>
				</div>
				<div class="metric-content">
					<div class="metric-value">₱{analysis.totals.income.toFixed(2)}</div>
					<div class="metric-label">Total Donations</div>
					{#if analysis.trends.incomeGrowth !== 0}
						<div class="metric-change {analysis.trends.incomeGrowth > 0 ? 'positive' : 'negative'}">
							{analysis.trends.incomeGrowth > 0 ? '+' : ''}{analysis.trends.incomeGrowth.toFixed(1)}% vs last month
						</div>
					{/if}
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-icon expense">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
					</svg>
				</div>
				<div class="metric-content">
					<div class="metric-value">₱{analysis.totals.expenses.toFixed(2)}</div>
					<div class="metric-label">Total Expenses</div>
					{#if analysis.trends.expenseGrowth !== 0}
						<div class="metric-change {analysis.trends.expenseGrowth > 0 ? 'negative' : 'positive'}">
							{analysis.trends.expenseGrowth > 0 ? '+' : ''}{analysis.trends.expenseGrowth.toFixed(1)}% vs last month
						</div>
					{/if}
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-icon balance">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
					</svg>
				</div>
				<div class="metric-content">
					<div class="metric-value {analysis.totals.netBalance >= 0 ? 'positive' : 'negative'}">₱{analysis.totals.netBalance.toFixed(2)}</div>
					<div class="metric-label">Net Balance</div>
					<div class="metric-change {analysis.totals.netBalance >= 0 ? 'positive' : 'negative'}">
						{analysis.totals.netBalance >= 0 ? 'Surplus' : 'Deficit'}
					</div>
				</div>
			</div>
		</div>

		<!-- Category Breakdown -->
		<div class="category-breakdown-section">
			<h4 class="summary-section-title">Category Breakdown</h4>
			
			<div class="category-breakdown-content">
				<!-- Local Congregation -->
				<div class="category-card">
					<div class="category-header">
						<h5 class="category-title">Local Congregation</h5>
					</div>
					<div class="category-details">
						<div class="category-row">
							<span class="category-label">Donations</span>
							<span class="category-amount positive">+{formatCurrency(categoryTotals().local.donations)}</span>
						</div>
						<div class="category-row">
							<span class="category-label">Expenses</span>
							<span class="category-amount negative">-{formatCurrency(categoryTotals().local.expenses)}</span>
						</div>
						<div class="category-balance">
							<span class="category-balance-label">Balance</span>
							<span class="category-balance-amount {categoryTotals().local.balance >= 0 ? 'positive' : 'negative'}">
								{formatCurrency(categoryTotals().local.balance)}
							</span>
						</div>
					</div>
				</div>

				<!-- Worldwide Work -->
				<div class="category-card">
					<div class="category-header">
						<h5 class="category-title">Worldwide Work</h5>
					</div>
					<div class="category-details">
						<div class="category-row">
							<span class="category-label">Donations</span>
							<span class="category-amount positive">+{formatCurrency(categoryTotals().worldwide.donations)}</span>
						</div>
						<div class="category-row">
							<span class="category-label">Expenses</span>
							<span class="category-amount negative">-{formatCurrency(categoryTotals().worldwide.expenses)}</span>
						</div>
						<div class="category-balance">
							<span class="category-balance-label">Balance</span>
							<span class="category-balance-amount {categoryTotals().worldwide.balance >= 0 ? 'positive' : 'negative'}">
								{formatCurrency(categoryTotals().worldwide.balance)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Distribution Analysis -->
		<div class="distribution-analysis">
			<h4 class="analysis-title">Donation Distribution</h4>
			<div class="distribution-bars">
				<div class="distribution-item">
					<div class="distribution-label">
						<span class="distribution-color local"></span>
						Local Congregation
					</div>
					<div class="distribution-bar">
						<div class="distribution-fill local" style="width: {analysis.percentages.localDonations}%"></div>
					</div>
					<div class="distribution-value">{analysis.percentages.localDonations.toFixed(1)}%</div>
				</div>
				<div class="distribution-item">
					<div class="distribution-label">
						<span class="distribution-color worldwide"></span>
						Worldwide Work
					</div>
					<div class="distribution-bar">
						<div class="distribution-fill worldwide" style="width: {analysis.percentages.worldwideDonations}%"></div>
					</div>
					<div class="distribution-value">{analysis.percentages.worldwideDonations.toFixed(1)}%</div>
				</div>
			</div>
		</div>

		<!-- Recommendations -->
		{#if recommendations.length > 0}
			<div class="recommendations-section">
				<h4 class="recommendations-title">Recommendations</h4>
				<div class="recommendations-list">
					{#each recommendations.slice(0, 3) as recommendation}
						<div class="recommendation-item {recommendation.type}">
							<div class="recommendation-icon">
								{#if recommendation.type === 'success'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
									</svg>
								{:else if recommendation.type === 'warning'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
									</svg>
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
									</svg>
								{/if}
							</div>
							<div class="recommendation-content">
								<div class="recommendation-title">{recommendation.title}</div>
								<div class="recommendation-message">{recommendation.message}</div>
							</div>
							<div class="recommendation-priority {recommendation.priority}">
								{recommendation.priority}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Key Insights -->
		{#if insights.length > 1}
			<div class="insights-section">
				<h4 class="insights-title">Key Insights</h4>
				<div class="insights-list">
					{#each insights.slice(1) as insight}
						<div class="insight-item">
							<div class="insight-icon">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
								</svg>
							</div>
							<div class="insight-content">
								<div class="insight-title">{insight.title}</div>
								<div class="insight-description">{insight.description}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
	{/if}
</div>
</div>

<style>
	/* ========== Main Container ========== */
	.chart-summary {
		border-radius: 1rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		border: 1px solid;
		padding: 2rem;
		background: var(--color-glass-bg);
		border-color: var(--color-glass-border);
		backdrop-filter: blur(20px);
		margin-top: 1.5rem;
	}

	/* ========== Two Column Layout ========== */
	.summary-two-column {
		display: grid;
		grid-template-columns: 1fr 1.5fr;
		gap: 2rem;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid;
		border-color: var(--color-border-primary);
		align-items: start;
	}

	.summary-left-column {
		min-width: 0;
	}

	.summary-right-column {
		min-width: 0;
	}

	/* ========== Monthly Summary Section ========== */
	.monthly-summary-section {
		height: auto;
		margin-bottom: 2rem;
	}

	.summary-section-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--color-text-primary);
	}

	.summary-balance-card {
		background: var(--color-bg-primary);
		border-radius: 0.75rem;
		padding: 1.5rem;
		border: 1px solid var(--color-border-primary);
		margin-bottom: 1rem;
	}

	.balance-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid;
		border-color: var(--color-border-secondary);
	}

	.balance-row.opening {
		border-bottom-width: 2px;
		border-color: var(--color-border-primary);
	}

	.balance-row.ending {
		border-bottom: none;
		border-top: 2px solid;
		border-color: var(--color-border-primary);
		margin-top: 0.5rem;
		padding-top: 1rem;
	}

	.balance-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.balance-row.opening .balance-label,
	.balance-row.ending .balance-label {
		font-weight: 600;
		font-size: 1rem;
	}

	.balance-value-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.balance-amount {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.balance-row.opening .balance-amount,
	.balance-row.ending .balance-amount {
		font-size: 1.125rem;
		font-weight: 700;
	}

	.balance-amount.positive {
		color: var(--color-success);
	}

	.balance-amount.negative {
		color: var(--color-error);
	}

	.balance-edit-btn {
		padding: 0.25rem;
		border-radius: 50%;
		background: transparent;
		border: none;
		color: #4f46e5;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.balance-edit-btn:hover {
		background: rgba(79, 70, 229, 0.1);
		transform: scale(1.1);
	}

	/* ========== Financial Health Score Progress Circle ========== */
	.health-score-progress {
		margin-top: 1.5rem;
		padding: 0.75rem;
		background: var(--color-surface-primary);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border-secondary);
		text-align: center;
	}

	.progress-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.75rem;
	}

	.progress-circle-container {
		display: flex;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	.progress-circle {
		position: relative;
		width: 100px;
		height: 100px;
	}

	.progress-ring {
		transform: rotate(-90deg);
		transition: stroke-dashoffset 0.5s ease-in-out;
		width: 100px;
		height: 100px;
	}

	.progress-ring-background {
		opacity: 0.3;
	}

	.progress-ring-fill {
		transition: stroke-dashoffset 0.5s ease-in-out;
	}

	.progress-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
	}

	.progress-number {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		line-height: 1;
	}

	.progress-label {
		font-size: 0.625rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.progress-description {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	/* ========== Category Breakdown Section ========== */
	.category-breakdown-section {
		margin-top: 2rem;
	}

	.category-breakdown-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.category-card {
		background: var(--color-bg-primary);
		border-radius: 0.5rem;
		padding: 1.25rem;
		border: 1px solid var(--color-border-primary);
	}

	.category-header {
		margin-bottom: 0.75rem;
	}

	.category-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.category-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.category-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0;
	}

	.category-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.category-amount {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.category-amount.positive {
		color: var(--color-success);
	}

	.category-amount.negative {
		color: var(--color-error);
	}

	.category-balance {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		margin-top: 0.375rem;
		border-top: 1px solid;
		border-color: var(--color-border-secondary);
	}

	.category-balance-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.category-balance-amount {
		font-size: 1rem;
		font-weight: 700;
	}

	.category-balance-amount.positive {
		color: var(--color-success);
	}

	.category-balance-amount.negative {
		color: var(--color-error);
	}

	/* ========== Header ========== */
	.summary-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid;
		border-color: var(--color-border-primary);
	}

	.summary-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		color: var(--color-text-primary);
	}

	.summary-icon {
		font-size: 1.5rem;
		margin-right: 0.75rem;
	}

	.summary-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	/* ========== Health Score ========== */
	.health-score-card {
		background: var(--color-bg-primary);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
		border: 1px solid var(--color-border-primary);
	}

	.score-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.score-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.score-value {
		font-size: 2rem;
		font-weight: 700;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
	}

	.score-value.excellent {
		color: #059669;
		background: rgba(5, 150, 105, 0.1);
	}

	.score-value.good {
		color: #0891b2;
		background: rgba(8, 145, 178, 0.1);
	}

	.score-value.fair {
		color: #d97706;
		background: rgba(217, 119, 6, 0.1);
	}

	.score-value.poor {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.1);
	}

	.score-description {
		margin-bottom: 1rem;
	}

	.score-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.score-bar {
		width: 100%;
		height: 0.5rem;
		background: var(--color-border-secondary);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.score-fill {
		height: 100%;
		border-radius: 0.25rem;
		transition: width 0.3s ease;
	}

	.score-fill.excellent {
		background: linear-gradient(to right, #059669, #10b981);
	}

	.score-fill.good {
		background: linear-gradient(to right, #0891b2, #06b6d4);
	}

	.score-fill.fair {
		background: linear-gradient(to right, #d97706, #f59e0b);
	}

	.score-fill.poor {
		background: linear-gradient(to right, #dc2626, #ef4444);
	}

	/* ========== Metrics Grid ========== */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.metric-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 0.75rem;
		border: 1px solid;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
		transition: all 0.2s ease;
	}

	.metric-card:hover {
		background: var(--color-surface-hover);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
		transform: translateY(-2px);
	}

	.metric-icon {
		width: 3rem;
		height: 3rem;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.metric-icon.income {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.metric-icon.expense {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.metric-icon.balance {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
	}

	.metric-content {
		flex: 1;
		min-width: 0;
	}

	.metric-value {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
		color: var(--color-text-primary);
	}

	.metric-value.positive {
		color: #059669;
	}

	.metric-value.negative {
		color: #dc2626;
	}

	.metric-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.metric-change {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: 0.375rem;
		display: inline-block;
	}

	.metric-change.positive {
		color: #059669;
		background: rgba(5, 150, 105, 0.1);
	}

	.metric-change.negative {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.1);
	}

	/* ========== Distribution Analysis ========== */
	.distribution-analysis {
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.analysis-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--color-text-primary);
	}

	.distribution-bars {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.distribution-item {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.distribution-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		min-width: 8rem;
	}

	.distribution-color {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.distribution-color.local {
		background: #22c55e;
	}

	.distribution-color.worldwide {
		background: #3b82f6;
	}

	.distribution-bar {
		flex: 1;
		height: 0.5rem;
		background: var(--color-border-secondary);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.distribution-fill {
		height: 100%;
		border-radius: 0.25rem;
		transition: width 0.3s ease;
	}

	.distribution-fill.local {
		background: linear-gradient(to right, #22c55e, #16a34a);
	}

	.distribution-fill.worldwide {
		background: linear-gradient(to right, #3b82f6, #2563eb);
	}

	.distribution-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		min-width: 3rem;
		text-align: right;
	}

	/* ========== Recommendations ========== */
	.recommendations-section {
		margin-bottom: 2rem;
	}

	.recommendations-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--color-text-primary);
	}

	.recommendations-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recommendation-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
	}

	.recommendation-item.success {
		border-left: 4px solid #059669;
		background: rgba(5, 150, 105, 0.05);
	}

	.recommendation-item.warning {
		border-left: 4px solid #d97706;
		background: rgba(217, 119, 6, 0.05);
	}

	.recommendation-item.info {
		border-left: 4px solid #0891b2;
		background: rgba(8, 145, 178, 0.05);
	}

	.recommendation-icon {
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.recommendation-item.success .recommendation-icon {
		color: #059669;
	}

	.recommendation-item.warning .recommendation-icon {
		color: #d97706;
	}

	.recommendation-item.info .recommendation-icon {
		color: #0891b2;
	}

	.recommendation-content {
		flex: 1;
		min-width: 0;
	}

	.recommendation-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
		color: var(--color-text-primary);
	}

	.recommendation-message {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.recommendation-priority {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.recommendation-priority.high {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.1);
	}

	.recommendation-priority.medium {
		color: #d97706;
		background: rgba(217, 119, 6, 0.1);
	}

	.recommendation-priority.low {
		color: #059669;
		background: rgba(5, 150, 105, 0.1);
	}

	/* ========== Insights ========== */
	.insights-section {
		margin-bottom: 2rem;
	}

	.insights-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--color-text-primary);
	}

	.insights-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.insight-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
	}

	.insight-icon {
		flex-shrink: 0;
		margin-top: 0.125rem;
		color: #6366f1;
	}

	.insight-content {
		flex: 1;
		min-width: 0;
	}

	.insight-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
		color: var(--color-text-primary);
	}

	.insight-description {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	/* ========== Responsive Design ========== */
	@media (max-width: 768px) {
		.chart-summary {
			padding: 1.5rem;
			margin-top: 1rem;
		}

		.summary-two-column {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.category-breakdown-content {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.category-card {
			padding: 0.75rem;
		}

		.category-header {
			margin-bottom: 0.5rem;
		}

		.category-title {
			font-size: 0.8rem;
		}

		.category-details {
			gap: 0.375rem;
		}

		.category-row {
			padding: 0.25rem 0;
		}

		.category-label,
		.category-amount {
			font-size: 0.7rem;
		}

		.category-balance {
			padding: 0.375rem 0;
			margin-top: 0.25rem;
		}

		.category-balance-label {
			font-size: 0.7rem;
		}

		.category-balance-amount {
			font-size: 0.8rem;
		}

		.health-score-progress {
			margin-top: 1rem;
			padding: 0.75rem;
		}

		.progress-title {
			font-size: 0.875rem;
			margin-bottom: 0.75rem;
		}

		.progress-circle {
			width: 100px;
			height: 100px;
		}

		.progress-ring {
			width: 100px;
			height: 100px;
		}

		.progress-number {
			font-size: 1.25rem;
		}

		.progress-label {
			font-size: 0.625rem;
		}

		.progress-description {
			font-size: 0.75rem;
		}

		.summary-header {
			margin-bottom: 1.5rem;
			padding-bottom: 1rem;
		}

		.summary-title {
			font-size: 1.25rem;
		}

		.summary-subtitle {
			font-size: 0.875rem;
		}

		.health-score-card {
			padding: 1rem;
		}

		.score-circle {
			width: 60px;
			height: 60px;
		}

		.score-number {
			font-size: 1.25rem;
		}

		.score-label {
			font-size: 0.75rem;
		}

		.metrics-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.metric-card {
			padding: 0.75rem;
		}

		.metric-value {
			font-size: 1rem;
		}

		.metric-label {
			font-size: 0.75rem;
		}

		.insights-section {
			margin-top: 1.5rem;
		}

		.insights-title {
			font-size: 1rem;
		}

		.insight-item {
			padding: 0.75rem;
		}

		.insight-text {
			font-size: 0.875rem;
		}

		.recommendations-section {
			margin-top: 1.5rem;
		}

		.recommendations-title {
			font-size: 1rem;
		}

		.recommendation-item {
			padding: 0.75rem;
		}

		.recommendation-text {
			font-size: 0.875rem;
		}
	}

	/* ========== Dark Mode Overrides ========== */
	:root.dark .recommendation-item.success {
		background: rgba(5, 150, 105, 0.1);
	}

	:root.dark .recommendation-item.warning {
		background: rgba(217, 119, 6, 0.1);
	}

	:root.dark .recommendation-item.info {
		background: rgba(8, 145, 178, 0.1);
	}

	/* ========== Animations ========== */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.chart-summary {
		animation: fadeInUp 0.6s ease-out;
	}

	/* ========== Smooth Transitions ========== */
	* {
		transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
	}
</style>
