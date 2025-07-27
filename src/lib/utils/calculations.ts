import type { Transaction, OpeningBalance, TransactionSummary, MonthlyReport } from '$lib/types';
import { formatCurrency, formatMonthYear } from './formatting';

/**
 * Calculates the monthly balance: Opening Balance + Income - Expenses
 */
export function calculateMonthlyBalance(
  openingBalance: number,
  transactions: Transaction[]
): number {
  const summary = calculateTransactionSummary(transactions);
  return openingBalance + summary.totalIncome - summary.totalExpenses;
}

/**
 * Calculates transaction summary for a list of transactions
 */
export function calculateTransactionSummary(transactions: Transaction[]): TransactionSummary {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: transactions.length
  };
}

/**
 * Generates a formatted monthly report
 */
export function generateMonthlyReport(
  month: string,
  transactions: Transaction[],
  openingBalance: OpeningBalance | null
): MonthlyReport {
  const summary = calculateTransactionSummary(transactions);
  const openingBalanceAmount = openingBalance?.balance || 0;
  const endingBalance = calculateMonthlyBalance(openingBalanceAmount, transactions);

  return {
    month,
    monthName: formatMonthYear(month),
    openingBalance: openingBalanceAmount,
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    endingBalance,
    transactionCount: summary.transactionCount,
    incomeTransactionCount: transactions.filter(t => t.type === 'income').length,
    expenseTransactionCount: transactions.filter(t => t.type === 'expense').length
  };
}

/**
 * Formats a monthly report as a text string
 */
export function formatMonthlyReportText(report: MonthlyReport): string {
  return `
MONTHLY REPORT - ${report.monthName}

=== MONTHLY BALANCE CALCULATION ===
Starting Balance: ${formatCurrency(report.openingBalance)}
Total Income: ${formatCurrency(report.totalIncome)}
Total Expenses: ${formatCurrency(report.totalExpenses)}
End of Month Balance: ${formatCurrency(report.endingBalance)}

=== TRANSACTION COUNT ===
Total Transactions: ${report.transactionCount}
Income Transactions: ${report.incomeTransactionCount}
Expense Transactions: ${report.expenseTransactionCount}

=== CALCULATION BREAKDOWN ===
${formatCurrency(report.openingBalance)} + ${formatCurrency(report.totalIncome)} - ${formatCurrency(report.totalExpenses)} = ${formatCurrency(report.endingBalance)}
  `.trim();
}

/**
 * Calculates the percentage change between two amounts
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Gets transactions for a specific month
 */
export function getTransactionsForMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter(t => t.date.startsWith(month));
}

/**
 * Groups transactions by category
 */
export function groupTransactionsByCategory(transactions: Transaction[]): Record<string, Transaction[]> {
  return transactions.reduce((groups, transaction) => {
    const category = transaction.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);
}
