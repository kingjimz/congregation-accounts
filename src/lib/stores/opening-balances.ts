import { writable, get } from 'svelte/store';
import type { OpeningBalance } from '$lib/firestore';
import {
	setOpeningBalance,
	getOpeningBalance,
	getAllOpeningBalances,
	deleteOpeningBalance
} from '$lib/firestore';
import { user } from '$lib/stores/auth';

// Store for opening balances data
export const openingBalances = writable<OpeningBalance[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);

// Store functions
export const openingBalanceStore = {
	// Load all opening balances
	async loadOpeningBalances() {
		const uid = get(user)?.uid;
		if (!uid) { error.set('Not authenticated'); return; }

		loading.set(true);
		error.set(null);

		try {
			const balances = await getAllOpeningBalances(uid);
			openingBalances.set(balances);
		} catch (err) {
			error.set('Failed to load opening balances');
			console.error('Error loading opening balances:', err);
		} finally {
			loading.set(false);
		}
	},

	// Get opening balance for a specific month
	async getMonthOpeningBalance(month: string): Promise<OpeningBalance | null> {
		const uid = get(user)?.uid;
		if (!uid) return null;

		try {
			return await getOpeningBalance(uid, month);
		} catch (err) {
			error.set('Failed to get opening balance');
			console.error('Error getting opening balance:', err);
			return null;
		}
	},

	// Set opening balance for a month
	async setMonthOpeningBalance(month: string, balance: number, note?: string, date?: string) {
		const uid = get(user)?.uid;
		if (!uid) { error.set('Not authenticated'); return false; }

		loading.set(true);
		error.set(null);

		try {
			await setOpeningBalance(uid, month, balance, note, date);
			// Reload opening balances to update the store
			await this.loadOpeningBalances();
			return true;
		} catch (err) {
			error.set('Failed to save opening balance');
			console.error('Error setting opening balance:', err);
			return false;
		} finally {
			loading.set(false);
		}
	},

	// Delete opening balance for a month
	async deleteMonthOpeningBalance(month: string) {
		const uid = get(user)?.uid;
		if (!uid) { error.set('Not authenticated'); return false; }

		loading.set(true);
		error.set(null);

		try {
			await deleteOpeningBalance(uid, month);
			// Reload opening balances to update the store
			await this.loadOpeningBalances();
			return true;
		} catch (err) {
			error.set('Failed to delete opening balance');
			console.error('Error deleting opening balance:', err);
			return false;
		} finally {
			loading.set(false);
		}
	},

	// Clear error
	clearError() {
		error.set(null);
	}
};
