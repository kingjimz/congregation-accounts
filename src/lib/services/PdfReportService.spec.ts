import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { PdfReportService, type MonthlyReportData } from './PdfReportService';
import type { Transaction } from '$lib/types';

const s26 = readFileSync('static/pdfs/S-26_E.pdf');
const s30 = readFileSync('static/pdfs/S-30_E.pdf');

const tx = (
	date: string,
	type: 'income' | 'expense',
	category: string,
	amount: number,
	description = ''
): Transaction => ({ date, type, category, amount, description });

const reader = (doc: PDFDocument) => (name: string) =>
	doc.getForm().getTextField(name).getText() ?? '';

describe('S-26 accounts sheet', () => {
	it('lists donations and expenses in date order with totals', async () => {
		const data: MonthlyReportData = {
			month: '2026-10',
			openingBalance: null,
			transactions: [
				tx('2026-10-12', 'expense', 'Local Congregation Expenses', 500, 'Electric bill'),
				tx('2026-10-05', 'income', 'Local Congregation Donations', 1234.5, 'Contributions - Local Congregation Expenses'),
				tx('2026-10-05', 'income', 'Worldwide Work Donations', 300, 'Contributions to Worldwide Work')
			]
		};
		// Same order fillAccountsSheet uses: by date, donations first
		const rows = [data.transactions[1], data.transactions[2], data.transactions[0]];
		const get = reader(await PdfReportService.buildAccountsSheet(s26, data, rows));

		expect(get('900_4_Text_C')).toBe('October');
		expect(get('900_5_Text_C')).toBe('2026');

		// Row 1: local donation on the 5th, in the IN column
		expect(get('900_7_Text_C')).toBe('5');
		expect(get('900_59_Text')).toBe('Contributions - Local Congregation Expenses');
		expect(get('900_111_Text_C')).toBe('');
		expect(get('901_1_S26Value')).toBe('1,234.50');

		// Row 2: worldwide donation
		expect(get('900_112_Text_C')).toBe('');
		expect(get('901_2_S26Value')).toBe('300.00');

		// Row 3: expense goes to the OUT column
		expect(get('900_9_Text_C')).toBe('12');
		expect(get('900_61_Text')).toBe('Electric bill');
		expect(get('900_113_Text_C')).toBe('');
		expect(get('901_3_S26Value')).toBe('');
		expect(get('901_56_S26Value')).toBe('500.00');

		// Placeholder text saved in the template is cleared from unused rows
		expect(get('900_63_Text')).toBe('');

		expect(get('901_53_S26TotalValue')).toBe('1,534.50');
		expect(get('901_106_S26TotalValue')).toBe('500.00');
	});

	it('fills the Primary Account summary on page 2 for the whole month', async () => {
		const data: MonthlyReportData = {
			month: '2026-10',
			openingBalance: { month: '2026-10', balance: 15000 },
			transactions: [
				tx('2026-10-05', 'income', 'Local Congregation Donations', 1234.5),
				tx('2026-10-05', 'income', 'Worldwide Work Donations', 300),
				tx('2026-10-12', 'expense', 'Local Congregation Expenses', 500.25),
				tx('2026-10-20', 'expense', 'KHOC', 2000)
			]
		};
		// Only one row on this sheet; the summary still covers every transaction
		const get = reader(await PdfReportService.buildAccountsSheet(s26, data, [data.transactions[0]]));

		expect(get('904_33_S26Amount')).toBe('15,000.00'); // Balance Forward
		expect(get('904_34_S26TotalAmount')).toBe('1,534.50'); // IN
		expect(get('904_35_S26TotalAmount')).toBe('2,500.25'); // OUT
		expect(get('904_36_S26TotalAmount')).toBe('14,034.25'); // Ending Balance
	});

	it('is flattened, with one sheet per 52 transactions before the reconciliation page', async () => {
		const one = await PDFDocument.load(
			await PdfReportService.fillAccountsSheet(s26, { month: '2026-10', openingBalance: null, transactions: [] })
		);
		expect(one.getPageCount()).toBe(2);
		expect(one.getForm().getFields()).toHaveLength(0);

		const transactions = Array.from({ length: 60 }, (_, i) =>
			tx(`2026-10-${String((i % 28) + 1).padStart(2, '0')}`, 'income', 'Local Congregation Donations', 10)
		);
		const many = await PDFDocument.load(
			await PdfReportService.fillAccountsSheet(s26, { month: '2026-10', openingBalance: null, transactions })
		);
		expect(many.getPageCount()).toBe(3);
		expect(many.getForm().getFields()).toHaveLength(0);
	});
});

describe('S-30 accounts report', () => {
	const data: MonthlyReportData = {
		month: '2026-10',
		openingBalance: { month: '2026-10', balance: 15000 },
		congregationName: 'Bolaoen Congregation',
		transactions: [
			tx('2026-10-04', 'income', 'Local Congregation Donations', 3480.5),
			tx('2026-10-04', 'income', 'Worldwide Work Donations', 2150),
			tx('2026-10-06', 'income', 'Other Donations', 100),
			tx('2026-10-10', 'expense', 'Local Congregation Expenses', 1875.25, 'Electric bill'),
			tx('2026-10-15', 'expense', 'KHOC', 2000),
			tx('2026-10-16', 'expense', 'Resolution', 500),
			tx('2026-10-20', 'expense', 'Worldwide Work Expenses', 2150)
		]
	};

	it('calculates every total line', async () => {
		const get = reader(await PdfReportService.buildAccountsReport(s30, data));

		expect(get('900_2_Text')).toBe('October 2026');
		expect(get('901_1_S30_Value')).toBe('15,000.00'); // (a)
		expect(get('901_2_S30_Value')).toBe('3,480.50');
		expect(get('900_3_Text')).toBe('Other donations');
		expect(get('901_4_S30_Value')).toBe('100.00');
		expect(get('901_6_S30_Total')).toBe('3,580.50'); // (b)
		expect(get('901_10_S30_Total')).toBe('2,150.00'); // (c)
		expect(get('901_11_S30_Total')).toBe('5,730.50'); // (d)
		expect(get('901_12_S30_Value')).toBe('2,000.00');
		expect(get('901_13_S30_Value')).toBe('500.00');
		expect(get('900_7_Text')).toBe('Electric bill');
		expect(get('901_14_S30_Value')).toBe('1,875.25');
		expect(get('901_19_S30_Total')).toBe('4,375.25'); // (e)
		expect(get('901_23_S30_Total')).toBe('2,150.00'); // (f)
		expect(get('901_24_S30_Total')).toBe('6,525.25'); // (g)
		expect(get('901_25_S30_Total')).toBe('(794.75)'); // (h) deficit
		expect(get('901_26_S30_Total')).toBe('14,205.25'); // (i)
		expect(get('901_30_S30_Total')).toBe('14,205.25'); // (k)

		// Page 2 announcement repeats (b), (e), (i), (f)
		expect(get('900_17_Text_C')).toBe('October 2026');
		expect(get('901_31_S30_Total')).toBe('3,580.50');
		expect(get('901_32_S30_Total')).toBe('4,375.25');
		expect(get('901_33_S30_Total')).toBe('14,205.25');
		expect(get('901_34_S30_Total')).toBe('2,150.00');
	});

	const report = async (transactions: Transaction[]) =>
		reader(
			await PdfReportService.buildAccountsReport(s30, {
				month: '2026-10',
				openingBalance: { month: '2026-10', balance: 0 },
				congregationName: 'Bolaoen Congregation',
				transactions
			})
		);
	const local = (amount: number, description: string) =>
		tx('2026-10-10', 'expense', 'Local Congregation Expenses', amount, description);

	it('lists each local expense under its own label, largest first', async () => {
		const get = await report([
			local(300, 'Water bill'),
			local(1200, 'Electric bill'),
			local(250.5, 'Cleaning supplies'),
			local(100, 'water bill '),
			local(75, '')
		]);

		expect(get('900_7_Text')).toBe('Electric bill');
		expect(get('901_14_S30_Value')).toBe('1,200.00');
		expect(get('900_8_Text')).toBe('Water bill'); // merged, first spelling kept
		expect(get('901_15_S30_Value')).toBe('400.00');
		expect(get('900_9_Text')).toBe('Cleaning supplies');
		expect(get('901_16_S30_Value')).toBe('250.50');
		expect(get('900_10_Text')).toBe('Local Congregation Expenses'); // no description
		expect(get('901_17_S30_Value')).toBe('75.00');
		expect(get('900_11_Text')).toBe('');
		expect(get('901_19_S30_Total')).toBe('1,925.50'); // (e)
	});

	it('puts KHOC contributions under Kingdom Hall operating expenses', async () => {
		const get = await report([
			local(1500, 'KHOC Contributions'),
			tx('2026-10-15', 'expense', 'KHOC', 500),
			local(200, 'Electric bill')
		]);

		expect(get('901_12_S30_Value')).toBe('2,000.00');
		expect(get('900_7_Text')).toBe('Electric bill');
		expect(get('901_14_S30_Value')).toBe('200.00');
		expect(get('900_8_Text')).toBe('');
		expect(get('901_19_S30_Total')).toBe('2,200.00'); // (e)
	});

	it('combines the smallest expenses when there are more than five labels', async () => {
		const get = await report([
			local(700, 'A'),
			local(600, 'B'),
			local(500, 'C'),
			local(400, 'D'),
			local(300, 'E'),
			local(200, 'F'),
			local(100, 'G')
		]);

		expect(get('900_10_Text')).toBe('D');
		expect(get('901_17_S30_Value')).toBe('400.00');
		expect(get('900_11_Text')).toBe('Other expenses');
		expect(get('901_18_S30_Value')).toBe('600.00');
		expect(get('901_19_S30_Total')).toBe('2,800.00'); // (e)
	});

	it('adds amounts to the exact cent', async () => {
		const get = await report([
			local(0.1, 'Stamps'),
			local(0.2, 'Stamps'),
			tx('2026-10-04', 'income', 'Local Congregation Donations', 0.3)
		]);

		expect(get('901_14_S30_Value')).toBe('0.30');
		expect(get('901_19_S30_Total')).toBe('0.30'); // (e)
		expect(get('901_25_S30_Total')).toBe(''); // (h) exactly zero
	});

	it('is flattened', async () => {
		const doc = await PDFDocument.load(await PdfReportService.fillAccountsReport(s30, data));
		expect(doc.getPageCount()).toBe(2);
		expect(doc.getForm().getFields()).toHaveLength(0);
	});
});
