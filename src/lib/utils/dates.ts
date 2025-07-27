/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayLocalDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the next month in YYYY-MM format
 */
export function getNextMonth(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 7);
}

/**
 * Gets the previous month in YYYY-MM format
 */
export function getPreviousMonth(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
}

/**
 * Validates if a date string is in valid format
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parses a month string and returns year and month numbers
 */
export function parseMonthString(monthString: string): { year: number; month: number } {
  const [year, month] = monthString.split('-');
  return {
    year: parseInt(year),
    month: parseInt(month)
  };
}

/**
 * Gets the current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Checks if a given month is in the future
 */
export function isMonthInFuture(monthString: string): boolean {
  const current = getCurrentMonth();
  return monthString > current;
}

/**
 * Gets all months between two dates (inclusive)
 */
export function getMonthsBetween(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let current = startMonth;
  
  while (current <= endMonth) {
    months.push(current);
    current = getNextMonth(current);
  }
  
  return months;
}
