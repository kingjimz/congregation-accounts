import { PDFCheckBox, PDFDocument, PDFTextField, StandardFonts } from 'pdf-lib';
import type { Transaction, OpeningBalance } from '$lib/types';
import { formatMonthYear } from '$lib/utils';

export interface MonthlyReportData {
  month: string;
  transactions: Transaction[];
  openingBalance: OpeningBalance | null;
  congregationName?: string;
  reportDate?: string;
}

export type ReportTemplate = 'S-26_E' | 'S-30_E';

type TemplateBytes = ArrayBuffer | Uint8Array;

/**
 * Fills the S-26 (Accounts Sheet) and S-30 (Monthly Congregation Accounts Report)
 * templates in static/pdfs/.
 *
 * The finished PDF is flattened: values are printed into the page instead of left
 * in form fields. Viewers such as macOS Preview redraw form fields themselves, in
 * their own font and at low quality, so flattening is what keeps the output sharp
 * and identical everywhere. The trade-off is that the PDF is no longer typeable,
 * and the templates' built-in calculation scripts no longer run, so every total
 * is calculated here.
 */
export class PdfReportService {
  // Fixed font sizes. The templates default to auto-size, which scales every
  // field differently depending on how much text it holds.
  private static readonly S26_HEADER_FONT_SIZE = 12;
  private static readonly S26_ROW_FONT_SIZE = 9;
  private static readonly S26_MIN_ROW_FONT_SIZE = 6;
  private static readonly S26_DESCRIPTION_WIDTH = 187 - 6; // field width less padding
  private static readonly S30_FONT_SIZE = 10;
  // Blank write-in lines under Congregation Expenditures on the S-30
  private static readonly S30_EXPENSE_LINES = 5;

  // S-26 Accounts Sheet layout: 52 transaction rows on page 1.
  private static readonly S26_ROWS_PER_SHEET = 52;

  // Which S-26 column group each transaction type is written to.
  // 901 = Receipts, 902 = Primary Account, 903 = Secondary Account.
  private static readonly S26_INCOME_COLUMN = '901';
  private static readonly S26_EXPENSE_COLUMN = '901';

  // 1234.5 -> "1,234.50"; negatives in accounting style: -1234.5 -> "(1,234.50)"
  private static formatAmount(amount: number): string {
    const text = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
    return amount < 0 ? `(${text})` : text;
  }

  // Totals are left blank when zero, as the templates' own scripts did
  private static formatTotal(amount: number): string {
    return Math.abs(amount) < 0.005 ? '' : this.formatAmount(amount);
  }

  // ---------------------------------------------------------------------------
  // S-26 Accounts Sheet
  // ---------------------------------------------------------------------------

  // Donations first within the same day, then expenses, in date order
  private static sortForAccountsSheet(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
      return 0;
    });
  }

  /**
   * Fills one copy of the S-26 template with up to 52 transactions and returns
   * it with its form fields still in place (not flattened).
   * Row n (1-52) uses these fields:
   *   date 900_{6+n}_Text_C, description 900_{58+n}_Text, TC 900_{110+n}_Text_C,
   *   IN {col}_{n}_S26Value, OUT {col}_{53+n}_S26Value
   * Column totals are {col}_53 (IN) and {col}_106 (OUT) _S26TotalValue.
   */
  public static async buildAccountsSheet(
    templateBytes: TemplateBytes,
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
      // TC column is intentionally left blank
      set(`900_${110 + n}_Text_C`, '');

      const isIncome = transaction?.type === 'income';
      const target = transaction
        ? isIncome
          ? `${this.S26_INCOME_COLUMN}_${n}`
          : `${this.S26_EXPENSE_COLUMN}_${53 + n}`
        : '';

      for (const column of columns) {
        for (const index of [n, 53 + n]) {
          const key = `${column}_${index}`;
          set(`${key}_S26Value`, key === target ? this.formatAmount(Math.abs(transaction.amount)) : '');
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
        set(`${key}_S26TotalValue`, key in totals ? this.formatAmount(totals[key]) : '');
      }
    }

    // Page 2, Accounts Sheet Summary, Primary Account. Covers the whole month,
    // not only the rows on this sheet. Summed in whole cents.
    const cents = (amount: number) => Math.round(Math.abs(amount) * 100);
    const monthTotal = (type: Transaction['type']) =>
      data.transactions.filter((t) => t.type === type).reduce((sum, t) => sum + cents(t.amount), 0);
    const balanceForward = Math.round((data.openingBalance?.balance || 0) * 100);
    const moneyIn = monthTotal('income');
    const moneyOut = monthTotal('expense');
    set('904_33_S26Amount', this.formatAmount(balanceForward / 100));
    set('904_34_S26TotalAmount', this.formatAmount(moneyIn / 100));
    set('904_35_S26TotalAmount', this.formatAmount(moneyOut / 100));
    set('904_36_S26TotalAmount', this.formatAmount((balanceForward + moneyIn - moneyOut) / 100));

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
      if (headerFields.has(name)) field.setFontSize(this.S26_HEADER_FONT_SIZE);
      else if (/^900_\d+_Text$/.test(name)) field.setFontSize(descriptionSize);
      else field.setFontSize(this.S26_ROW_FONT_SIZE);
    }

    form.updateFieldAppearances(font);
    return pdfDoc;
  }

  /**
   * Fills the S-26 Accounts Sheet with every donation and expense of the month.
   * Each 52 transactions get their own sheet, followed by the reconciliation page.
   */
  public static async fillAccountsSheet(
    templateBytes: TemplateBytes,
    data: MonthlyReportData
  ): Promise<Uint8Array> {
    const sorted = this.sortForAccountsSheet(data.transactions);
    const chunks: Transaction[][] = [];
    for (let i = 0; i < sorted.length; i += this.S26_ROWS_PER_SHEET) {
      chunks.push(sorted.slice(i, i + this.S26_ROWS_PER_SHEET));
    }
    if (chunks.length === 0) chunks.push([]);

    const first = await this.buildAccountsSheet(templateBytes, data, chunks[0]);
    first.getForm().flatten();
    if (chunks.length === 1) return await first.save();

    // Extra sheets: page 1 of further filled copies, placed before the reconciliation page
    const output = await PDFDocument.load(await first.save());
    for (let i = 1; i < chunks.length; i++) {
      const sheet = await this.buildAccountsSheet(templateBytes, data, chunks[i]);
      sheet.getForm().flatten();
      const flattened = await PDFDocument.load(await sheet.save());
      const [page] = await output.copyPages(flattened, [0]);
      output.insertPage(i, page);
    }
    return await output.save();
  }

  // ---------------------------------------------------------------------------
  // S-30 Monthly Congregation Accounts Report
  // ---------------------------------------------------------------------------

  /**
   * Fills the S-30 template and returns it with its form fields still in place
   * (not flattened). Lines (b) to (k) follow the formulas printed on the form.
   */
  public static async buildAccountsReport(
    templateBytes: TemplateBytes,
    data: MonthlyReportData
  ): Promise<PDFDocument> {
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const tx = data.transactions;
    const income = (t: Transaction) => t.type === 'income';
    const expense = (t: Transaction) => t.type === 'expense';
    const has = (t: Transaction, text: string) => t.category.includes(text);

    // Everything below is summed in whole cents so each printed line and
    // total agree exactly; amounts are converted back only when formatted.
    const cents = (amount: number) => Math.round(Math.abs(amount) * 100);
    const sumCents = (match: (t: Transaction) => boolean) =>
      tx.filter(match).reduce((sum, t) => sum + cents(t.amount), 0);

    const openingBalance = Math.round((data.openingBalance?.balance || 0) * 100);

    // Receipts
    const localDonations = sumCents((t) => income(t) && has(t, 'Local Congregation Donations'));
    const worldwideDonations = sumCents((t) => income(t) && has(t, 'Worldwide Work Donations'));
    const otherDonations = sumCents(income) - localDonations - worldwideDonations;

    // Disbursements: each expense is counted on exactly one line
    let khoc = 0;
    let resolution = 0;
    let worldwideExpenses = 0;
    // Remaining expenses, grouped by what they were entered as
    const itemized = new Map<string, { label: string; amount: number }>();

    for (const t of tx.filter(expense)) {
      const amount = cents(t.amount);
      const description = (t.description || '').trim();
      if (has(t, 'Worldwide Work Expenses')) {
        worldwideExpenses += amount;
      } else if (has(t, 'Resolution')) {
        resolution += amount;
      } else if (/khoc/i.test(t.category) || /khoc/i.test(description)) {
        khoc += amount; // Kingdom Hall operating expenses
      } else {
        const label = description || t.category;
        const key = label.toLowerCase();
        const group = itemized.get(key);
        if (group) group.amount += amount;
        else itemized.set(key, { label, amount });
      }
    }

    // The form has five write-in lines; anything beyond the four largest
    // is combined on the fifth so total (e) stays complete.
    const expenseLines = [...itemized.values()]
      .filter((line) => line.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    if (expenseLines.length > this.S30_EXPENSE_LINES) {
      const rest = expenseLines.splice(this.S30_EXPENSE_LINES - 1);
      expenseLines.push({
        label: 'Other expenses',
        amount: rest.reduce((sum, line) => sum + line.amount, 0)
      });
    }
    const localExpenses = expenseLines.reduce((sum, line) => sum + line.amount, 0);

    const totalCongregationReceipts = localDonations + otherDonations; // (b)
    const totalOtherReceipts = worldwideDonations; // (c)
    const totalReceipts = totalCongregationReceipts + totalOtherReceipts; // (d)
    const totalCongregationExpenditures = khoc + resolution + localExpenses; // (e)
    const totalOtherDisbursements = worldwideExpenses; // (f)
    const totalDisbursements = totalCongregationExpenditures + totalOtherDisbursements; // (g)
    const surplus = totalReceipts - totalDisbursements; // (h)
    const endingFunds = openingBalance + surplus; // (i)
    const reservedFunds = 0; // (j) not tracked in the app
    const availableFunds = endingFunds - reservedFunds; // (k)

    const monthYear = formatMonthYear(data.month);

    const money = (amountInCents: number) => this.formatAmount(amountInCents / 100);
    const total = (amountInCents: number) => this.formatTotal(amountInCents / 100);

    const values: Record<string, string> = {
      '900_1_Text': data.congregationName || 'Bolaoen Congregation',
      '900_2_Text': monthYear,
      '901_1_S30_Value': money(openingBalance), // (a)
      '901_2_S30_Value': money(localDonations),
      '901_6_S30_Total': total(totalCongregationReceipts),
      '901_7_S30_Value': money(worldwideDonations),
      '901_10_S30_Total': total(totalOtherReceipts),
      '901_11_S30_Total': total(totalReceipts),
      '901_12_S30_Value': money(khoc),
      '901_13_S30_Value': money(resolution),
      '901_19_S30_Total': total(totalCongregationExpenditures),
      '901_20_S30_Value': money(worldwideExpenses),
      '901_23_S30_Total': total(totalOtherDisbursements),
      '901_24_S30_Total': total(totalDisbursements),
      '901_25_S30_Total': total(surplus),
      '901_26_S30_Total': total(endingFunds),
      '901_29_S30_Total': total(reservedFunds),
      '901_30_S30_Total': total(availableFunds),
      // Page 2: announcement
      '900_17_Text_C': monthYear,
      '901_31_S30_Total': total(totalCongregationReceipts), // figure (b)
      '901_32_S30_Total': total(totalCongregationExpenditures), // figure (e)
      '901_33_S30_Total': total(endingFunds), // figure (i)
      '901_34_S30_Total': total(totalOtherDisbursements) // figure (f)
    };

    // Write-in lines, used only when there is something to report
    if (otherDonations > 0) {
      values['900_3_Text'] = 'Other donations';
      values['901_4_S30_Value'] = money(otherDonations);
    }
    // Labels are 900_7..900_11, amounts are 901_14..901_18
    expenseLines.forEach((line, i) => {
      values[`900_${7 + i}_Text`] = line.label;
      values[`901_${14 + i}_S30_Value`] = money(line.amount);
    });

    for (const field of form.getFields()) {
      if (!(field instanceof PDFTextField)) continue;
      const value = values[field.getName()];
      if (value !== undefined) field.setText(value);
      field.setFontSize(this.S30_FONT_SIZE);
    }

    form.updateFieldAppearances(font);
    return pdfDoc;
  }

  public static async fillAccountsReport(
    templateBytes: TemplateBytes,
    data: MonthlyReportData
  ): Promise<Uint8Array> {
    const pdfDoc = await this.buildAccountsReport(templateBytes, data);
    const form = pdfDoc.getForm();
    // The page already prints the two checkbox squares on page 2; flattening the
    // unticked checkbox fields on top of them would draw a second outline.
    for (const field of form.getFields()) {
      if (field instanceof PDFCheckBox) form.removeField(field);
    }
    form.flatten();
    return await pdfDoc.save();
  }

  // ---------------------------------------------------------------------------
  // Entry points
  // ---------------------------------------------------------------------------

  /**
   * Loads a template from static/pdfs/ and returns the filled, flattened PDF.
   */
  public static async generateMonthlyReport(
    data: MonthlyReportData,
    templateType: ReportTemplate = 'S-30_E'
  ): Promise<Uint8Array> {
    try {
      const templatePath = `/pdfs/${templateType}.pdf`;
      const templateResponse = await fetch(templatePath);

      if (!templateResponse.ok) {
        throw new Error(
          `Template PDF not found at ${templatePath}. Please add ${templateType}.pdf to the static/pdfs/ directory.`
        );
      }

      const templateBytes = await templateResponse.arrayBuffer();
      return templateType === 'S-26_E'
        ? await this.fillAccountsSheet(templateBytes, data)
        : await this.fillAccountsReport(templateBytes, data);
    } catch (error) {
      console.error('Error generating PDF from template:', error);
      throw error;
    }
  }

  public static async downloadReport(
    data: MonthlyReportData,
    filename?: string,
    templateType: ReportTemplate = 'S-30_E'
  ): Promise<void> {
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

  public static async previewReport(
    data: MonthlyReportData,
    templateType: ReportTemplate = 'S-30_E'
  ): Promise<void> {
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
