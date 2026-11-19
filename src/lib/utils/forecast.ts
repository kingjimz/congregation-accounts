import type { Transaction } from '$lib/types';

export interface RegressionResult {
	slope: number;
	intercept: number;
	r2: number;
	/** Weighted centroid of the fitted points. */
	meanX: number;
	meanY: number;
	/** Effective sample size after weighting (Kish). */
	effectiveN: number;
}

export interface ForecastPoint {
	month: string;
	predicted: number;
	confidence: 'high' | 'medium' | 'low';
}

export interface MonthlyTotal {
	month: string;
	total: number;
	/** True when nothing at all was entered for the month, so the 0 is "unknown", not "no donations". */
	missing?: boolean;
}

export interface ForecastOptions {
	/** First forecast month as YYYY-MM. Defaults to the current calendar month. */
	currentMonth?: string;
	/** Income already received in the current month. */
	monthToDate?: number;
	/** Share of the current month that has elapsed (0 to 1). */
	monthElapsedFraction?: number;
}

export interface BacktestHorizon {
	/** 1 = the first forecast month. */
	horizon: number;
	/** Weighted absolute percentage error: sum|error| / sum|actual|. */
	wape: number;
	/** Signed error as a share of actuals. Positive = forecasting too high. */
	bias: number;
	samples: number;
}

export interface BacktestResult {
	horizons: BacktestHorizon[];
	wape: number;
	samples: number;
}

export interface BacktestOptions {
	/** Months of history required before the first cut. */
	minTrain?: number;
	/** Alternative model to score, for comparisons. */
	forecaster?: (history: MonthlyTotal[], monthsAhead: number, currentMonth: string) => number[];
}

const MIN_MONTHS = 3;
const MIN_SEASONAL_MONTHS = 12;
/** Recency weighting of the trend fit (per month). */
const TREND_DECAY = 0.1;
/** Smoothing of recent deviations from the trend line. */
const EMA_ALPHA = 0.2;
/** Each further month keeps this share of the previous month's growth. */
const TREND_DAMPING = 0.92;
/** Calendar months this far below average are left out of the trend fit instead of being scaled up. */
const LOW_SEASONAL_INDEX = 0.25;
/** Seasonal strength when each calendar month has been seen only once. */
const SINGLE_CYCLE_STRENGTH = 0.5;
/** How strong the trend evidence must be before the slope is trusted (t-squared scale). */
const TREND_EVIDENCE = 4;

/**
 * Weighted linear regression on (x, y) points.
 * Points closer to the largest x receive higher weights via exponential decay.
 */
export function linearRegression(
	points: { x: number; y: number }[],
	decayFactor: number = TREND_DECAY
): RegressionResult {
	const n = points.length;
	if (n === 0) return { slope: 0, intercept: 0, r2: 0, meanX: 0, meanY: 0, effectiveN: 0 };

	const maxX = points.reduce((max, p) => Math.max(max, p.x), -Infinity);
	const weights = points.map((p) => Math.exp(decayFactor * (p.x - maxX)));

	let sumW = 0,
		sumW2 = 0,
		sumWX = 0,
		sumWY = 0,
		sumWXY = 0,
		sumWX2 = 0;
	for (let i = 0; i < n; i++) {
		const w = weights[i];
		sumW += w;
		sumW2 += w * w;
		sumWX += w * points[i].x;
		sumWY += w * points[i].y;
		sumWXY += w * points[i].x * points[i].y;
		sumWX2 += w * points[i].x * points[i].x;
	}

	const meanX = sumWX / sumW;
	const meanY = sumWY / sumW;
	const effectiveN = (sumW * sumW) / sumW2;
	const denominator = sumW * sumWX2 - sumWX * sumWX;
	if (n < 2 || Math.abs(denominator) < 1e-9) {
		return { slope: 0, intercept: meanY, r2: 0, meanX, meanY, effectiveN };
	}

	const slope = (sumW * sumWXY - sumWX * sumWY) / denominator;
	const intercept = meanY - slope * meanX;

	let ssRes = 0,
		ssTot = 0;
	for (let i = 0; i < n; i++) {
		const fitted = slope * points[i].x + intercept;
		ssRes += weights[i] * (points[i].y - fitted) ** 2;
		ssTot += weights[i] * (points[i].y - meanY) ** 2;
	}
	const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

	return { slope, intercept, r2, meanX, meanY, effectiveN };
}

/**
 * Returns the current month as YYYY-MM (local time).
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

/** Whole months from one YYYY-MM string to another. */
function monthDiff(from: string, to: string): number {
	const [fromY, fromM] = from.split('-').map(Number);
	const [toY, toM] = to.split('-').map(Number);
	return (toY - fromY) * 12 + (toM - fromM);
}

function calendarMonthIndex(monthStr: string): number {
	return parseInt(monthStr.split('-')[1]) - 1;
}

function mean(values: number[]): number {
	return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Quantile with linear interpolation between the two nearest ranks. */
function quantile(values: number[], q: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const position = (sorted.length - 1) * q;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Aggregates income transactions into monthly totals.
 * Excludes the current (incomplete) month so it does not skew the trend.
 * Months between the first and last donation are filled in: with a real 0 when
 * other transactions were entered that month, or flagged `missing` when nothing
 * was entered at all.
 */
export function aggregateMonthlyDonations(
	transactions: Transaction[],
	categoryFilter?: (category: string) => boolean,
	currentMonth: string = getCurrentMonth()
): MonthlyTotal[] {
	const monthMap = new Map<string, number>();
	const activeMonths = new Set<string>();

	for (const t of transactions) {
		const month = t.date.slice(0, 7);
		if (month >= currentMonth) continue;
		activeMonths.add(month);
		if (t.type !== 'income') continue;
		if (categoryFilter && !categoryFilter(t.category)) continue;
		monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
	}

	const months = Array.from(monthMap.keys()).sort();
	if (months.length === 0) return [];

	const filled: MonthlyTotal[] = [];
	const last = months[months.length - 1];
	for (let cursor = months[0]; cursor <= last; cursor = addMonths(cursor, 1)) {
		const total = monthMap.get(cursor);
		if (total !== undefined) filled.push({ month: cursor, total });
		else if (activeMonths.has(cursor)) filled.push({ month: cursor, total: 0 });
		else filled.push({ month: cursor, total: 0, missing: true });
	}
	return filled;
}

/**
 * Income already received in the current month, for the same series as
 * `aggregateMonthlyDonations` with the same filter.
 */
export function sumMonthToDate(
	transactions: Transaction[],
	categoryFilter?: (category: string) => boolean,
	currentMonth: string = getCurrentMonth()
): number {
	let total = 0;
	for (const t of transactions) {
		if (t.type !== 'income') continue;
		if (t.date.slice(0, 7) !== currentMonth) continue;
		if (categoryFilter && !categoryFilter(t.category)) continue;
		total += t.amount;
	}
	return total;
}

/** Share of the current month that has elapsed (0 to 1). */
export function getMonthElapsedFraction(now: Date = new Date()): number {
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	return now.getDate() / daysInMonth;
}

interface Observation {
	/** Months since the first observed month. */
	x: number;
	calMonth: number;
	y: number;
}

interface Model {
	firstMonth: string;
	lastX: number;
	/** Deseasonalized level at `lastX`. */
	level: number;
	/** Monthly growth after shrinking for weak evidence. */
	slope: number;
	seasonalIndices: number[];
	r2: number;
	/** Scatter around the trend relative to the level. */
	volatility: number;
	fallback: number;
}

function toObservations(totals: MonthlyTotal[]): Observation[] {
	const valid = totals.filter((t) => !t.missing).sort((a, b) => a.month.localeCompare(b.month));
	if (valid.length === 0) return [];
	const first = valid[0].month;
	return valid.map((t) => ({
		x: monthDiff(first, t.month),
		calMonth: calendarMonthIndex(t.month),
		y: t.total
	}));
}

/**
 * Estimates the level each month would have had without seasonality, so that
 * growth is not mistaken for a seasonal pattern.
 * Uses a centered 12 month moving average where a full window exists and
 * extends it with the overall linear trend at the edges and across gaps.
 */
function trendBaseline(observations: Observation[]): number[] {
	const raw = observations.map((o) => ({ x: o.x, y: o.y }));
	// One-off months are dampened first so they do not lift the baseline of their neighbours.
	const smoothed = winsorizeResiduals(raw);
	const line = linearRegression(smoothed, 0);
	const byX = new Map(smoothed.map((p) => [p.x, p.y]));
	const lastX = observations[observations.length - 1].x;

	const movingAverage = new Map<number, number>();
	for (let x = 6; x <= lastX - 6; x++) {
		let weighted = 0,
			weightSum = 0,
			present = 0;
		for (let offset = -6; offset <= 6; offset++) {
			const y = byX.get(x + offset);
			if (y === undefined) continue;
			const weight = Math.abs(offset) === 6 ? 0.5 : 1;
			weighted += weight * y;
			weightSum += weight;
			present++;
		}
		if (present >= 11) movingAverage.set(x, weighted / weightSum);
	}

	const anchors = Array.from(movingAverage.keys());
	return observations.map((o) => {
		if (anchors.length === 0) return line.slope * o.x + line.intercept;
		const direct = movingAverage.get(o.x);
		if (direct !== undefined) return direct;
		const nearest = anchors.reduce((best, x) =>
			Math.abs(x - o.x) < Math.abs(best - o.x) ? x : best
		);
		return movingAverage.get(nearest)! + line.slope * (o.x - nearest);
	});
}

/**
 * Computes seasonal indices: a multiplier per calendar month (Jan=0 .. Dec=11)
 * relative to the trend. 1.2 for December means December typically runs 20% above trend.
 *
 * The pattern is shrunk toward 1.0 according to how consistently it repeats:
 * a pattern that recurs every year is applied in full, one that looks like
 * noise is mostly ignored. Returns neutral indices under 12 months of data.
 */
function computeSeasonalIndices(observations: Observation[]): number[] {
	const indices: number[] = new Array(12).fill(1);
	if (observations.length < MIN_SEASONAL_MONTHS) return indices;

	const baseline = trendBaseline(observations);
	const floor = 0.05 * mean(observations.map((o) => Math.abs(o.y)));
	if (floor === 0) return indices;

	const buckets: number[][] = Array.from({ length: 12 }, () => []);
	observations.forEach((o, i) => {
		if (baseline[i] > floor) buckets[o.calMonth].push(o.y / baseline[i]);
	});
	const observed = buckets.filter((b) => b.length > 0);
	if (observed.length < 12) return indices;

	// Month to month noise, measured from how much the same calendar month differs between years.
	const repeats = buckets.filter((b) => b.length >= 2);
	const deviations = repeats.flatMap((b) => {
		const bucketMean = mean(b);
		return b.map((r) => Math.abs(r - bucketMean));
	});
	const perMonth = mean(buckets.map((b) => b.length));
	const hasRepeats = deviations.length >= 12 && perMonth > 1;
	const noise = hasRepeats
		? 1.4826 * quantile(deviations, 0.5) * Math.sqrt(perMonth / (perMonth - 1))
		: 0;

	// Typical ratio per month: the median of the observed ratios together with one neutral
	// vote of 1.0. With two years of data, the year closer to "no pattern" wins, so a single
	// exceptional month is not read as a yearly peak. The vote fades as years accumulate.
	// The median is then refined by the mean of values near it.
	const raw = buckets.map((b) => {
		const center = quantile([...b, 1], 0.5);
		if (!hasRepeats || noise === 0) return center;
		return center + mean(b.map((r) => clamp(r - center, -2.5 * noise, 2.5 * noise)));
	});
	const rawMean = mean(raw);
	if (rawMean <= 0) return indices;
	const normalized = raw.map((r) => r / rawMean);

	let strength = SINGLE_CYCLE_STRENGTH;
	if (hasRepeats) {
		const between = mean(normalized.map((r) => (r - 1) ** 2));
		strength = between > 0 ? clamp(1 - (noise * noise) / perMonth / between, 0, 1) : 0;
	}

	return normalized.map((r) => Math.max(0, 1 + (r - 1) * strength));
}

/**
 * Line through the data that ignores extreme months: median of all pairwise
 * slopes (Theil-Sen). Unlike least squares, a single exceptional month, even
 * the most recent one, cannot tilt it.
 */
function robustLine(points: { x: number; y: number }[]): (x: number) => number {
	const slopes: number[] = [];
	for (let i = 0; i < points.length; i++) {
		for (let j = i + 1; j < points.length; j++) {
			if (points[j].x !== points[i].x) {
				slopes.push((points[j].y - points[i].y) / (points[j].x - points[i].x));
			}
		}
	}
	const slope = quantile(slopes, 0.5);
	const intercept = quantile(
		points.map((p) => p.y - slope * p.x),
		0.5
	);
	return (x: number) => slope * x + intercept;
}

/**
 * Pulls extreme deviations from the trend back to the IQR fences so a one-off
 * month (a special gift, a correction) does not bend the trend.
 */
function winsorizeResiduals(points: { x: number; y: number }[]): { x: number; y: number }[] {
	if (points.length < 6) return points;
	const line = robustLine(points);
	const residuals = points.map((p) => p.y - line(p.x));
	const q1 = quantile(residuals, 0.25);
	const q3 = quantile(residuals, 0.75);
	const iqr = q3 - q1;
	return points.map((p, i) => ({
		x: p.x,
		y: line(p.x) + clamp(residuals[i], q1 - 1.5 * iqr, q3 + 1.5 * iqr)
	}));
}

/** Total growth multiplier over `steps` months when each month keeps `TREND_DAMPING` of the last. */
function dampedHorizon(steps: number): number {
	if (steps <= 0) return 0;
	return (TREND_DAMPING * (1 - Math.pow(TREND_DAMPING, steps))) / (1 - TREND_DAMPING);
}

/**
 * Fits the forecast model:
 * 1. Seasonal indices from detrended history (12+ months)
 * 2. Recency weighted trend line on deseasonalized data, with one-off months dampened
 * 3. Slope shrunk toward zero when the evidence for a trend is weak
 * 4. Level = trend line plus a smoothed average of recent deviations from it
 */
function fitModel(totals: MonthlyTotal[]): Model | null {
	const observations = toObservations(totals);
	if (observations.length < MIN_MONTHS) return null;

	const firstMonth = totals
		.filter((t) => !t.missing)
		.reduce((min, t) => (t.month < min ? t.month : min), '9999-12');
	const lastX = observations[observations.length - 1].x;

	let seasonalIndices = computeSeasonalIndices(observations);
	// Months that sit far below average carry little information about the level, and
	// dividing by a near zero index would blow them up, so they stay out of the fit.
	let fitObservations = observations.filter(
		(o) => seasonalIndices[o.calMonth] >= LOW_SEASONAL_INDEX
	);
	if (fitObservations.length < MIN_MONTHS) {
		seasonalIndices = new Array(12).fill(1);
		fitObservations = observations;
	}

	const deseasonalized = fitObservations.map((o) => ({
		x: o.x,
		y: o.y / seasonalIndices[o.calMonth]
	}));
	const points = winsorizeResiduals(deseasonalized);
	const fit = linearRegression(points);

	// Shrink the slope by the strength of the evidence (t-squared of the trend).
	const tSquared =
		fit.r2 >= 1
			? Infinity
			: fit.effectiveN > 2
				? (fit.r2 / (1 - fit.r2)) * (fit.effectiveN - 2)
				: 0;
	const credibility = tSquared === Infinity ? 1 : tSquared / (tSquared + TREND_EVIDENCE);
	const slope = fit.slope * credibility;

	// The line pivots on the weighted centre of the data, so a weaker slope still fits the level.
	const line = (x: number) => fit.meanY + slope * (x - fit.meanX);
	const residuals = points.map((p) => p.y - line(p.x));
	const seedCount = Math.min(3, residuals.length);
	let recentDeviation = mean(residuals.slice(0, seedCount));
	for (let i = seedCount; i < residuals.length; i++) {
		recentDeviation = EMA_ALPHA * residuals[i] + (1 - EMA_ALPHA) * recentDeviation;
	}

	const fitResiduals = points.map((p) => p.y - (fit.slope * p.x + fit.intercept));
	const spread = Math.sqrt(mean(fitResiduals.map((r) => r * r)));
	const typicalLevel = Math.abs(fit.meanY);

	return {
		firstMonth,
		lastX,
		level: line(lastX) + recentDeviation,
		slope,
		seasonalIndices,
		r2: fit.r2,
		volatility: typicalLevel === 0 ? 1 : spread / typicalLevel,
		fallback: Math.max(0, mean(observations.map((o) => o.y)))
	};
}

/** Projects the fitted model forward, starting at `currentMonth`. */
function project(model: Model, currentMonth: string, monthsAhead: number): number[] {
	const startX = monthDiff(model.firstMonth, currentMonth);
	const predictions: number[] = [];
	for (let i = 0; i < monthsAhead; i++) {
		const steps = Math.max(1, startX + i - model.lastX);
		const base = Math.max(0, model.level + model.slope * dampedHorizon(steps));
		const seasonal = model.seasonalIndices[calendarMonthIndex(addMonths(currentMonth, i))];
		const predicted = base * seasonal;
		predictions.push(Number.isFinite(predicted) ? Math.max(0, predicted) : model.fallback);
	}
	return predictions;
}

/**
 * Scores the forecast against history it has not seen (rolling origin):
 * at each month, forecast using only earlier months, then compare with what
 * actually came in. This is the "budget versus actuals" check for the model.
 */
export function backtestForecast(
	monthlyTotals: MonthlyTotal[],
	horizon: number = 3,
	options: BacktestOptions = {}
): BacktestResult {
	const minTrain = options.minTrain ?? 6;
	const forecaster =
		options.forecaster ??
		((history: MonthlyTotal[], monthsAhead: number, currentMonth: string) => {
			const model = fitModel(history);
			return model ? project(model, currentMonth, monthsAhead) : [];
		});

	const sorted = [...monthlyTotals].sort((a, b) => a.month.localeCompare(b.month));
	const actuals = new Map(sorted.filter((t) => !t.missing).map((t) => [t.month, t.total]));
	const absError: number[] = new Array(horizon).fill(0);
	const signedError: number[] = new Array(horizon).fill(0);
	const actualSum: number[] = new Array(horizon).fill(0);
	const samples: number[] = new Array(horizon).fill(0);

	for (let cut = minTrain; cut < sorted.length; cut++) {
		const history = sorted.slice(0, cut);
		if (history.filter((t) => !t.missing).length < MIN_MONTHS) continue;
		const currentMonth = sorted[cut].month;
		const predictions = forecaster(history, horizon, currentMonth);
		for (let h = 0; h < predictions.length && h < horizon; h++) {
			const actual = actuals.get(addMonths(currentMonth, h));
			if (actual === undefined) continue;
			absError[h] += Math.abs(predictions[h] - actual);
			signedError[h] += predictions[h] - actual;
			actualSum[h] += Math.abs(actual);
			samples[h]++;
		}
	}

	const ratio = (numerator: number, denominator: number) =>
		denominator === 0 ? (numerator === 0 ? 0 : Infinity) : numerator / denominator;
	const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

	return {
		horizons: samples.map((count, h) => ({
			horizon: h + 1,
			wape: ratio(absError[h], actualSum[h]),
			bias: ratio(signedError[h], actualSum[h]),
			samples: count
		})),
		wape: ratio(sum(absError), sum(actualSum)),
		samples: sum(samples)
	};
}

/**
 * Rates each forecast month. With 8+ months of history the rating comes from
 * how far off the model was when backtested on this same history; with less,
 * from trend fit, stability and sample size.
 */
function rateConfidence(
	monthlyTotals: MonthlyTotal[],
	model: Model,
	monthsAhead: number
): ForecastPoint['confidence'][] {
	const validMonths = monthlyTotals.filter((t) => !t.missing).length;
	const backtest =
		validMonths >= 8
			? backtestForecast(monthlyTotals, Math.min(3, monthsAhead), { minTrain: 5 })
			: null;
	const scored = backtest ? backtest.horizons.filter((h) => h.samples >= 3) : [];

	const ratings: ForecastPoint['confidence'][] = [];
	for (let i = 0; i < monthsAhead; i++) {
		if (scored.length > 0) {
			const reference = scored[Math.min(i, scored.length - 1)];
			const beyond = Math.max(0, i - (scored.length - 1));
			const expectedError = reference.wape * (1 + 0.1 * beyond);
			ratings.push(expectedError <= 0.15 ? 'high' : expectedError <= 0.3 ? 'medium' : 'low');
		} else {
			const sampleBonus = Math.min(1, validMonths / 12);
			const base = model.r2 * 0.5 + (1 - Math.min(model.volatility, 1)) * 0.3 + sampleBonus * 0.2;
			const decayed = base * Math.pow(0.9, i);
			ratings.push(decayed >= 0.6 ? 'high' : decayed >= 0.35 ? 'medium' : 'low');
		}
	}
	return ratings;
}

/**
 * Forecasts future monthly donation totals, starting with the current month.
 *
 * The model is a trend line plus a seasonal pattern:
 * 1. Seasonal pattern measured after removing the trend (12+ months of data)
 * 2. Recency weighted trend on deseasonalized data, with one-off months dampened
 * 3. Recent deviations from the trend carried forward
 * 4. Growth that flattens the further out the forecast goes
 * 5. Current month adjusted for what has already been received
 *
 * Requires at least 3 months of completed historical data.
 */
export function forecastDonations(
	monthlyTotals: MonthlyTotal[],
	monthsAhead: number = 3,
	options: ForecastOptions = {}
): ForecastPoint[] {
	const model = fitModel(monthlyTotals);
	if (!model || monthsAhead <= 0) return [];

	const currentMonth = options.currentMonth ?? getCurrentMonth();
	const predictions = project(model, currentMonth, monthsAhead);

	// What has already come in this month is a floor, and the pace so far counts
	// for more the further into the month we are.
	const monthToDate = options.monthToDate ?? 0;
	if (monthToDate > 0) {
		const elapsed = clamp(options.monthElapsedFraction ?? 0, 0, 1);
		if (elapsed > 0) {
			const paceWeight = elapsed * elapsed;
			predictions[0] = (1 - paceWeight) * predictions[0] + paceWeight * (monthToDate / elapsed);
		}
		predictions[0] = Math.max(predictions[0], monthToDate);
	}

	const confidence = rateConfidence(monthlyTotals, model, monthsAhead);
	return predictions.map((predicted, i) => ({
		month: addMonths(currentMonth, i),
		predicted: Math.round(predicted * 100) / 100,
		confidence: confidence[i]
	}));
}
