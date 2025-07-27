// Form data interfaces
export interface TransactionFormData {
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date?: string;
}

export interface OpeningBalanceFormData {
  balance: number;
  note: string;
  month: string;
}

// Monthly report interface
export interface MonthlyReport {
  month: string;
  monthName: string;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  endingBalance: number;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
}

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
