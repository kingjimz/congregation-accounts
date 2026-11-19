import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDefaultDateForMonth } from './dates';

describe('getDefaultDateForMonth', () => {
	afterEach(() => vi.useRealTimers());

	it('uses today for the current month and the 1st for any other month', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 10, 19, 12));

		expect(getDefaultDateForMonth('2026-11')).toBe('2026-11-19');
		expect(getDefaultDateForMonth('2026-10')).toBe('2026-10-01');
		expect(getDefaultDateForMonth('2027-01')).toBe('2027-01-01');
		// "All" view has no month selected
		expect(getDefaultDateForMonth('')).toBe('2026-11-19');
	});
});
