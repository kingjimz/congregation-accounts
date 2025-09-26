/**
 * Firestore Initialization Script
 *
 * This script helps initialize your Firestore database with:
 * - Sample data for testing
 * - Required indexes
 * - Initial configuration
 *
 * Run this script after setting up your Firebase project:
 * node scripts/init-firestore.js
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Configuration
const TEST_USER_EMAIL = 'test@congregation.org';
const TEST_USER_PASSWORD = 'TestPassword123!';
const CONGREGATION_ID = 'default-congregation';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      TEST_USER_EMAIL,
      TEST_USER_PASSWORD
    );
    console.log('✓ Test user created:', TEST_USER_EMAIL);
    return userCredential.user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Test user already exists');
      // Sign in instead
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(
        auth,
        TEST_USER_EMAIL,
        TEST_USER_PASSWORD
      );
      return userCredential.user;
    }
    throw error;
  }
}

async function createSampleTransactions(userId) {
  console.log('Creating sample transactions...');

  const transactions = [
    {
      description: 'Contributions to Worldwide Work',
      category: 'Worldwide Work Donations',
      amount: 500.00,
      type: 'income',
      date: '2024-01-15',
      userId: userId,
      congregationId: CONGREGATION_ID,
      createdAt: new Date('2024-01-15').toISOString()
    },
    {
      description: 'Contributions - Local Congregation Expenses',
      category: 'Local Congregation Donations',
      amount: 300.00,
      type: 'income',
      date: '2024-01-15',
      userId: userId,
      congregationId: CONGREGATION_ID,
      createdAt: new Date('2024-01-15').toISOString()
    },
    {
      description: 'Electricity Bill',
      category: 'Local Congregation Expenses',
      amount: 150.00,
      type: 'expense',
      date: '2024-01-20',
      userId: userId,
      congregationId: CONGREGATION_ID,
      createdAt: new Date('2024-01-20').toISOString()
    },
    {
      description: 'Internet Service',
      category: 'Local Congregation Expenses',
      amount: 50.00,
      type: 'expense',
      date: '2024-01-25',
      userId: userId,
      congregationId: CONGREGATION_ID,
      createdAt: new Date('2024-01-25').toISOString()
    }
  ];

  for (const transaction of transactions) {
    await addDoc(collection(db, 'transactions'), transaction);
  }

  console.log(`✓ Created ${transactions.length} sample transactions`);
}

async function createSampleNotes(userId) {
  console.log('Creating sample notes...');

  const notes = [
    {
      title: 'Monthly Accounts Review',
      content: 'Review completed for January 2024. All receipts have been verified and filed. Total donations: ₱800. Total expenses: ₱200. Net balance: ₱600.',
      userId: userId,
      congregationId: CONGREGATION_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      title: 'Upcoming Expenses',
      content: 'Expected expenses for next month:\n- Electricity: ₱150\n- Internet: ₱50\n- Office Supplies: ₱30\n- Cleaning Supplies: ₱20\nTotal Expected: ₱250',
      userId: userId,
      congregationId: CONGREGATION_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      title: 'Circuit Overseer Visit',
      content: 'CO visit scheduled for March 2024. Need to prepare:\n- Accommodation arrangements\n- Transportation budget\n- Meal arrangements\nEstimated budget needed: ₱2000',
      userId: userId,
      congregationId: CONGREGATION_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const note of notes) {
    await addDoc(collection(db, 'notes'), note);
  }

  console.log(`✓ Created ${notes.length} sample notes`);
}

async function createSampleOpeningBalance(userId) {
  console.log('Creating sample opening balance...');

  const openingBalance = {
    month: '2024-01',
    amount: 5000.00,
    note: 'Starting balance for January 2024',
    date: '2024-01-01',
    userId: userId,
    congregationId: CONGREGATION_ID,
    createdAt: new Date('2024-01-01').toISOString()
  };

  await addDoc(collection(db, 'opening_balances'), openingBalance);

  console.log('✓ Created sample opening balance');
}

async function initializeFirestore() {
  console.log('=================================');
  console.log('Firestore Initialization Script');
  console.log('=================================\n');

  try {
    // Validate configuration
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Missing Firebase configuration. Please check your .env file.');
    }

    console.log('Firebase Project:', firebaseConfig.projectId);
    console.log('');

    // Create test user
    const user = await createTestUser();

    // Create sample data
    await createSampleTransactions(user.uid);
    await createSampleNotes(user.uid);
    await createSampleOpeningBalance(user.uid);

    console.log('\n=================================');
    console.log('✓ Initialization Complete!');
    console.log('=================================');
    console.log('\nTest User Credentials:');
    console.log('Email:', TEST_USER_EMAIL);
    console.log('Password:', TEST_USER_PASSWORD);
    console.log('\nYou can now:');
    console.log('1. Sign in with the test user');
    console.log('2. View sample transactions and notes');
    console.log('3. Add your own data');
    console.log('\nDon\'t forget to:');
    console.log('1. Deploy security rules (firebase deploy --only firestore:rules)');
    console.log('2. Create indexes if prompted in the console');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your .env file has all Firebase config values');
    console.error('2. Ensure Firestore is enabled in Firebase Console');
    console.error('3. Ensure Authentication is enabled with Email/Password');
    console.error('4. Check your internet connection');
    process.exit(1);
  }
}

// Run the initialization
initializeFirestore();