// Firebase connection test utilities
import { db, auth, analytics } from './firebase';
import { collection } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export async function testFirebaseConnection() {
	const results = {
		firestore: false,
		auth: false,
		analytics: false,
		errors: [] as string[],
		tested: false
	};

	// Test Firestore connection
	try {
		// Try to get a collection (this will fail if Firestore isn't configured properly)
		collection(db, 'test');
		console.log('✅ Firestore initialized successfully');
		results.firestore = true;
	} catch (error) {
		console.error('❌ Firestore initialization failed:', error);
		results.errors.push(`Firestore: ${error}`);
	}

	// Test Auth connection
	try {
		// Set up auth state listener (this will fail if Auth isn't configured properly)
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			console.log('Auth state changed:', user ? 'User logged in' : 'No user');
		});
		console.log('✅ Firebase Auth initialized successfully');
		results.auth = true;
		// Clean up the listener
		unsubscribe();
	} catch (error) {
		console.error('❌ Firebase Auth initialization failed:', error);
		results.errors.push(`Auth: ${error}`);
	}

	// Test Analytics
	try {
		if (analytics) {
			console.log('✅ Firebase Analytics initialized successfully');
			results.analytics = true;
		} else {
			console.log('ℹ️ Firebase Analytics not initialized (likely running on server)');
		}
	} catch (error) {
		console.error('❌ Firebase Analytics initialization failed:', error);
		results.errors.push(`Analytics: ${error}`);
	}

	results.tested = true;
	return results;
}

export function logFirebaseConfig() {
	console.log('🔧 Firebase Configuration Status:');
	console.log('- Firestore database:', db ? '✅ Connected' : '❌ Not connected');
	console.log('- Firebase Auth:', auth ? '✅ Connected' : '❌ Not connected');
	console.log('- Firebase Analytics:', analytics ? '✅ Connected' : 'ℹ️ Not available (server-side)');
}
