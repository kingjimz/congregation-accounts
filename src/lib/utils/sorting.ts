import type { Transaction } from '$lib/types';

export type SortField = 'date' | 'amount' | 'description' | 'category' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
	field: SortField;
	order: SortOrder;
}

const STORAGE_KEY = 'transaction_sort_preference';

/**
 * Get sort preference from localStorage
 */
export function getSortPreference(): SortConfig {
	if (typeof window === 'undefined') {
		return { field: 'date', order: 'desc' };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as SortConfig;
			// Validate the stored preference
			if (isValidSortConfig(parsed)) {
				return parsed;
			}
		}
	} catch (error) {
		console.warn('Failed to load sort preference from localStorage:', error);
	}

	return { field: 'date', order: 'desc' };
}

/**
 * Save sort preference to localStorage
 */
export function saveSortPreference(config: SortConfig): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
	} catch (error) {
		console.warn('Failed to save sort preference to localStorage:', error);
	}
}

/**
 * Validate sort configuration
 */
function isValidSortConfig(config: unknown): config is SortConfig {
	if (!config || typeof config !== 'object') return false;
	
	const validFields: SortField[] = ['date', 'amount', 'description', 'category', 'type'];
	const validOrders: SortOrder[] = ['asc', 'desc'];
	
	if ('field' in config && 'order' in config) {
		return validFields.includes((config as SortConfig).field) && validOrders.includes((config as SortConfig).order);
	}
	
	return false;
}

/**
 * Sort transactions by the specified field and order
 */
export function sortTransactions(
	transactions: Transaction[],
	field: SortField,
	order: SortOrder
): Transaction[] {
	const sorted = [...transactions].sort((a, b) => {
		let comparison = 0;

		switch (field) {
			case 'date':
				comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
				break;
			case 'amount':
				comparison = a.amount - b.amount;
				break;
			case 'description':
				comparison = a.description.localeCompare(b.description);
				break;
			case 'category':
				comparison = a.category.localeCompare(b.category);
				break;
			case 'type':
				comparison = a.type.localeCompare(b.type);
				break;
			default:
				return 0;
		}

		return order === 'asc' ? comparison : -comparison;
	});

	return sorted;
}

/**
 * Get sort field label
 */
export function getSortFieldLabel(field: SortField): string {
	const labels: Record<SortField, string> = {
		date: 'Date',
		amount: 'Amount',
		description: 'Description',
		category: 'Category',
		type: 'Type'
	};
	return labels[field];
}

