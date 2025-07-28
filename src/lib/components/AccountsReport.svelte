<script lang="ts">
	import { PdfReportService, type MonthlyReportData } from '$lib/services/PdfReportService';
	import { Button } from '$lib/components/ui';
	import { formatMonthYear } from '$lib/utils';
	import type { Transaction, OpeningBalance } from '$lib/types';

	interface Props {
		month: string;
		transactions: Transaction[];
		openingBalance: OpeningBalance | null;
		congregationName?: string;
		loading?: boolean;
	}

	let { 
		month,
		transactions, 
		openingBalance,
		congregationName = 'Bolaoen Congregation',
		loading = false 
	}: Props = $props();

	let isGenerating = $state(false);

	function prepareReportData(): MonthlyReportData {
		return {
			month,
			transactions,
			openingBalance,
			congregationName,
			reportDate: new Date().toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		};
	}

	async function generateAndDownloadPDF() {
		if (isGenerating) return;
		
		isGenerating = true;
		try {
			const reportData = prepareReportData();
			const filename = `monthly-report-${month}-bolaoen-congregation.pdf`;
			PdfReportService.downloadReport(reportData, filename);
		} catch (error) {
			console.error('Error generating PDF:', error);
			alert('Failed to generate PDF report. Please try again.');
		} finally {
			isGenerating = false;
		}
	}

	async function previewPDF() {
		if (isGenerating) return;
		
		isGenerating = true;
		try {
			const reportData = prepareReportData();
			PdfReportService.previewReport(reportData);
		} catch (error) {
			console.error('Error previewing PDF:', error);
			alert('Failed to preview PDF report. Please try again.');
		} finally {
			isGenerating = false;
		}
	}

	const monthName = $derived(formatMonthYear(month));
	const hasTransactions = $derived(transactions.length > 0);
</script>

<div class="accounts-report mt-3">
	<div class="report-header">
		<h3 class="report-title">📊 Generate Monthly Report</h3>
		<p class="report-subtitle">
			Create a comprehensive PDF report for {monthName}
		</p>
	</div>

	<div class="report-summary">
		<div class="summary-item">
			<span class="summary-label">Reporting Period:</span>
			<span class="summary-value">{monthName}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Total Transactions:</span>
			<span class="summary-value">{transactions.length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Organization:</span>
			<span class="summary-value">{congregationName}</span>
		</div>
	</div>

	{#if !hasTransactions && !openingBalance}
		<div class="no-data-notice">
			<p>⚠️ No data available for this month</p>
			<p class="notice-text">Add transactions or set an opening balance to generate a meaningful report.</p>
		</div>
	{:else}
		<div class="report-actions">
			<Button
				variant="secondary"
				onclick={previewPDF}
				disabled={loading || isGenerating}
				class="preview-btn"
			>
				{#if isGenerating}
					<span class="loading-spinner"></span>
					Generating...
				{:else}
					👁️ Preview Report
				{/if}
			</Button>

			<Button
				variant="primary"
				onclick={generateAndDownloadPDF}
				disabled={loading || isGenerating}
				class="download-btn"
			>
				{#if isGenerating}
					<span class="loading-spinner"></span>
					Generating...
				{:else}
					📄 Download PDF
				{/if}
			</Button>
		</div>

		<div class="report-info">
			<h4>📋 Report Contents</h4>
			<ul class="report-contents">
				<li>Monthly financial summary with opening and closing balances</li>
				<li>Complete transaction listing sorted by date</li>
				<li>Income and expense breakdown by category</li>
				<li>Professional formatting suitable for presentation</li>
			</ul>
		</div>
	{/if}
</div>

<style>
	.accounts-report {
		background: var(--color-surface-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.report-header {
		margin-bottom: 1rem;
	}

	.report-title {
		margin: 0 0 0.5rem 0;
		color: var(--color-text-primary);
		font-size: 1.125rem;
		font-weight: 600;
	}

	.report-subtitle {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.report-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--color-surface-secondary);
		border-radius: 6px;
		border: 1px solid var(--color-border-secondary);
	}

	.summary-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.summary-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.summary-value {
		font-size: 0.875rem;
		color: var(--color-text-primary);
		font-weight: 600;
	}

	.no-data-notice {
		text-align: center;
		padding: 2rem 1rem;
		background: var(--color-surface-secondary);
		border-radius: 6px;
		border: 2px dashed var(--color-border-secondary);
	}

	.no-data-notice p {
		margin: 0.5rem 0;
		color: var(--color-text-secondary);
	}

	.no-data-notice p:first-child {
		color: var(--color-text-primary);
		font-weight: 600;
	}

	.notice-text {
		font-size: 0.875rem;
	}

	.report-actions {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.report-actions :global(.preview-btn),
	.report-actions :global(.download-btn) {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.loading-spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.report-info {
		background: var(--color-surface-elevated);
		border-radius: 6px;
		padding: 1rem;
		border: 1px solid var(--color-border-secondary);
	}

	.report-info h4 {
		margin: 0 0 0.75rem 0;
		color: var(--color-text-primary);
		font-size: 1rem;
		font-weight: 600;
	}

	.report-contents {
		margin: 0;
		padding-left: 1.25rem;
		color: var(--color-text-secondary);
	}

	.report-contents li {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.report-contents li:last-child {
		margin-bottom: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.accounts-report {
			padding: 1rem;
		}

		.report-actions {
			flex-direction: column;
		}

		.summary-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
	}
</style>