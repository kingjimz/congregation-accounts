import type { MonthlyTotal } from './forecast';

/**
 * Synthetic donation histories for scoring the forecast. Test support only.
 */

export interface SeriesSpec {
	months: number;
	level: number;
	/** Amount added per month. */
	growth?: number;
	/** Multiplier per calendar month, Jan first. */
	seasonal?: number[];
	/** Noise as a share of the level. */
	noise: number;
	/** Month positions multiplied by `spikeFactor`. */
	spikeAt?: number[];
	spikeFactor?: number;
	/** Month positions with nothing entered. */
	missingAt?: number[];
	/** Month position from which the level is multiplied by `shiftFactor`. */
	shiftAt?: number;
	shiftFactor?: number;
	/** Calendar month (0 = Jan) that is always zero. */
	zeroCalendarMonth?: number;
	start?: string;
}

export const SEASONAL_PATTERN = [0.95, 0.9, 1.0, 1.25, 1.0, 0.95, 0.8, 0.85, 1.0, 1.05, 1.05, 1.2];

function createRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function gaussian(random: () => number): number {
	const u = Math.max(random(), 1e-12);
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

export function makeSeries(spec: SeriesSpec, seed: number): MonthlyTotal[] {
	const random = createRandom(seed);
	const [startYear, startMonth] = (spec.start ?? '2021-01').split('-').map(Number);
	const series: MonthlyTotal[] = [];

	for (let i = 0; i < spec.months; i++) {
		const date = new Date(startYear, startMonth - 1 + i);
		const calMonth = date.getMonth();
		const month = `${date.getFullYear()}-${String(calMonth + 1).padStart(2, '0')}`;
		const shock = 1 + spec.noise * gaussian(random);

		if (spec.missingAt?.includes(i)) {
			series.push({ month, total: 0, missing: true });
			continue;
		}
		if (spec.zeroCalendarMonth === calMonth) {
			series.push({ month, total: 0 });
			continue;
		}

		let total = (spec.level + (spec.growth ?? 0) * i) * (spec.seasonal?.[calMonth] ?? 1) * shock;
		if (spec.spikeAt?.includes(i)) total *= spec.spikeFactor ?? 4;
		if (spec.shiftAt !== undefined && i >= spec.shiftAt) total *= spec.shiftFactor ?? 1.3;
		series.push({ month, total: Math.max(0, Math.round(total * 100) / 100) });
	}
	return series;
}

export const FIXTURES: Record<string, SeriesSpec> = {
	flat: { months: 36, level: 5000, noise: 0.08 },
	growth: { months: 36, level: 4000, growth: 60, noise: 0.06 },
	growthSeasonal: { months: 48, level: 4000, growth: 50, seasonal: SEASONAL_PATTERN, noise: 0.06 },
	spike: { months: 36, level: 5000, noise: 0.06, spikeAt: [20] },
	missingMonths: { months: 36, level: 4000, growth: 60, noise: 0.06, missingAt: [10, 11, 22, 30] },
	zeroMonth: { months: 48, level: 5000, noise: 0.06, zeroCalendarMonth: 7 },
	short: { months: 7, level: 3000, growth: 40, noise: 0.1 },
	decline: { months: 36, level: 6000, growth: -50, noise: 0.06 },
	volatile: { months: 36, level: 5000, noise: 0.2 },
	levelShift: { months: 36, level: 4000, noise: 0.06, shiftAt: 22 }
};
