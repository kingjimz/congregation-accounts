import { CURRENCY_CONFIG } from '$lib/constants';

/**
 * Formats a number as currency using the configured locale and currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_CONFIG.LOCALE, {
    style: 'currency',
    currency: CURRENCY_CONFIG.CURRENCY,
    minimumFractionDigits: CURRENCY_CONFIG.MINIMUM_FRACTION_DIGITS,
    maximumFractionDigits: CURRENCY_CONFIG.MAXIMUM_FRACTION_DIGITS
  }).format(amount);
}

/**
 * Formats a date string for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Formats a month string (YYYY-MM) for display
 */
export function formatMonthYear(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Parses a currency string back to a number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and parse as float
  return parseFloat(currencyString.replace(/[^0-9.-]+/g, '')) || 0;
}

/**
 * Formats a category name with shortcuts for display
 */
export function formatCategoryName(category: string): string {
  const categoryShortcuts: Record<string, string> = {
    'Local Congregation Donations': 'Local Donations',
    'Worldwide Work Donations': 'Worldwide Donations',
    'Local Congregation Expenses': 'Local Expenses',
    'Worldwide Work Expenses': 'Worldwide Expenses'
  };
  
  return categoryShortcuts[category] || category;
}
