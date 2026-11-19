import { PDFDocument, PDFTextField, StandardFonts } from 'pdf-lib';
import type { Transaction, OpeningBalance } from '$lib/types';
import { formatMonthYear } from '$lib/utils';

export interface MonthlyReportData {
  month: string;
  transactions: Transaction[];
  openingBalance: OpeningBalance | null;
  congregationName?: string;
  reportDate?: string;
}

export class PdfReportService {
  // Helper to format amount without currency symbol (for display)
  private static formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  }

  // Helper to format amount as plain number string for PDF calculations (no commas, with decimals)
  private static formatAmountForCalculation(amount: number): string {
    return Math.abs(amount).toFixed(2);
  }

  // S-26 Accounts Sheet layout: 52 transaction rows on page 1.
  private static readonly S26_ROWS_PER_SHEET = 52;

  // Fixed font sizes. The templates default to auto-size, which scales every
  // field differently depending on how much text it holds.
  private static readonly S26_HEADER_FONT_SIZE = 12;
  private static readonly S26_ROW_FONT_SIZE = 9;
  private static readonly S26_MIN_ROW_FONT_SIZE = 6;
  private static readonly S26_DESCRIPTION_WIDTH = 187 - 6; // field width less padding
  private static readonly S30_FONT_SIZE = 10;

  // Which S-26 column group each transaction type is written to.
  // 901 = Receipts, 902 = Primary Account, 903 = Secondary Account.
  private static readonly S26_INCOME_COLUMN = '901';
  private static readonly S26_EXPENSE_COLUMN = '901';

  // S-26 transaction codes (TC column)
  private static s26TransactionCode(transaction: Transaction): string {
    if (transaction.type === 'expense') return 'E';
    if (transaction.category.includes('Worldwide Work')) return 'W';
    if (transaction.category.includes('Local Congregation')) return 'C';
    return '';
  }

  // Donations first within the same day, then expenses, in date order
  private static sortForAccountsSheet(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
      return 0;
    });
  }

  /**
   * Fills one copy of the S-26 template with up to 52 transactions.
   * Row n (1-52) uses these fields:
   *   date 900_{6+n}_Text_C, description 900_{58+n}_Text, TC 900_{110+n}_Text_C,
   *   IN {col}_{n}_S26Value, OUT {col}_{53+n}_S26Value
   * Column totals are {col}_53 (IN) and {col}_106 (OUT) _S26TotalValue.
   */
  private static async fillAccountsSheetPage(
    templateBytes: ArrayBuffer | Uint8Array,
    data: MonthlyReportData,
    rows: Transaction[]
  ): Promise<PDFDocument> {
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const set = (name: string, value: string) => form.getTextField(name).setText(value);

    // Header: congregation, city and province stay as saved in the template
    const [year, month] = data.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'long'
    });
    set('900_4_Text_C', monthName);
    set('900_5_Text_C', year);

    const totals: Record<string, number> = {};
    const columns = ['901', '902', '903'];

    for (let n = 1; n <= this.S26_ROWS_PER_SHEET; n++) {
      const transaction = rows[n - 1];

      // Always write every row so placeholder text saved in the template is cleared
      set(`900_${6 + n}_Text_C`, transaction ? String(parseInt(transaction.date.split('-')[2])) : '');
      set(`900_${58 + n}_Text`, transaction ? transaction.description || transaction.category : '');
      set(`900_${110 + n}_Text_C`, transaction ? this.s26TransactionCode(transaction) : '');

      const isIncome = transaction?.type === 'income';
      const target = transaction
        ? isIncome
          ? `${this.S26_INCOME_COLUMN}_${n}`
          : `${this.S26_EXPENSE_COLUMN}_${53 + n}`
        : '';

      for (const column of columns) {
        for (const index of [n, 53 + n]) {
          const key = `${column}_${index}`;
          set(`${key}_S26Value`, key === target ? this.formatAmountForCalculation(transaction.amount) : '');
        }
      }

      if (transaction) {
        const totalKey = isIncome ? `${this.S26_INCOME_COLUMN}_53` : `${this.S26_EXPENSE_COLUMN}_106`;
        totals[totalKey] = (totals[totalKey] || 0) + Math.abs(transaction.amount);
      }
    }

    for (const column of columns) {
      for (const index of [53, 106]) {
        const key = `${column}_${index}`;
        set(`${key}_S26TotalValue`, key in totals ? this.formatAmountForCalculation(totals[key]) : '');
      }
    }

    // One size for every description: the row size, or smaller only if the
    // longest description on this sheet would otherwise be cut off.
    let descriptionSize = this.S26_ROW_FONT_SIZE;
    const longest = Math.max(
      0,
      ...rows.map((t) => font.widthOfTextAtSize(t.description || t.category, descriptionSize))
    );
    if (longest > this.S26_DESCRIPTION_WIDTH) {
      descriptionSize = Math.max(
        this.S26_MIN_ROW_FONT_SIZE,
        Math.floor(((descriptionSize * this.S26_DESCRIPTION_WIDTH) / longest) * 2) / 2
      );
    }

    const headerFields = new Set([1, 2, 3, 4, 5].map((i) => `900_${i}_Text_C`));
    for (const field of form.getFields()) {
      if (!(field instanceof PDFTextField)) continue;
      const name = field.getName();
      if (!/^90[0-3]_/.test(name)) continue; // page 2 (reconciliation) is left as is
      if (headerFields.has(name)) field.setFontSize(this.S26_HEADER_FONT_SIZE);
      else if (/^900_\d+_Text$/.test(name)) field.setFontSize(descriptionSize);
      else field.setFontSize(this.S26_ROW_FONT_SIZE);
    }

    form.updateFieldAppearances(font);
    return pdfDoc;
  }

  /**
   * Fills the S-26 Accounts Sheet with every donation and expense of the month.
   * Up to 52 transactions the result stays an editable form. Beyond that, extra
   * sheets are added and the result is flattened, because copies of the same
   * form cannot share field names.
   */
  public static async fillAccountsSheet(
    templateBytes: ArrayBuffer | Uint8Array,
    data: MonthlyReportData
  ): Promise<Uint8Array> {
    const sorted = this.sortForAccountsSheet(data.transactions);
    const chunks: Transaction[][] = [];
    for (let i = 0; i < sorted.length; i += this.S26_ROWS_PER_SHEET) {
      chunks.push(sorted.slice(i, i + this.S26_ROWS_PER_SHEET));
    }
    if (chunks.length === 0) chunks.push([]);

    if (chunks.length === 1) {
      const pdfDoc = await this.fillAccountsSheetPage(templateBytes, data, chunks[0]);
      return await pdfDoc.save();
    }

    const output = await PDFDocument.create();
    let reconciliationSource: PDFDocument | null = null;
    for (const chunk of chunks) {
      const sheet = await this.fillAccountsSheetPage(templateBytes, data, chunk);
      sheet.getForm().flatten();
      // Reload so the flattened content copies cleanly
      const flattened = await PDFDocument.load(await sheet.save());
      const [page] = await output.copyPages(flattened, [0]);
      output.addPage(page);
      reconciliationSource ??= flattened;
    }
    if (reconciliationSource && reconciliationSource.getPageCount() > 1) {
      const [reconciliation] = await output.copyPages(reconciliationSource, [1]);
      output.addPage(reconciliation);
    }
    return await output.save();
  }

  /**
   * Loads the PDF template and fills it with data using text positioning
   * Template should be placed at: static/pdfs/S-30_E.pdf or static/pdfs/S-26_E.pdf
   */
  public static async generateMonthlyReport(data: MonthlyReportData, templateType: 'S-26_E' | 'S-30_E' = 'S-30_E'): Promise<Uint8Array> {
    try {
      // Load the PDF template
      const templatePath = `/pdfs/${templateType}.pdf`;
      const templateResponse = await fetch(templatePath);
      
      if (!templateResponse.ok) {
        throw new Error(`Template PDF not found at ${templatePath}. Please add ${templateType}.pdf to the static/pdfs/ directory.`);
      }

      const templateBytes = await templateResponse.arrayBuffer();

      if (templateType === 'S-26_E') {
        return await this.fillAccountsSheet(templateBytes, data);
      }

      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Verify the PDF has pages
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        throw new Error('Template PDF has no pages.');
      }

      // Embed Times Roman font for form fields
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

      // Try to access form fields and fill them directly
      try {
        const form = pdfDoc.getForm();
        const formFields = form.getFields();
        
        // Prepare all data values
        const congregationName = data.congregationName || 'Bolaoen Congregation';
        const monthYear = formatMonthYear(data.month);
        const openingBalanceAmount = data.openingBalance?.balance || 0;
        
        // Calculate donation totals
        const www_donation = data.transactions
          .filter(transaction => 
            transaction.type === 'income' && 
            transaction.category.includes('Worldwide Work Donations')
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        
        const lce_donations = data.transactions
          .filter(transaction => 
            transaction.type === 'income' && 
            transaction.category.includes('Local Congregation Donations')
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        const khoc_contributions = data.transactions
          .filter(transaction => 
            transaction.type === 'expense' && 
            transaction.category.includes('KHOC')
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0);

          const expense_resolution = data.transactions
          .filter(transaction => 
            transaction.type === 'expense' && 
            transaction.category.includes('Resolution')
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0);

          const www_expense = data.transactions
          .filter(transaction => 
            transaction.type === 'expense' && 
            transaction.category.includes('Worldwide Work Expenses')
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        
        // For PDF form fields that are used in calculations, use plain numeric strings (no commas)
        // The PDF's format script will handle the display formatting with commas
        // Format: "1234.56" (no commas, with 2 decimal places)
        const openingBalanceForCalc = this.formatAmountForCalculation(openingBalanceAmount);
        const www_donations_forCalc = this.formatAmountForCalculation(www_donation);
        const lce_donations_forCalc = this.formatAmountForCalculation(lce_donations);
        const khoc_contributions_forCalc = this.formatAmountForCalculation(khoc_contributions);
        const resolution = this.formatAmountForCalculation(expense_resolution);
        const www = this.formatAmountForCalculation(www_expense);
        
        // Map data to form fields by exact field names
        // Using plain numeric strings (no commas) for calculated fields
        // The PDF's format script will add commas for display
        const fieldMappings: Record<string, string> = {
          '900_1_Text': congregationName,
          '900_2_Text': monthYear,
          '901_1_S30_Value': openingBalanceForCalc,
          '901_2_S30_Value': lce_donations_forCalc,
          '901_7_S30_Value': www_donations_forCalc,
          '901_12_S30_Value': khoc_contributions_forCalc,
          '901_13_S30_Value' : resolution,
          '901_20_S30_Value' : www
        };
        
        // Fill form fields based on mappings
        formFields.forEach((field) => {
          try {
            const fieldName = field.getName();
            const fieldType = field.constructor.name;
            
            // Skip checkboxes for now
            if (fieldType === 'PDFCheckBox2') {
              return;
            }
            
            const textField = form.getTextField(fieldName);
            
            if (fieldMappings[fieldName]) {
              textField.setText(fieldMappings[fieldName]);
            }
            textField.setFontSize(this.S30_FONT_SIZE);
            textField.updateAppearances(timesRomanFont);
          } catch {
            // Skip if field can't be accessed
          }
        });
      } catch {
        // PDF might not have form fields, continue with manual positioning
      }
     
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      console.error('Error generating PDF from template:', error);
      throw error;
    }
  }

  public static async downloadReport(data: MonthlyReportData, filename?: string, templateType: 'S-26_E' | 'S-30_E' = 'S-30_E'): Promise<void> {
    try {
      const pdfBytes = await this.generateMonthlyReport(data, templateType);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthYear = formatMonthYear(data.month).toUpperCase().replace(' ', '_');
      link.download = filename || `${templateType}_${monthYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  public static async previewReport(data: MonthlyReportData, templateType: 'S-26_E' | 'S-30_E' = 'S-30_E'): Promise<void> {
    try {
      const pdfBytes = await this.generateMonthlyReport(data, templateType);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      throw error;
    }
  }
}
