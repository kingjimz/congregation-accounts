/**
 * Migration script: Add userId to all existing Firestore documents.
 *
 * Usage:
 *   node scripts/migrate-add-userId.js <userId>
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account key path
 *   - Or place serviceAccountKey.json in the project root
 *   - Install firebase-admin: npm install firebase-admin --save-dev
 *
 * This script iterates all 7 collections and stamps every document
 * that lacks a userId field with the provided userId.
 * Uses batched writes (max 500 per batch) for efficiency.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const TARGET_USER_ID = process.argv[2];

if (!TARGET_USER_ID) {
	console.error('Usage: node scripts/migrate-add-userId.js <userId>');
	console.error('  <userId> is the Firebase Auth UID of the user who owns the existing data.');
	process.exit(1);
}

const COLLECTIONS = [
	'transactions',
	'opening_balances',
	'khoc_transactions',
	'khoc_opening_balances',
	'monthly_images',
	'khoc_monthly_images',
	'notes'
];

async function main() {
	// Initialize Firebase Admin
	let app;
	try {
		const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
			|| path.resolve(__dirname, '..', 'serviceAccountKey.json');
		app = initializeApp({
			credential: cert(require(serviceAccountPath))
		});
	} catch (err) {
		console.error('Failed to initialize Firebase Admin.');
		console.error('Make sure GOOGLE_APPLICATION_CREDENTIALS is set or serviceAccountKey.json exists in the project root.');
		console.error(err.message);
		process.exit(1);
	}

	const db = getFirestore(app);
	const BATCH_LIMIT = 500;

	let totalUpdated = 0;

	for (const collectionName of COLLECTIONS) {
		const snapshot = await db.collection(collectionName).get();
		const docsWithoutUserId = snapshot.docs.filter(doc => !doc.data().userId);

		if (docsWithoutUserId.length === 0) {
			console.log(`  ${collectionName}: 0 documents need migration (skipped)`);
			continue;
		}

		// Process in batches of 500
		for (let i = 0; i < docsWithoutUserId.length; i += BATCH_LIMIT) {
			const batch = db.batch();
			const chunk = docsWithoutUserId.slice(i, i + BATCH_LIMIT);

			for (const doc of chunk) {
				batch.update(doc.ref, { userId: TARGET_USER_ID });
			}

			await batch.commit();
		}

		console.log(`  ${collectionName}: ${docsWithoutUserId.length} documents updated`);
		totalUpdated += docsWithoutUserId.length;
	}

	console.log(`\nMigration complete. ${totalUpdated} documents stamped with userId: ${TARGET_USER_ID}`);
}

main().catch(err => {
	console.error('Migration failed:', err);
	process.exit(1);
});
