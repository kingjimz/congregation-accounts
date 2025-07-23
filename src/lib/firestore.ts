import { 
	collection, 
	addDoc, 
	getDocs, 
	doc, 
	updateDoc, 
	deleteDoc, 
	query, 
	orderBy, 
	where, 
	Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Transaction interface matching your existing structure
export interface Transaction {
	id?: string; // Optional for new transactions
	date: string; // ISO date string (YYYY-MM-DD)
	description: string;
	category: string;
	amount: number;
	type: 'income' | 'expense';
	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

// Opening Balance interface for monthly balance tracking
export interface OpeningBalance {
	id?: string;
	month: string; // YYYY-MM format
	balance: number; // Manual opening balance
	note?: string; // Optional note for this balance
	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

// Firestore collection references
const TRANSACTIONS_COLLECTION = 'transactions';
const OPENING_BALANCES_COLLECTION = 'opening_balances';

// Add a new transaction
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
	try {
		const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
			...transaction,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		});
		return docRef.id;
	} catch (error) {
		console.error('Error adding transaction:', error);
		throw error;
	}
}

// Get all transactions
export async function getAllTransactions(): Promise<Transaction[]> {
	try {
		const q = query(
			collection(db, TRANSACTIONS_COLLECTION),
			orderBy('date', 'desc')
		);
		const querySnapshot = await getDocs(q);
		
		return querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		} as Transaction));
	} catch (error) {
		console.error('Error getting transactions:', error);
		throw error;
	}
}

// Get transactions by date range
export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
	try {
		const q = query(
			collection(db, TRANSACTIONS_COLLECTION),
			where('date', '>=', startDate),
			where('date', '<=', endDate),
			orderBy('date', 'desc')
		);
		const querySnapshot = await getDocs(q);
		
		return querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		} as Transaction));
	} catch (error) {
		console.error('Error getting transactions by date range:', error);
		throw error;
	}
}

// Get transactions by type
export async function getTransactionsByType(type: 'income' | 'expense'): Promise<Transaction[]> {
	try {
		const q = query(
			collection(db, TRANSACTIONS_COLLECTION),
			where('type', '==', type),
			orderBy('date', 'desc')
		);
		const querySnapshot = await getDocs(q);
		
		return querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		} as Transaction));
	} catch (error) {
		console.error('Error getting transactions by type:', error);
		throw error;
	}
}

// Get transactions by category
export async function getTransactionsByCategory(category: string): Promise<Transaction[]> {
	try {
		const q = query(
			collection(db, TRANSACTIONS_COLLECTION),
			where('category', '==', category),
			orderBy('date', 'desc')
		);
		const querySnapshot = await getDocs(q);
		
		return querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		} as Transaction));
	} catch (error) {
		console.error('Error getting transactions by category:', error);
		throw error;
	}
}

// Update a transaction
export async function updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
	try {
		const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
		await updateDoc(docRef, {
			...updates,
			updatedAt: Timestamp.now()
		});
	} catch (error) {
		console.error('Error updating transaction:', error);
		throw error;
	}
}

// Delete a transaction
export async function deleteTransaction(id: string) {
	try {
		await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
	} catch (error) {
		console.error('Error deleting transaction:', error);
		throw error;
	}
}

// Get unique categories (useful for filter dropdowns)
export async function getUniqueCategories(): Promise<string[]> {
	try {
		const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
		const categories = new Set<string>();
		
		querySnapshot.docs.forEach(doc => {
			const data = doc.data();
			if (data.category) {
				categories.add(data.category);
			}
		});
		
		return Array.from(categories).sort();
	} catch (error) {
		console.error('Error getting unique categories:', error);
		throw error;
	}
}

// Opening Balance Functions

// Add or update opening balance for a month
export async function setOpeningBalance(month: string, balance: number, note?: string) {
	try {
		// Check if opening balance already exists for this month
		const q = query(
			collection(db, OPENING_BALANCES_COLLECTION),
			where('month', '==', month)
		);
		const querySnapshot = await getDocs(q);
		
		if (!querySnapshot.empty) {
			// Update existing opening balance
			const docRef = querySnapshot.docs[0].ref;
			await updateDoc(docRef, {
				balance,
				note: note || '',
				updatedAt: Timestamp.now()
			});
			return querySnapshot.docs[0].id;
		} else {
			// Create new opening balance
			const docRef = await addDoc(collection(db, OPENING_BALANCES_COLLECTION), {
				month,
				balance,
				note: note || '',
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now()
			});
			return docRef.id;
		}
	} catch (error) {
		console.error('Error setting opening balance:', error);
		throw error;
	}
}

// Get opening balance for a specific month
export async function getOpeningBalance(month: string): Promise<OpeningBalance | null> {
	try {
		const q = query(
			collection(db, OPENING_BALANCES_COLLECTION),
			where('month', '==', month)
		);
		const querySnapshot = await getDocs(q);
		
		if (!querySnapshot.empty) {
			const doc = querySnapshot.docs[0];
			return {
				id: doc.id,
				...doc.data()
			} as OpeningBalance;
		}
		
		return null;
	} catch (error) {
		console.error('Error getting opening balance:', error);
		throw error;
	}
}

// Get all opening balances
export async function getAllOpeningBalances(): Promise<OpeningBalance[]> {
	try {
		const q = query(
			collection(db, OPENING_BALANCES_COLLECTION),
			orderBy('month', 'desc')
		);
		const querySnapshot = await getDocs(q);
		
		return querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		} as OpeningBalance));
	} catch (error) {
		console.error('Error getting opening balances:', error);
		throw error;
	}
}

// Delete opening balance for a month
export async function deleteOpeningBalance(month: string) {
	try {
		const q = query(
			collection(db, OPENING_BALANCES_COLLECTION),
			where('month', '==', month)
		);
		const querySnapshot = await getDocs(q);
		
		if (!querySnapshot.empty) {
			await deleteDoc(querySnapshot.docs[0].ref);
		}
	} catch (error) {
		console.error('Error deleting opening balance:', error);
		throw error;
	}
}
