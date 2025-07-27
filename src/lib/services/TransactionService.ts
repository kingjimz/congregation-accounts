import type { Transaction, OpeningBalance, MonthlyData } from '$lib/types';
import { 
  calculateTransactionSummary, 
  calculateMonthlyBalance,
  getTransactionsForMonth 
} from '$lib/utils';

/**
 * Service for handling transaction-related business logic
 */
export class TransactionService {
  /**
   * Gets all unique months from transactions and opening balances
   */
  static getAvailableMonths(
    transactions: Transaction[], 
    openingBalances: OpeningBalance[]
  ): string[] {
    const transactionMonths = transactions.map(t => t.date.slice(0, 7));
    const balanceMonths = openingBalances.map(ob => ob.month);
    
    return [...new Set([...transactionMonths, ...balanceMonths])]
      .sort()
      .reverse(); // Most recent first
  }

  /**
   * Gets the most recent month with data
   */
  static getMostRecentMonth(
    transactions: Transaction[], 
    openingBalances: OpeningBalance[]
  ): string | null {
    const availableMonths = this.getAvailableMonths(transactions, openingBalances);
    return availableMonths.length > 0 ? availableMonths[0] : null;
  }

  /**
   * Gets monthly data for a specific month
   */
  static getMonthlyData(
    month: string,
    transactions: Transaction[],
    openingBalances: OpeningBalance[]
  ): MonthlyData {
    const monthlyTransactions = getTransactionsForMonth(transactions, month);
    const openingBalance = openingBalances.find(ob => ob.month === month) || null;
    const summary = calculateTransactionSummary(monthlyTransactions);
    const endingBalance = calculateMonthlyBalance(
      openingBalance?.balance || 0, 
      monthlyTransactions
    );

    return {
      month,
      transactions: monthlyTransactions,
      openingBalance,
      summary,
      endingBalance
    };
  }

  /**
   * Gets recent transactions for a month, sorted by date
   */
  static getRecentTransactions(
    transactions: Transaction[], 
    limit: number = 5
  ): Transaction[] {
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /**
   * Checks if a next month opening balance should be suggested
   */
  static shouldSuggestNextMonthBalance(
    currentMonth: string,
    monthlyTransactions: Transaction[],
    openingBalances: OpeningBalance[]
  ): boolean {
    if (monthlyTransactions.length === 0) return false;

    const nextMonth = this.getNextMonth(currentMonth);
    const nextMonthBalance = openingBalances.find(ob => ob.month === nextMonth);
    
    return !nextMonthBalance;
  }

  /**
   * Gets the next month in YYYY-MM format
   */
  private static getNextMonth(monthString: string): string {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 7);
  }
}
