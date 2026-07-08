import type { Transaction } from '$lib/types';

export interface RegressionResult {
	slope: number;
	intercept: number;
	r2: number;
}

export interface ForecastPoint {
	month: string;
	predicted: number;
	confidence: 'high' | 'medium' | 'low';
}

export interface MonthlyTotal {
	month: string;
	total: number;
}

/**
 * Weighted linear regression on (x, y) points.
 * More recent data points receive higher weights via exponential decay.
 */
export function linearRegression(points: { x: number; y: number }[], decayFactor: number = 0.15): RegressionResult {
	const n = points.length;
	if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

	// Exponential weights: newer points (higher index) get more weight
	const weights = points.map((_, i) => Math.exp(decayFactor * (i - n + 1)));

	let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;
	for (let i = 0; i < n; i++) {
		const w = weights[i];
		sumW += w;
		sumWX += w * points[i].x;
		sumWY += w * points[i].y;
		sumWXY += w * points[i].x * points[i].y;
		sumWX2 += w * points[i].x * points[i].x;
	}

	const denominator = sumW * sumWX2 - sumWX * sumWX;
	if (denominator === 0) return { slope: 0, intercept: sumWY / sumW, r2: 0 };

	const slope = (sumW * sumWXY - sumWX * sumWY) / denominator;
	const intercept = (sumWY - slope * sumWX) / sumW;

	// Weighted R-squared
	const yMean = sumWY / sumW;
	let ssRes = 0, ssTot = 0;
	for (let i = 0; i < n; i++) {
		const predicted = slope * points[i].x + intercept;
		ssRes += weights[i] * (points[i].y - predicted) ** 2;
		ssTot += weights[i] * (points[i].y - yMean) ** 2;
	}
	const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

	return { slope, intercept, r2 };
}

/**
 * Returns the current month as YYYY-MM.
 */
function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Advances a YYYY-MM string by n months.
 */
function addMonths(monthStr: string, n: number): string {
	const [year, month] = monthStr.split('-').map(Number);
	const date = new Date(year, month - 1 + n);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Aggregates income transactions into monthly totals.
 * Excludes the current (incomplete) month to avoid skewing the regression.
 * Fills in missing months with 0 so the regression x-axis matches calendar time.
 */
export function aggregateMonthlyDonations(
	transactions: Transaction[],
	categoryFilter?: (category: string) => boolean
): MonthlyTotal[] {
	const currentMonth = getCurrentMonth();
	const monthMap = new Map<string, number>();

	for (const t of transactions) {
		if (t.type !== 'income') continue;
		if (categoryFilter && !categoryFilter(t.category)) continue;
		const month = t.date.slice(0, 7);
		if (month >= currentMonth) continue;
		monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
	}

	const sorted = Array.from(monthMap.entries())
		.map(([month, total]) => ({ month, total }))
		.sort((a, b) => a.month.localeCompare(b.month));

	if (sorted.length < 2) return sorted;
	const filled: MonthlyTotal[] = [];
	const first = sorted[0].month;
	const last = sorted[sorted.length - 1].month;
	let cursor = first;
	while (cursor <= last) {
		const existing = sorted.find(s => s.month === cursor);
		filled.push({ month: cursor, total: existing ? existing.total : 0 });
		cursor = addMonths(cursor, 1);
	}
	return filled;
}

/**
 * Exponential moving average: gives recent months progressively more influence.
 * Alpha controls responsiveness (higher = more weight on recent data).
 */
function exponentialMovingAverage(values: number[], alpha: number = 0.3): number {
	if (values.length === 0) return 0;
	let ema = values[0];
	for (let i = 1; i < values.length; i++) {
		ema = alpha * values[i] + (1 - alpha) * ema;
	}
	return ema;
}

/**
 * Detects and dampens outliers using IQR method.
 * Replaces values beyond 1.5x IQR with the nearest fence value.
 */
function dampenOutliers(totals: MonthlyTotal[]): MonthlyTotal[] {
	if (totals.length < 4) return totals;

	const sorted = [...totals.map(t => t.total)].sort((a, b) => a - b);
	const q1 = sorted[Math.floor(sorted.length * 0.25)];
	const q3 = sorted[Math.floor(sorted.length * 0.75)];
	const iqr = q3 - q1;
	const lowerFence = q1 - 1.5 * iqr;
	const upperFence = q3 + 1.5 * iqr;

	return totals.map(t => ({
		month: t.month,
		total: Math.max(lowerFence, Math.min(upperFence, t.total))
	}));
}

/**
 * Calculates coefficient of variation (CV) to measure donation volatility.
 * Lower CV = more consistent giving = more trustworthy forecast.
 */
function coefficientOfVariation(values: number[]): number {
	if (values.length < 2) return 1;
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	if (mean === 0) return 1;
	const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
	return Math.sqrt(variance) / mean;
}

/**
 * Computes seasonal indices from historical monthly totals.
 * Each calendar month (Jan=0 .. Dec=11) gets a multiplier relative to the overall average.
 * e.g., index of 1.2 for December means December typically runs 20% above average.
 * Requires at least 12 months of data to activate; returns neutral indices (all 1.0) otherwise.
 */
function computeSeasonalIndices(totals: MonthlyTotal[]): number[] {
	const indices = new Array(12).fill(1.0);
	if (totals.length < 12) return indices;

	const overallMean = totals.reduce((s, t) => s + t.total, 0) / totals.length;
	if (overallMean === 0) return indices;

	// Group totals by calendar month
	const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
	for (const t of totals) {
		const calMonth = parseInt(t.month.split('-')[1]) - 1;
		monthBuckets[calMonth].push(t.total);
	}

	for (let m = 0; m < 12; m++) {
		if (monthBuckets[m].length === 0) continue;
		const monthAvg = monthBuckets[m].reduce((a, b) => a + b, 0) / monthBuckets[m].length;
		indices[m] = monthAvg / overallMean;
	}

	// Normalize so indices average to 1.0 (preserves the overall level)
	const indexMean = indices.reduce((a, b) => a + b, 0) / 12;
	for (let m = 0; m < 12; m++) {
		indices[m] /= indexMean;
	}

	// Scale seasonal strength by how many full annual cycles we have.
	// 1 cycle: 25% strength (one data point per month is unreliable)
	// 2 cycles: 60%
	// 3+ cycles: full strength
	const cycles = Math.floor(totals.length / 12);
	const strength = cycles >= 3 ? 1.0 : cycles === 2 ? 0.6 : 0.25;

	// Dampen indices toward 1.0 (neutral) based on strength
	for (let m = 0; m < 12; m++) {
		indices[m] = 1.0 + (indices[m] - 1.0) * strength;
	}

	return indices;
}

/**
 * Forecasts future monthly donation totals using a blended approach:
 * 1. Outlier dampening before fitting
 * 2. Weighted linear regression (trend component, recent data weighted higher)
 * 3. Exponential moving average (momentum component)
 * 4. Seasonal adjustment (annual giving patterns, requires 12+ months)
 * 5. Per-month confidence decay (further out = less certain)
 *
 * Requires at least 3 months of completed historical data.
 */
export function forecastDonations(
	monthlyTotals: MonthlyTotal[],
	monthsAhead: number = 3
): ForecastPoint[] {
	if (monthlyTotals.length < 3) return [];

	// Step 1: Dampen outliers so one anomalous month doesn't skew the model
	const cleaned = dampenOutliers(monthlyTotals);

	// Step 2: Deseasonalize data before regression (if enough history)
	const seasonalIndices = computeSeasonalIndices(cleaned);
	const hasSeasonality = monthlyTotals.length >= 12;

	// Remove seasonal pattern so regression fits the underlying trend
	const deseasonalized = hasSeasonality
		? cleaned.map(t => {
			const calMonth = parseInt(t.month.split('-')[1]) - 1;
			return { month: t.month, total: t.total / seasonalIndices[calMonth] };
		})
		: cleaned;

	// Step 3: Weighted linear regression on deseasonalized data (trend)
	const points = deseasonalized.map((m, i) => ({ x: i, y: m.total }));
	const { slope, intercept, r2 } = linearRegression(points);

	// Step 4: EMA of deseasonalized data (momentum)
	const recentValues = deseasonalized.map(m => m.total);
	const ema = exponentialMovingAverage(recentValues, 0.35);

	// Step 5: Blend weights based on trend fit AND data consistency
	// High R² and low volatility = trust regression more
	// Low R² or high volatility = trust EMA more (anchors to recent reality)
	const cv = coefficientOfVariation(recentValues);
	const stabilityFactor = 1 - Math.min(cv, 1); // 0 = chaotic, 1 = perfectly stable
	const fitScore = r2 * 0.6 + stabilityFactor * 0.4;
	const regressionWeight = Math.max(0.2, Math.min(0.7, fitScore));
	const emaWeight = 1 - regressionWeight;

	const currentMonth = getCurrentMonth();

	// Calculate month gap from last historical to current
	const lastMonth = monthlyTotals[monthlyTotals.length - 1].month;
	const [lastY, lastM] = lastMonth.split('-').map(Number);
	const [curY, curM] = currentMonth.split('-').map(Number);
	const monthGap = (curY - lastY) * 12 + (curM - lastM);

	// Step 6: Confidence scoring using multiple signals
	const sampleBonus = Math.min(1, monthlyTotals.length / 12);
	const baseConfidence = (r2 * 0.5) + ((1 - Math.min(cv, 1)) * 0.3) + (sampleBonus * 0.2);

	const forecasts: ForecastPoint[] = [];
	for (let i = 0; i < monthsAhead; i++) {
		const xValue = points.length - 1 + monthGap + i;
		const regressionPrediction = slope * xValue + intercept;

		// EMA projection: carry forward with trend adjustment
		const emaPrediction = ema + slope * (monthGap + i);

		// Blend the two signals (this is the deseasonalized base forecast)
		let predicted = regressionWeight * regressionPrediction + emaWeight * emaPrediction;

		// Step 7: Re-apply seasonal adjustment to the blended forecast
		if (hasSeasonality) {
			const forecastMonth = addMonths(currentMonth, i);
			const calMonth = parseInt(forecastMonth.split('-')[1]) - 1;
			predicted *= seasonalIndices[calMonth];
		}

		predicted = Math.max(0, predicted);

		// Confidence decays per month projected (10% decay per month out)
		const decayedConfidence = baseConfidence * Math.pow(0.9, i);
		const confidence: ForecastPoint['confidence'] =
			decayedConfidence >= 0.6 ? 'high' : decayedConfidence >= 0.35 ? 'medium' : 'low';

		forecasts.push({
			month: addMonths(currentMonth, i),
			predicted: Math.round(predicted * 100) / 100,
			confidence
		});
	}

	return forecasts;
}

/**
 * Returns the R-squared value for a set of monthly totals.
 */
export function getForecastConfidence(monthlyTotals: MonthlyTotal[]): number {
	if (monthlyTotals.length < 3) return 0;
	const cleaned = dampenOutliers(monthlyTotals);
	const points = cleaned.map((m, i) => ({ x: i, y: m.total }));
	return linearRegression(points).r2;
}
