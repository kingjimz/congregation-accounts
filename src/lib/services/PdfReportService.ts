import jsPDF from 'jspdf';
import type { Transaction, OpeningBalance } from '$lib/types';
import { formatDate, formatMonthYear } from '$lib/utils';

export interface MonthlyReportData {
  month: string;
  transactions: Transaction[];
  openingBalance: OpeningBalance | null;
  congregationName?: string;
  reportDate?: string;
}

export class PdfReportService {
  private static readonly FONT_SIZE = {
    TITLE: 16,
    HEADER: 14,
    SUBHEADER: 12,
    BODY: 10,
    SMALL: 8
  };

  private static readonly COLORS = {
    PRIMARY: '#4F46E5',     // Indigo
    SUCCESS: '#10B981',     // Green
    ERROR: '#EF4444',       // Red
    TEXT: '#374151',        // Gray
    LIGHT_GRAY: '#F3F4F6'
  };

  private static readonly MARGINS = {
    LEFT: 10,   // Reduced from 20 to 10
    RIGHT: 10,  // Reduced from 20 to 10
    TOP: 15,    // Reduced from 20 to 15
    BOTTOM: 15  // Reduced from 20 to 15
  };

  // Helper method to format currency without decimal places for PDF
  private static formatCurrencyNoCents(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Helper method to wrap text within a column width
  private static wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = doc.getTextWidth(testLine);
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, truncate it
          lines.push(word.substring(0, Math.floor(maxWidth / doc.getTextWidth('M')) - 3) + '...');
          currentLine = '';
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  public static generateMonthlyReport(data: MonthlyReportData): jsPDF {
    const doc = new jsPDF('portrait', 'mm', 'legal'); // Legal size (8.5" x 13") portrait
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = this.MARGINS.TOP;

    // Set default font
    doc.setFont('helvetica');

    // Header Section
    yPosition = this.addHeader(doc, data, pageWidth, yPosition);
    yPosition += 10;

    // Summary Section
    yPosition = this.addSummarySection(doc, data, pageWidth, yPosition);
    yPosition += 10;

    // Transactions Section
    this.addTransactionsSection(doc, data, pageWidth, yPosition, pageHeight);

    // Footer
    this.addFooter(doc, pageWidth, pageHeight);

    return doc;
  }

  private static addHeader(doc: jsPDF, data: MonthlyReportData, pageWidth: number, yPosition: number): number {
    // Organization Title
    doc.setFontSize(this.FONT_SIZE.TITLE);
    doc.setTextColor(this.COLORS.PRIMARY);
    const orgTitle = data.congregationName || 'Congregation Accounts';
    doc.text(orgTitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Report Title
    doc.setFontSize(this.FONT_SIZE.HEADER);
    doc.setTextColor(this.COLORS.TEXT);
    const reportTitle = `Monthly Financial Report - ${formatMonthYear(data.month)}`;
    doc.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Report Date
    doc.setFontSize(this.FONT_SIZE.BODY);
    doc.setTextColor(this.COLORS.TEXT);
    const reportDate = data.reportDate || formatDate(new Date().toISOString().split('T')[0]);
    doc.text(`Generated on: ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;

    // Divider line
    doc.setDrawColor(this.COLORS.PRIMARY);
    doc.line(this.MARGINS.LEFT, yPosition, pageWidth - this.MARGINS.RIGHT, yPosition);
    
    return yPosition + 5;
  }

  private static addSummarySection(doc: jsPDF, data: MonthlyReportData, pageWidth: number, yPosition: number): number {
    const openingBalanceAmount = data.openingBalance?.balance || 0;
    const monthlyIncome = data.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = data.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const endingBalance = openingBalanceAmount + monthlyIncome - monthlyExpenses;

    // Section Title
    doc.setFontSize(this.FONT_SIZE.SUBHEADER);
    doc.setTextColor(this.COLORS.PRIMARY);
    doc.text('FINANCIAL SUMMARY', this.MARGINS.LEFT, yPosition);
    yPosition += 10;

    // Summary Box - adjusted for portrait layout
    doc.setDrawColor(this.COLORS.TEXT);
    doc.rect(this.MARGINS.LEFT, yPosition - 5, pageWidth - this.MARGINS.LEFT - this.MARGINS.RIGHT, 55); // Increased height from 50 to 55

    // Summary Content - centered in the box
    doc.setFontSize(this.FONT_SIZE.BODY);
    doc.setTextColor(this.COLORS.TEXT);
    const boxWidth = pageWidth - this.MARGINS.LEFT - this.MARGINS.RIGHT;
    const centerX = this.MARGINS.LEFT + (boxWidth / 2);

    // Portrait layout - stack items vertically and center them (adjusted for better vertical centering)
    // First row
    doc.text('Opening Balance:', centerX - 40, yPosition + 10);
    doc.setTextColor(this.COLORS.TEXT);
    doc.text(this.formatCurrencyNoCents(openingBalanceAmount), centerX + 20, yPosition + 10);
    
    // Second row
    doc.setTextColor(this.COLORS.TEXT);
    doc.text('Total Donations:', centerX - 40, yPosition + 22);
    doc.setTextColor(this.COLORS.SUCCESS);
    doc.text(this.formatCurrencyNoCents(monthlyIncome), centerX + 20, yPosition + 22);

    // Third row
    doc.setTextColor(this.COLORS.TEXT);
    doc.text('Total Expenses:', centerX - 40, yPosition + 34);
    doc.setTextColor(this.COLORS.ERROR);
    doc.text(this.formatCurrencyNoCents(monthlyExpenses), centerX + 20, yPosition + 34);
    
    // Fourth row
    doc.setTextColor(this.COLORS.TEXT);
    doc.text('Ending Balance:', centerX - 40, yPosition + 46);
    doc.setTextColor(endingBalance >= 0 ? this.COLORS.SUCCESS : this.COLORS.ERROR);
    doc.setFont('helvetica', 'bold');
    doc.text(this.formatCurrencyNoCents(endingBalance), centerX + 20, yPosition + 46);
    doc.setFont('helvetica', 'normal');

    return yPosition + 55;
  }

  private static addTransactionsSection(doc: jsPDF, data: MonthlyReportData, pageWidth: number, yPosition: number, pageHeight: number): number {
    // Section Title
    doc.setFontSize(this.FONT_SIZE.SUBHEADER);
    doc.setTextColor(this.COLORS.PRIMARY);
    doc.text('TRANSACTION DETAILS', this.MARGINS.LEFT, yPosition);
    yPosition += 8; // Reduced from 10 to 8

    if (data.transactions.length === 0) {
      doc.setFontSize(this.FONT_SIZE.BODY);
      doc.setTextColor(this.COLORS.TEXT);
      doc.text('No transactions found for this month.', this.MARGINS.LEFT, yPosition);
      return yPosition + 10;
    }

    // Table headers - Optimized for legal size portrait format (reduced spacing)
    const colWidths = {
      date: 25,          // Keep same
      description: 120,  // Reduced from 130 to 120 to make room
      category: 35,      // Keep same
      amount: 45         // Reduced from 50 to 45 to fit better
    };

    const startX = this.MARGINS.LEFT;
    let currentX = startX;

    // Header background - minimal height for small font
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, yPosition - 2, pageWidth - this.MARGINS.LEFT - this.MARGINS.RIGHT, 6, 'F');

    // Header text
    doc.setFontSize(this.FONT_SIZE.SMALL); // Smaller header font to match table
    doc.setTextColor(this.COLORS.TEXT);
    doc.setFont('helvetica', 'bold');

    doc.text('Date', currentX, yPosition);
    currentX += colWidths.date;
    doc.text('Description', currentX, yPosition);
    currentX += colWidths.description;
    doc.text('Category', currentX, yPosition);
    currentX += colWidths.category;
    doc.text('Amount', currentX, yPosition);

    yPosition += 6; // Reduced header spacing for smaller font
    doc.setFont('helvetica', 'normal');

    // Sort transactions by date
    const sortedTransactions = [...data.transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Transaction rows
    for (const transaction of sortedTransactions) {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) { // Increased buffer for wrapped text
        doc.addPage();
        yPosition = this.MARGINS.TOP;
      }

      currentX = startX;
      doc.setFontSize(this.FONT_SIZE.SMALL);
      doc.setTextColor(this.COLORS.TEXT);

      const rowStartY = yPosition;

      // Date
      doc.text(formatDate(transaction.date), currentX, yPosition);
      currentX += colWidths.date;

      // Description - handle text wrapping
      const descriptionLines = this.wrapText(doc, transaction.description, colWidths.description - 5);
      let descriptionY = yPosition;
      for (let i = 0; i < descriptionLines.length; i++) {
        doc.text(descriptionLines[i], currentX, descriptionY);
        if (i < descriptionLines.length - 1) {
          descriptionY += 4; // Line spacing for wrapped text
        }
      }
      currentX += colWidths.description;

      // Category (use abbreviations for Worldwide Work and Local Congregation)
      let categoryDisplay = transaction.category;
      if (transaction.category.includes('Worldwide Work')) {
        categoryDisplay = transaction.type === 'income' ? 'WWW' : 'WWE';
      } else if (transaction.category.includes('Local Congregation')) {
        categoryDisplay = transaction.type === 'income' ? 'LCD' : 'LCE';
      } else if (transaction.category.includes('Other')) {
        categoryDisplay = transaction.type === 'income' ? 'Other Donations' : 'Other Expenses';
      }
      
      // Truncate if still too long
      const category = categoryDisplay.length > 12 
        ? categoryDisplay.substring(0, 10) + '...'
        : categoryDisplay;
      doc.text(category, currentX, rowStartY);
      currentX += colWidths.category;

      // Amount - with color coding
      doc.setTextColor(transaction.type === 'income' ? this.COLORS.SUCCESS : this.COLORS.ERROR);
      doc.text(this.formatCurrencyNoCents(transaction.amount), currentX, rowStartY);

      // Calculate row height based on description lines
      const rowHeight = Math.max(5, descriptionLines.length * 4);
      yPosition = rowStartY + rowHeight;

      // Add line separator every 5 rows
      if (sortedTransactions.indexOf(transaction) % 5 === 4) {
        doc.setDrawColor(230, 230, 230);
        doc.line(startX, yPosition, pageWidth - this.MARGINS.RIGHT, yPosition);
        yPosition += 1;
      }
    }

    // Transaction summary - compressed spacing
    yPosition += 6; // Reduced from 10 to 6
    doc.setDrawColor(this.COLORS.TEXT);
    doc.line(startX, yPosition, pageWidth - this.MARGINS.RIGHT, yPosition);
    yPosition += 6; // Reduced from 8 to 6

    doc.setFontSize(this.FONT_SIZE.BODY);
    doc.setTextColor(this.COLORS.TEXT);
    doc.setFont('helvetica', 'bold');

    const incomeCount = data.transactions.filter(t => t.type === 'income').length;
    const expenseCount = data.transactions.filter(t => t.type === 'expense').length;

    doc.text(`Total Transactions: ${data.transactions.length}`, startX, yPosition);
    doc.text(`Donation Transactions: ${incomeCount}`, startX, yPosition + 8); // Display "Donation" but count income transactions
    doc.text(`Expense Transactions: ${expenseCount}`, startX, yPosition + 16);

    return yPosition + 20; // Reduced from 25 to 20
  }

  private static addFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const footerY = pageHeight - 15;
    
    doc.setFontSize(this.FONT_SIZE.SMALL);
    doc.setTextColor(this.COLORS.TEXT);
    
    // Left side - Generated info
    doc.text(`Generated by Congregation Accounts System`, this.MARGINS.LEFT, footerY);
    
    // Right side - Page number  
    const pageInfo = 'Page 1'; // Simplified for now
    doc.text(pageInfo, pageWidth - this.MARGINS.RIGHT, footerY, { align: 'right' });
    
    // Center line
    doc.setDrawColor(this.COLORS.TEXT);
    doc.line(this.MARGINS.LEFT, footerY - 5, pageWidth - this.MARGINS.RIGHT, footerY - 5);
  }

  public static downloadReport(data: MonthlyReportData, filename?: string): void {
    const doc = this.generateMonthlyReport(data);
    const fileName = filename || `monthly-report-${data.month}.pdf`;
    doc.save(fileName);
  }

  public static previewReport(data: MonthlyReportData): void {
    const doc = this.generateMonthlyReport(data);
    const pdfOutput = doc.output('bloburl');
    window.open(pdfOutput, '_blank');
  }
}
