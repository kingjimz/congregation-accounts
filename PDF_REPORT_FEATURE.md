# PDF Report Generation Feature

## Overview
The Congregation Accounts application now includes a comprehensive PDF report generation feature that creates professional monthly financial reports suitable for presentation to congregation members or administrative purposes.

## Features

### 📊 Professional Monthly Reports
- **Complete Financial Summary**: Opening balance, total income, total expenses, and ending balance in a wide landscape layout
- **Detailed Transaction Listing**: All transactions for the selected month, sorted by date with full visibility of all columns
- **Category Breakdown**: Separate sections for Worldwide Work and Local Congregation activities
- **Professional Formatting**: Clean, printer-friendly landscape layout with proper headers and footers optimized for full transaction visibility

### 🎯 Key Components

#### 1. Monthly Summary Section
- Opening balance (manual or calculated from previous month)
- Total income with green formatting
- Total expenses with red formatting
- Ending balance with color-coded success/warning indicators
- Transaction count statistics

#### 2. Transaction Details Section
- Compact table layout with optimized column widths for maximum visibility
- Date, description, category, type, and amount columns all fully visible in landscape format
- Income transactions marked with green "+" prefix
- Expense transactions marked with red "-" prefix
- Automatic page breaks for longer transaction lists
- Organized in chronological order
- Compressed spacing to fit more transactions per page while maintaining readability

#### 3. Report Header & Footer
- Organization name (customizable)
- Report generation date
- Report period (month/year)
- Page numbering and branding

## How to Use

### From the Dashboard
1. Navigate to the main dashboard
2. Select the desired month using the month selector
3. Scroll to the "Generate Monthly Report" section
4. Choose from two options:
   - **👁️ Preview Report**: Opens PDF in a new tab for review
   - **📄 Download PDF**: Directly downloads the PDF file

### From the Transactions Page
1. Go to the Transactions page
2. Select the month you want to report on
3. Find the PDF Report Generation section below the monthly balance
4. Use either Preview or Download buttons

### File Naming Convention
Downloaded PDFs are automatically named: `monthly-report-YYYY-MM-bolaoen-congregation.pdf`

Example: `monthly-report-2025-01-bolaoen-congregation.pdf`

## Technical Implementation

### Dependencies
- **jsPDF**: PDF generation library
- **TypeScript**: Type safety and better development experience
- **Svelte**: Reactive UI components

### Key Files
- `src/lib/services/PdfReportService.ts`: Core PDF generation logic
- `src/lib/components/AccountsReport.svelte`: Report UI component
- `src/routes/+page.svelte`: Dashboard integration
- `src/routes/transactions/+page.svelte`: Transactions page integration

### Customization Options

#### Organization Name
Update the `congregationName` prop in the component calls:
```svelte
<AccountsReport
  month={selectedMonth}
  transactions={transactions}
  openingBalance={openingBalance}
  congregationName="Your Actual Congregation Name"
/>
```

### Styling Customization
The PDF uses legal size (8.5" x 13") landscape orientation and predefined colors and fonts that can be modified in `PdfReportService.ts`:
- **Page Size**: Legal (8.5" x 13" / 216mm x 330mm) in landscape orientation
- **Optimized Layout**: Ultra-compressed table layout for maximum data visibility
- Primary color: Indigo (#4F46E5)
- Success color: Green (#10B981)
- Error color: Red (#EF4444)
- Font: Helvetica family with smaller sizes for more data per page

## Benefits

### For Congregation Administration
- **Professional Presentation**: Clean, formal reports suitable for meetings
- **Complete Transparency**: All transactions clearly listed and categorized
- **Easy Distribution**: PDF format works on all devices and platforms
- **Archival Quality**: Permanent records that won't change over time

### For Financial Accountability
- **Audit Trail**: Complete monthly transaction history
- **Balance Verification**: Clear opening/closing balance calculations
- **Category Tracking**: Separate Worldwide Work and Local Congregation reporting
- **Date-Ordered Records**: Chronological transaction listing

### For Convenience
- **One-Click Generation**: Quick report creation from multiple pages
- **Preview Before Download**: Review reports before saving
- **Automatic Formatting**: No manual layout or calculation needed
- **Cross-Platform Compatibility**: Works on all operating systems

## Usage Examples

### Monthly Congregation Meeting
1. Select the previous month from the dashboard
2. Click "Preview Report" to review the financial summary
3. If satisfied, click "Download PDF" to get the file
4. Present or distribute the PDF during the meeting

### Annual Financial Review
1. Generate monthly reports for each month of the year
2. Use the standardized format for consistent presentation
3. Store PDFs as permanent financial records

### Treasurer Handover
1. Generate reports for all months under current treasurer
2. Provide comprehensive documentation to incoming treasurer
3. Maintain consistent reporting format across transitions

## Troubleshooting

### Common Issues

#### No Data in Report
- **Problem**: Report shows "No data available for this month"
- **Solution**: Ensure transactions exist for the selected month or set an opening balance

#### Empty Transaction List
- **Problem**: Report generates but shows no transactions
- **Solution**: Verify that transactions are properly dated within the selected month

#### Download Not Working
- **Problem**: PDF download button doesn't respond
- **Solution**: Check browser permissions for downloads and ensure JavaScript is enabled

### Browser Compatibility
- ✅ Chrome/Chromium browsers
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer not supported

## Future Enhancements

### Planned Features
- **Annual Summary Reports**: Yearly overview with monthly breakdowns
- **Category-Specific Reports**: Focus on Worldwide Work or Local Congregation only
- **Comparative Reports**: Month-to-month or year-over-year comparisons
- **Custom Date Ranges**: Generate reports for any date period
- **Export Options**: Excel/CSV formats in addition to PDF

### Customization Opportunities
- **Template Selection**: Multiple report layouts
- **Logo Integration**: Add congregation logo to reports
- **Additional Currencies**: Support for different currency formats
- **Language Localization**: Multi-language report generation

## Support
For technical issues or feature requests, please refer to the project documentation or contact the development team.
