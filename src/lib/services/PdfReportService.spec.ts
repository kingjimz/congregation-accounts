import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { PdfReportService } from './PdfReportService';
import type { Transaction } from '$lib/types';

const template = readFileSync('static/pdfs/S-26_E.pdf');

const tx = (date: string, type: 'income' | 'expense', category: string, amount: number, description = ''): Transaction => ({
	date,
	type,
	category,
	amount,
	description
});

describe('S-26 accounts sheet', () => {
	it('lists donations and expenses in date order with totals', async () => {
		const bytes = await PdfReportService.fillAccountsSheet(template, {
			month: '2026-10',
			openingBalance: null,
			transactions: [
				tx('2026-10-12', 'expense', 'Local Congregation Expenses', 500, 'Electric bill'),
				tx('2026-10-05', 'income', 'Local Congregation Donations', 1234.5, 'Contributions - Local Congregation Expenses'),
				tx('2026-10-05', 'income', 'Worldwide Work Donations', 300, 'Contributions to Worldwide Work')
			]
		});
		const form = (await PDFDocument.load(bytes)).getForm();
		const get = (name: string) => form.getTextField(name).getText() ?? '';

		expect(get('900_4_Text_C')).toBe('October');
		expect(get('900_5_Text_C')).toBe('2026');

		// Row 1: local donation on the 5th
		expect(get('900_7_Text_C')).toBe('5');
		expect(get('900_59_Text')).toBe('Contributions - Local Congregation Expenses');
		expect(get('900_111_Text_C')).toBe('C');
		expect(get('901_1_S26Value')).toBe('1234.50');

		// Row 2: worldwide donation
		expect(get('900_112_Text_C')).toBe('W');
		expect(get('901_2_S26Value')).toBe('300.00');

		// Row 3: expense goes to the OUT side
		expect(get('900_9_Text_C')).toBe('12');
		expect(get('900_61_Text')).toBe('Electric bill');
		expect(get('900_113_Text_C')).toBe('E');
		expect(get('901_3_S26Value')).toBe('');
		expect(get('901_56_S26Value')).toBe('500.00');

		// Placeholder text saved in the template is cleared from unused rows
		expect(get('900_63_Text')).toBe('');

		expect(get('901_53_S26TotalValue')).toBe('1534.50');
		expect(get('901_106_S26TotalValue')).toBe('500.00');
	});

	it('adds sheets when there are more than 52 transactions', async () => {
		const transactions = Array.from({ length: 60 }, (_, i) =>
			tx(`2026-10-${String((i % 28) + 1).padStart(2, '0')}`, 'income', 'Local Congregation Donations', 10)
		);
		const bytes = await PdfReportService.fillAccountsSheet(template, {
			month: '2026-10',
			openingBalance: null,
			transactions
		});
		const doc = await PDFDocument.load(bytes);
		expect(doc.getPageCount()).toBe(3);
	});
});
