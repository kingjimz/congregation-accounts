import { writable, type Writable, get } from 'svelte/store';
import {
	getAllTransactions,
	addTransaction,
	updateTransaction,
	deleteTransaction,
	getUniqueCategories,
	type Transaction
} from '$lib/firestore';
import { user } from '$lib/stores/auth';

// Create reactive stores for your transaction data
export const transactions: Writable<Transaction[]> = writable([]);
export const categories: Writable<string[]> = writable([]);
export const loading: Writable<boolean> = writable(false);
export const error: Writable<string | null> = writable(null);

// Transaction store actions
export const transactionStore = {
	// Load all transactions from Firestore
	async loadTransactions() {
		const uid = get(user)?.uid;
		if (!uid) { error.set('Not authenticated'); return; }

		loading.set(true);
		error.set(null);

		try {
			const data = await getAllTransactions(uid);
			transactions.set(data);

			// Also update categories
			const uniqueCategories = await getUniqueCategories(uid);
			categories.set(uniqueCategories);
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to load transactions');
			console.error('Error loading transactions:', err);
		} finally {
			loading.set(false);
		}
	},

	// Add a new transaction
	async addTransaction(transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
		const uid = get(user)?.uid;
		if (!uid) throw new Error('Not authenticated');

		loading.set(true);
		error.set(null);

		try {
			const id = await addTransaction(uid, transaction);

			// Add to local store with the new ID
			const newTransaction: Transaction = {
				...transaction,
				userId: uid,
				id
			};

			transactions.update((current: Transaction[]) => [newTransaction, ...current]);

			// Update categories if this is a new category
			const currentCategories = await getUniqueCategories(uid);
			categories.set(currentCategories);

			return id;
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to add transaction');
			console.error('Error adding transaction:', err);
			throw err;
		} finally {
			loading.set(false);
		}
	},

	// Update an existing transaction
	async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>) {
		const uid = get(user)?.uid;
		if (!uid) throw new Error('Not authenticated');

		loading.set(true);
		error.set(null);

		try {
			await updateTransaction(id, updates);

			// Update local store
			transactions.update((current: Transaction[]) =>
				current.map((t: Transaction) => t.id === id ? { ...t, ...updates } : t)
			);

			// Update categories if category was changed
			if (updates.category) {
				const currentCategories = await getUniqueCategories(uid);
				categories.set(currentCategories);
			}
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to update transaction');
			console.error('Error updating transaction:', err);
			throw err;
		} finally {
			loading.set(false);
		}
	},

	// Delete a transaction
	async deleteTransaction(id: string) {
		const uid = get(user)?.uid;
		if (!uid) throw new Error('Not authenticated');

		loading.set(true);
		error.set(null);

		try {
			await deleteTransaction(id);

			// Remove from local store
			transactions.update((current: Transaction[]) => current.filter((t: Transaction) => t.id !== id));

			// Update categories in case we removed the last transaction of a category
			const currentCategories = await getUniqueCategories(uid);
			categories.set(currentCategories);
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to delete transaction');
			console.error('Error deleting transaction:', err);
			throw err;
		} finally {
			loading.set(false);
		}
	},

	// Clear error
	clearError() {
		error.set(null);
	}
};
