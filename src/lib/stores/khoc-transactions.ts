import { writable, type Writable } from 'svelte/store';
import {
	getAllKhocTransactions,
	addKhocTransaction,
	updateKhocTransaction,
	deleteKhocTransaction,
	getUniqueKhocCategories,
	type Transaction
} from '$lib/firestore';

// Create reactive stores for KHOC transaction data
export const khocTransactions: Writable<Transaction[]> = writable([]);
export const khocCategories: Writable<string[]> = writable([]);
export const khocLoading: Writable<boolean> = writable(false);
export const khocError: Writable<string | null> = writable(null);

// KHOC Transaction store actions
export const khocTransactionStore = {
	// Load all KHOC transactions from Firestore
	async loadTransactions() {
		khocLoading.set(true);
		khocError.set(null);

		try {
			const data = await getAllKhocTransactions();
			khocTransactions.set(data);

			// Also update categories
			const uniqueCategories = await getUniqueKhocCategories();
			khocCategories.set(uniqueCategories);
		} catch (err) {
			khocError.set(err instanceof Error ? err.message : 'Failed to load KHOC transactions');
			console.error('Error loading KHOC transactions:', err);
		} finally {
			khocLoading.set(false);
		}
	},

	// Add a new KHOC transaction
	async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
		khocLoading.set(true);
		khocError.set(null);

		try {
			const id = await addKhocTransaction(transaction);

			// Add to local store with the new ID
			const newTransaction: Transaction = {
				...transaction,
				id
			};

			khocTransactions.update((current: Transaction[]) => [newTransaction, ...current]);

			// Update categories if this is a new category
			const currentCategories = await getUniqueKhocCategories();
			khocCategories.set(currentCategories);

			return id;
		} catch (err) {
			khocError.set(err instanceof Error ? err.message : 'Failed to add KHOC transaction');
			console.error('Error adding KHOC transaction:', err);
			throw err;
		} finally {
			khocLoading.set(false);
		}
	},

	// Update an existing KHOC transaction
	async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
		khocLoading.set(true);
		khocError.set(null);

		try {
			await updateKhocTransaction(id, updates);

			// Update local store
			khocTransactions.update((current: Transaction[]) =>
				current.map((t: Transaction) => t.id === id ? { ...t, ...updates } : t)
			);

			// Update categories if category was changed
			if (updates.category) {
				const currentCategories = await getUniqueKhocCategories();
				khocCategories.set(currentCategories);
			}
		} catch (err) {
			khocError.set(err instanceof Error ? err.message : 'Failed to update KHOC transaction');
			console.error('Error updating KHOC transaction:', err);
			throw err;
		} finally {
			khocLoading.set(false);
		}
	},

	// Delete a KHOC transaction
	async deleteTransaction(id: string) {
		khocLoading.set(true);
		khocError.set(null);

		try {
			await deleteKhocTransaction(id);

			// Remove from local store
			khocTransactions.update((current: Transaction[]) => current.filter((t: Transaction) => t.id !== id));

			// Update categories in case we removed the last transaction of a category
			const currentCategories = await getUniqueKhocCategories();
			khocCategories.set(currentCategories);
		} catch (err) {
			khocError.set(err instanceof Error ? err.message : 'Failed to delete KHOC transaction');
			console.error('Error deleting KHOC transaction:', err);
			throw err;
		} finally {
			khocLoading.set(false);
		}
	},

	// Clear error
	clearError() {
		khocError.set(null);
	}
};