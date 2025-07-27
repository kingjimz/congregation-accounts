// Application constants

// Transaction categories
export const INCOME_CATEGORIES = [
  'Worldwide Work Donations',
  'Local Congregation Donations',
  'Other Income'
] as const;

export const EXPENSE_CATEGORIES = [
  'Worldwide Work Expenses',
  'Local Congregation Expenses',
  'Other Expenses'
] as const;

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;

// Category display shortcuts
export const CATEGORY_SHORTCUTS: Record<string, string> = {
  'Local Congregation Donations': 'Local Donations',
  'Worldwide Work Donations': 'Worldwide Donations',
  'Local Congregation Expenses': 'Local Expenses',
  'Worldwide Work Expenses': 'Worldwide Expenses'
};

// Validation rules
export const VALIDATION_RULES = {
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999.99,
  MIN_DESCRIPTION_LENGTH: 3,
  MAX_DESCRIPTION_LENGTH: 200,
  MIN_NOTE_LENGTH: 0,
  MAX_NOTE_LENGTH: 500
} as const;

// Date/time constants
export const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD',
  MONTH_YEAR: 'YYYY-MM',
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_MONTH: 'MMMM YYYY'
} as const;

// Currency settings
export const CURRENCY_CONFIG = {
  LOCALE: 'en-PH',
  CURRENCY: 'PHP',
  MINIMUM_FRACTION_DIGITS: 2,
  MAXIMUM_FRACTION_DIGITS: 2
} as const;

// Firestore collection names
export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  OPENING_BALANCES: 'opening_balances'
} as const;

// UI Configuration
export const UI_CONFIG = {
  RECENT_TRANSACTIONS_LIMIT: 5,
  SCROLL_THRESHOLD: 50,
  SCROLL_DEBOUNCE_MS: 100,
  MIN_SCROLL_TO_HIDE_NAV: 100
} as const;
