import type { Timestamp } from 'firebase/firestore';

// Core transaction interface
export interface Transaction {
  id?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Opening balance interface
export interface OpeningBalance {
  id?: string;
  month: string; // YYYY-MM format
  balance: number;
  note?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Computed transaction data for UI
export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
}

// Monthly data aggregation
export interface MonthlyData {
  month: string;
  transactions: Transaction[];
  openingBalance: OpeningBalance | null;
  summary: TransactionSummary;
  endingBalance: number;
}
