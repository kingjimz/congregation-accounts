import { PDFDocument } from 'pdf-lib';
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

  /**
   * Loads the PDF template (S-30_E.pdf) and fills it with data using text positioning
   * Template should be placed at: static/pdfs/S-30_E.pdf
   */
  public static async generateMonthlyReport(data: MonthlyReportData): Promise<Uint8Array> {
    try {
      // Load the PDF template
      const templatePath = '/pdfs/S-30_E.pdf';
      const templateResponse = await fetch(templatePath);
      
      if (!templateResponse.ok) {
        throw new Error(`Template PDF not found at ${templatePath}. Please add S-30_E.pdf to the static/pdfs/ directory.`);
      }

      const templateBytes = await templateResponse.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Verify the PDF has pages
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        throw new Error('Template PDF has no pages.');
      }

      // Try to access form fields and fill them directly
      try {
        const form = pdfDoc.getForm();
        const formFields = form.getFields();
        
        console.log('Available form fields in PDF:');
        formFields.forEach((field) => {
          const fieldName = field.getName();
          const fieldType = field.constructor.name;
          console.log(`- Field: "${fieldName}", Type: ${fieldType}`);
        });
        
        // Prepare all data values
        const congregationName = data.congregationName || 'Bolaoen Congregation';
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        
        // For PDF form fields that are used in calculations, use plain numeric strings (no commas)
        // The PDF's format script will handle the display formatting with commas
        // Format: "1234.56" (no commas, with 2 decimal places)
        const openingBalanceForCalc = this.formatAmountForCalculation(openingBalanceAmount);
        const www_donations_forCalc = this.formatAmountForCalculation(www_donation);
        const lce_donations_forCalc = this.formatAmountForCalculation(lce_donations);
        
        // Map data to form fields by exact field names
        // Using plain numeric strings (no commas) for calculated fields
        // The PDF's format script will add commas for display
        const fieldMappings: Record<string, string> = {
          '900_1_Text': congregationName,
          '900_2_Text': monthYear,
          '901_1_S30_Value': openingBalanceForCalc,
          '901_2_S30_Value': lce_donations_forCalc,
          '901_7_S30_Value': www_donations_forCalc,
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
            
            // Try to get the text field
            const textField = form.getTextField(fieldName);
            
            // Check if there's a direct mapping
            if (fieldMappings[fieldName]) {
              textField.setText(fieldMappings[fieldName]);
              console.log(`✓ Filled field "${fieldName}" with: ${fieldMappings[fieldName]}`);
            }
          } catch {
            // Skip if field can't be accessed
          }
        });
      } catch {
        // PDF might not have form fields, continue with manual positioning
        console.log('PDF does not have interactive form fields, using manual positioning');
      }
     
      console.log(data);

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      console.error('Error generating PDF from template:', error);
      throw error;
    }
  }

  public static async downloadReport(data: MonthlyReportData, filename?: string): Promise<void> {
    try {
      const pdfBytes = await this.generateMonthlyReport(data);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `monthly-report-${data.month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  public static async previewReport(data: MonthlyReportData): Promise<void> {
    try {
      const pdfBytes = await this.generateMonthlyReport(data);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      throw error;
    }
  }
}
