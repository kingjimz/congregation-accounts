import { describe, it, expect } from 'vitest';
import type { Transaction } from '$lib/types';
import {
	aggregateMonthlyDonations,
	backtestForecast,
	forecastDonations,
	getMonthElapsedFraction,
	linearRegression,
	sumMonthToDate,
	type MonthlyTotal
} from './forecast';
import { FIXTURES, makeSeries, type SeriesSpec } from './forecast.fixtures';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * 3 month WAPE of the previous engine (regression/EMA blend on raw totals) on
 * these fixtures, averaged over SEEDS. Recorded before the model was changed.
 */
const PREVIOUS_ENGINE_WAPE: Record<string, number> = {
	flat: 0.0811,
	growth: 0.0641,
	growthSeasonal: 0.0942,
	spike: 0.1513,
	missingMonths: 0.12,
	zeroMonth: 0.1514,
	short: 0.1633,
	decline: 0.0658,
	volatile: 0.2012,
	levelShift: 0.0938
};

function tx(date: string, amount: number, overrides: Partial<Transaction> = {}): Transaction {
	return {
		date,
		amount,
		description: 'test',
		category: 'Local Congregation Donations',
		type: 'income',
		...overrides
	};
}

function nextMonth(series: MonthlyTotal[]): string {
	const [year, month] = series[series.length - 1].month.split('-').map(Number);
	const date = new Date(year, month);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function averageWape(name: string, spec: SeriesSpec): number {
	const minTrain = name === 'short' ? 3 : 6;
	const total = SEEDS.reduce(
		(sum, seed) => sum + backtestForecast(makeSeries(spec, seed), 3, { minTrain }).wape,
		0
	);
	return total / SEEDS.length;
}

describe('linearRegression', () => {
	it('recovers an exact line', () => {
		const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 100 + 20 * x }));
		const fit = linearRegression(points);
		expect(fit.slope).toBeCloseTo(20);
		expect(fit.intercept).toBeCloseTo(100);
		expect(fit.r2).toBeCloseTo(1);
	});

	it('returns a flat line for a single point', () => {
		expect(linearRegression([{ x: 0, y: 50 }])).toMatchObject({ slope: 0, intercept: 50, r2: 0 });
	});
});

describe('aggregateMonthlyDonations', () => {
	const transactions = [
		tx('2025-01-10', 100),
		tx('2025-01-20', 50),
		tx('2025-02-05', 30, { type: 'expense', category: 'Utilities' }),
		tx('2025-04-02', 200, { category: 'Worldwide Work Donations' }),
		tx('2025-05-15', 999)
	];

	it('sums income by month and leaves out the current month', () => {
		const result = aggregateMonthlyDonations(transactions, undefined, '2025-05');
		expect(result.map((r) => r.month)).toEqual(['2025-01', '2025-02', '2025-03', '2025-04']);
		expect(result[0]).toEqual({ month: '2025-01', total: 150 });
		expect(result[3]).toEqual({ month: '2025-04', total: 200 });
	});

	it('treats a month with other activity as a real zero and an empty month as missing', () => {
		const result = aggregateMonthlyDonations(transactions, undefined, '2025-05');
		expect(result[1]).toEqual({ month: '2025-02', total: 0 });
		expect(result[2]).toEqual({ month: '2025-03', total: 0, missing: true });
	});

	it('applies the category filter', () => {
		const result = aggregateMonthlyDonations(
			transactions,
			(c) => c.includes('Worldwide'),
			'2025-05'
		);
		expect(result).toEqual([{ month: '2025-04', total: 200 }]);
	});
});

describe('month to date helpers', () => {
	it('sums only current month income', () => {
		const transactions = [
			tx('2025-05-01', 100),
			tx('2025-05-09', 40, { type: 'expense' }),
			tx('2025-05-12', 25, { category: 'Worldwide Work Donations' }),
			tx('2025-04-30', 500)
		];
		expect(sumMonthToDate(transactions, undefined, '2025-05')).toBe(125);
		expect(sumMonthToDate(transactions, (c) => c.includes('Worldwide'), '2025-05')).toBe(25);
	});

	it('reports the share of the month elapsed', () => {
		expect(getMonthElapsedFraction(new Date(2025, 3, 15))).toBeCloseTo(0.5);
		expect(getMonthElapsedFraction(new Date(2025, 1, 28))).toBe(1);
	});
});

describe('forecastDonations', () => {
	it('needs three months of real data', () => {
		const series: MonthlyTotal[] = [
			{ month: '2025-01', total: 100 },
			{ month: '2025-02', total: 0, missing: true },
			{ month: '2025-03', total: 120 }
		];
		expect(forecastDonations(series, 3, { currentMonth: '2025-04' })).toEqual([]);
	});

	it('starts at the current month and returns one point per month', () => {
		const forecast = forecastDonations(makeSeries(FIXTURES.flat, 1), 3, {
			currentMonth: '2024-01'
		});
		expect(forecast.map((f) => f.month)).toEqual(['2024-01', '2024-02', '2024-03']);
	});

	it('returns finite, non negative amounts on every fixture', () => {
		const specs: Record<string, SeriesSpec> = {
			...FIXTURES,
			zeroMonthVolatile: { months: 48, level: 5000, noise: 0.35, zeroCalendarMonth: 7 },
			allZero: { months: 24, level: 0, noise: 0 }
		};
		for (const [name, spec] of Object.entries(specs)) {
			for (const seed of SEEDS) {
				const series = makeSeries(spec, seed);
				const forecast = forecastDonations(series, 12, { currentMonth: nextMonth(series) });
				expect(forecast, name).toHaveLength(12);
				for (const point of forecast) {
					expect(Number.isFinite(point.predicted), `${name} ${point.month}`).toBe(true);
					expect(point.predicted, `${name} ${point.month}`).toBeGreaterThanOrEqual(0);
				}
			}
		}
	});

	it('does not read unentered months as zero donations', () => {
		const series = makeSeries({ months: 24, level: 5000, noise: 0, missingAt: [18, 20, 22] }, 1);
		const [first] = forecastDonations(series, 1, { currentMonth: nextMonth(series) });
		expect(first.predicted).toBeCloseTo(5000, 0);
	});

	it('is not thrown off by a one-off month just before the forecast', () => {
		const series = makeSeries({ months: 24, level: 5000, noise: 0.05, spikeAt: [23] }, 1);
		const [first] = forecastDonations(series, 1, { currentMonth: nextMonth(series) });
		expect(first.predicted).toBeGreaterThan(4500);
		expect(first.predicted).toBeLessThan(5750);
	});

	it('learns a seasonal pattern that repeats', () => {
		const series = makeSeries(FIXTURES.growthSeasonal, 1);
		const forecast = forecastDonations(series, 12, { currentMonth: nextMonth(series) });
		const april = forecast.find((f) => f.month.endsWith('-04'))!;
		const july = forecast.find((f) => f.month.endsWith('-07'))!;
		expect(april.predicted / july.predicted).toBeGreaterThan(1.3);
	});

	it('forecasts close to zero for a calendar month that is always zero', () => {
		const series = makeSeries(FIXTURES.zeroMonth, 1);
		const forecast = forecastDonations(series, 12, { currentMonth: nextMonth(series) });
		const august = forecast.find((f) => f.month.endsWith('-08'))!;
		const september = forecast.find((f) => f.month.endsWith('-09'))!;
		expect(august.predicted).toBeLessThan(500);
		expect(september.predicted).toBeGreaterThan(4000);
	});

	it('flattens growth the further out it projects', () => {
		const series = makeSeries({ months: 24, level: 4000, growth: 100, noise: 0 }, 1);
		const forecast = forecastDonations(series, 12, { currentMonth: nextMonth(series) });
		const firstStep = forecast[1].predicted - forecast[0].predicted;
		const lastStep = forecast[11].predicted - forecast[10].predicted;
		expect(firstStep).toBeGreaterThan(0);
		expect(lastStep).toBeGreaterThan(0);
		expect(lastStep).toBeLessThan(firstStep);
		expect(forecast[0].predicted).toBeCloseTo(6392, 0);
	});

	it('never forecasts the current month below what has already been received', () => {
		const series = makeSeries(FIXTURES.flat, 1);
		const currentMonth = nextMonth(series);
		const baseline = forecastDonations(series, 3, { currentMonth });
		const withActuals = forecastDonations(series, 3, {
			currentMonth,
			monthToDate: 9000,
			monthElapsedFraction: 0.4
		});
		expect(withActuals[0].predicted).toBeGreaterThanOrEqual(9000);
		expect(withActuals[1].predicted).toBe(baseline[1].predicted);
	});

	it('leans on the pace so far only late in the month', () => {
		const series = makeSeries({ months: 24, level: 5000, noise: 0 }, 1);
		const currentMonth = nextMonth(series);
		const early = forecastDonations(series, 1, {
			currentMonth,
			monthToDate: 600,
			monthElapsedFraction: 0.1
		});
		const late = forecastDonations(series, 1, {
			currentMonth,
			monthToDate: 5400,
			monthElapsedFraction: 0.9
		});
		expect(early[0].predicted).toBeCloseTo(5010, 0);
		expect(late[0].predicted).toBeCloseTo(5810, 0);
	});

	it('rates a steady history higher than an erratic one', () => {
		const steady = makeSeries({ months: 36, level: 5000, noise: 0.03 }, 1);
		const erratic = makeSeries({ months: 36, level: 5000, noise: 0.6 }, 1);
		expect(forecastDonations(steady, 1, { currentMonth: nextMonth(steady) })[0].confidence).toBe(
			'high'
		);
		expect(forecastDonations(erratic, 1, { currentMonth: nextMonth(erratic) })[0].confidence).toBe(
			'low'
		);
	});
});

describe('backtestForecast', () => {
	it('reports zero error for a perfectly flat history', () => {
		const series = makeSeries({ months: 24, level: 5000, noise: 0 }, 1);
		const result = backtestForecast(series);
		expect(result.wape).toBeCloseTo(0);
		expect(result.horizons).toHaveLength(3);
		expect(result.horizons[0].samples).toBe(18);
	});

	it('skips unentered months when scoring', () => {
		const series = makeSeries({ months: 24, level: 5000, noise: 0, missingAt: [12, 13] }, 1);
		const result = backtestForecast(series);
		expect(result.wape).toBeCloseTo(0);
		expect(result.horizons[0].samples).toBe(16);
	});

	it('is at least as accurate as the previous engine on every fixture', () => {
		for (const [name, spec] of Object.entries(FIXTURES)) {
			expect(averageWape(name, spec), name).toBeLessThanOrEqual(PREVIOUS_ENGINE_WAPE[name]);
		}
	});

	it('is clearly more accurate where the previous engine was biased', () => {
		for (const name of ['growthSeasonal', 'missingMonths', 'zeroMonth']) {
			expect(averageWape(name, FIXTURES[name]), name).toBeLessThan(
				PREVIOUS_ENGINE_WAPE[name] * 0.85
			);
		}
	});
});
