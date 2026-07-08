import { writable, type Writable, get } from 'svelte/store';
import {
	getAllKhocOpeningBalances,
	getKhocOpeningBalance,
	setKhocOpeningBalance,
	deleteKhocOpeningBalance,
	type OpeningBalance
} from '$lib/firestore';
import { user } from '$lib/stores/auth';

// Create reactive stores for KHOC opening balance data
export const khocOpeningBalances: Writable<OpeningBalance[]> = writable([]);
export const khocOpeningBalanceLoading: Writable<boolean> = writable(false);
export const khocOpeningBalanceError: Writable<string | null> = writable(null);

// KHOC Opening Balance store actions
export const khocOpeningBalanceStore = {
	// Load all KHOC opening balances from Firestore
	async loadOpeningBalances() {
		const uid = get(user)?.uid;
		if (!uid) { khocOpeningBalanceError.set('Not authenticated'); return; }

		khocOpeningBalanceLoading.set(true);
		khocOpeningBalanceError.set(null);

		try {
			const data = await getAllKhocOpeningBalances(uid);
			khocOpeningBalances.set(data);
		} catch (err) {
			khocOpeningBalanceError.set(err instanceof Error ? err.message : 'Failed to load KHOC opening balances');
			console.error('Error loading KHOC opening balances:', err);
		} finally {
			khocOpeningBalanceLoading.set(false);
		}
	},

	// Set KHOC opening balance for a specific month
	async setMonthOpeningBalance(month: string, balance: number, note?: string, date?: string) {
		const uid = get(user)?.uid;
		if (!uid) throw new Error('Not authenticated');

		khocOpeningBalanceLoading.set(true);
		khocOpeningBalanceError.set(null);

		try {
			await setKhocOpeningBalance(uid, month, balance, note, date);

			// Reload all balances to get the updated data
			await this.loadOpeningBalances();
		} catch (err) {
			khocOpeningBalanceError.set(err instanceof Error ? err.message : 'Failed to set KHOC opening balance');
			console.error('Error setting KHOC opening balance:', err);
			throw err;
		} finally {
			khocOpeningBalanceLoading.set(false);
		}
	},

	// Get KHOC opening balance for a specific month
	async getMonthOpeningBalance(month: string): Promise<number> {
		const uid = get(user)?.uid;
		if (!uid) return 0;

		try {
			const balance = await getKhocOpeningBalance(uid, month);
			return balance?.balance || 0;
		} catch (err) {
			console.error('Error getting KHOC opening balance for month:', err);
			return 0;
		}
	},

	// Delete KHOC opening balance for a month
	async deleteMonthOpeningBalance(month: string) {
		const uid = get(user)?.uid;
		if (!uid) throw new Error('Not authenticated');

		khocOpeningBalanceLoading.set(true);
		khocOpeningBalanceError.set(null);

		try {
			await deleteKhocOpeningBalance(uid, month);

			// Reload all balances to get the updated data
			await this.loadOpeningBalances();
		} catch (err) {
			khocOpeningBalanceError.set(err instanceof Error ? err.message : 'Failed to delete KHOC opening balance');
			console.error('Error deleting KHOC opening balance:', err);
			throw err;
		} finally {
			khocOpeningBalanceLoading.set(false);
		}
	},

	// Clear error
	clearError() {
		khocOpeningBalanceError.set(null);
	}
};