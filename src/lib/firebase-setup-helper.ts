// Development helper for Firebase setup
import { auth } from '$lib/firebase';

export async function checkFirebaseSetup() {
	const setupStatus = {
		authEnabled: false,
		errors: [] as string[],
		suggestions: [] as string[]
	};

	try {
		// Test if auth is properly configured
		if (!auth) {
			setupStatus.errors.push('Firebase Auth is not initialized');
			setupStatus.suggestions.push('Check your Firebase configuration in firebase.ts');
			return setupStatus;
		}

		// Check if the app is connected
		if (auth.app) {
			setupStatus.authEnabled = true;
		}

		// Try to get current user (this will work even without sign-in methods enabled)
		const currentUser = auth.currentUser;
		console.log('Current user:', currentUser);

	} catch (error) {
		setupStatus.errors.push(`Firebase connection error: ${error}`);
		setupStatus.suggestions.push('Verify your Firebase configuration and project settings');
	}

	return setupStatus;
}

export function getFirebaseSetupInstructions() {
	return `
🔥 Firebase Setup Instructions:

1. Go to Firebase Console (https://console.firebase.google.com/)
2. Select your project: ${auth.app.options.projectId || 'YOUR_PROJECT_ID'}
3. Navigate to Authentication → Sign-in method
4. Enable "Email/Password" sign-in method
5. Optionally enable "Email link (passwordless sign-in)"
6. Save the changes

⚠️ Common Issues:
- Make sure you're in the correct Firebase project
- Verify that your Firebase configuration keys are correct
- Check that your project has Authentication enabled
- Ensure you have the necessary permissions in the Firebase project

🔑 Current Project ID: ${auth.app.options.projectId || 'Not configured'}
🌐 Auth Domain: ${auth.app.options.authDomain || 'Not configured'}
`;
}
