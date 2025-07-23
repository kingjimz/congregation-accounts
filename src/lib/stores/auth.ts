import { writable } from 'svelte/store';
import { auth } from '$lib/firebase';
import { 
	signInWithEmailAndPassword, 
	createUserWithEmailAndPassword, 
	signOut as firebaseSignOut, 
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { browser } from '$app/environment';

// User store
export const user = writable<User | null>(null);
export const loading = writable(true);
export const error = writable<string | null>(null);

// Auth state listener
if (browser) {
	onAuthStateChanged(auth, (firebaseUser) => {
		user.set(firebaseUser);
		loading.set(false);
	});
}

// Sign up function
export const signUp = async (email: string, password: string) => {
	try {
		error.set(null);
		loading.set(true);
		const userCredential = await createUserWithEmailAndPassword(auth, email, password);
		return userCredential.user;
	} catch (err: unknown) {
		let errorMessage = 'An unknown error occurred';
		
		if (err instanceof Error) {
			// Handle specific Firebase auth errors
			if (err.message.includes('auth/operation-not-allowed')) {
				errorMessage = 'Email/password sign-up is not enabled. Please contact the administrator.';
			} else if (err.message.includes('auth/weak-password')) {
				errorMessage = 'Password is too weak. Please choose a stronger password.';
			} else if (err.message.includes('auth/email-already-in-use')) {
				errorMessage = 'An account with this email already exists.';
			} else if (err.message.includes('auth/invalid-email')) {
				errorMessage = 'Please enter a valid email address.';
			} else {
				errorMessage = err.message;
			}
		}
		
		error.set(errorMessage);
		throw err;
	} finally {
		loading.set(false);
	}
};

// Sign in function
export const signIn = async (email: string, password: string) => {
	try {
		error.set(null);
		loading.set(true);
		const userCredential = await signInWithEmailAndPassword(auth, email, password);
		return userCredential.user;
	} catch (err: unknown) {
		let errorMessage = 'An unknown error occurred';
		
		if (err instanceof Error) {
			// Handle specific Firebase auth errors
			if (err.message.includes('auth/operation-not-allowed')) {
				errorMessage = 'Email/password sign-in is not enabled. Please contact the administrator.';
			} else if (err.message.includes('auth/user-not-found')) {
				errorMessage = 'No account found with this email address.';
			} else if (err.message.includes('auth/wrong-password')) {
				errorMessage = 'Incorrect password. Please try again.';
			} else if (err.message.includes('auth/invalid-email')) {
				errorMessage = 'Please enter a valid email address.';
			} else if (err.message.includes('auth/user-disabled')) {
				errorMessage = 'This account has been disabled.';
			} else if (err.message.includes('auth/too-many-requests')) {
				errorMessage = 'Too many failed attempts. Please try again later.';
			} else {
				errorMessage = err.message;
			}
		}
		
		error.set(errorMessage);
		throw err;
	} finally {
		loading.set(false);
	}
};

// Sign out function
export const signOut = async () => {
	try {
		error.set(null);
		await firebaseSignOut(auth);
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
		error.set(errorMessage);
		throw err;
	}
};
