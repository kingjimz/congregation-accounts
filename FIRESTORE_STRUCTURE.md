# Firestore Database Structure for Congregation Accounts

## Overview
This document outlines the Firestore database structure for the congregation accounts system. Since this is designed for a single congregation with one user, the structure is simplified and efficient.

## Database Structure

### Collection: `transactions`
This is the main collection that stores all financial transactions for the congregation.

**Document Structure:**
```typescript
interface Transaction {
  id?: string;              // Auto-generated document ID
  date: string;             // ISO date string (YYYY-MM-DD)
  description: string;      // Transaction description
  category: string;         // Transaction category
  amount: number;           // Transaction amount (positive number)
  type: 'income' | 'expense'; // Transaction type
  createdAt?: Timestamp;    // Auto-generated creation timestamp
  updatedAt?: Timestamp;    // Auto-generated update timestamp
}
```

**Example Document:**
```json
{
  "date": "2025-07-20",
  "description": "Monthly Worldwide Work Contribution",
  "category": "Worldwide Work Donations",
  "amount": 250.00,
  "type": "income",
  "createdAt": "2025-07-23T10:30:00Z",
  "updatedAt": "2025-07-23T10:30:00Z"
}
```

## Categories
Based on your existing data, these are the standard categories:

**Income Categories:**
- Worldwide Work Donations
- Literature Contributions
- Local Congregation Donations
- Assembly Hall Contributions

**Expense Categories:**
- Worldwide Work Expenses
- Local Congregation Expenses

## Firestore Security Rules
Since this is for a single user/congregation, here are recommended security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write transactions
    match /transactions/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Indexes
Firestore will automatically create indexes for single-field queries. For compound queries, you may need to create composite indexes:

**Recommended Composite Indexes:**
1. `date` (Descending) + `type` (Ascending)
2. `category` (Ascending) + `date` (Descending)
3. `type` (Ascending) + `date` (Descending)

## Query Patterns

### Common Queries:
1. **Get all transactions (sorted by date):**
   ```typescript
   query(collection(db, 'transactions'), orderBy('date', 'desc'))
   ```

2. **Get transactions by type:**
   ```typescript
   query(
     collection(db, 'transactions'), 
     where('type', '==', 'income'), 
     orderBy('date', 'desc')
   )
   ```

3. **Get transactions by date range:**
   ```typescript
   query(
     collection(db, 'transactions'),
     where('date', '>=', startDate),
     where('date', '<=', endDate),
     orderBy('date', 'desc')
   )
   ```

4. **Get transactions by category:**
   ```typescript
   query(
     collection(db, 'transactions'),
     where('category', '==', 'Local Congregation Expenses'),
     orderBy('date', 'desc')
   )
   ```

## Migration from Static Data
To migrate your existing static data to Firestore:

1. Run the `seedInitialData()` function from `src/lib/firestore.ts`
2. This will populate your Firestore database with the sample transactions
3. Update your Svelte components to use the Firestore stores instead of static data

## Performance Considerations

### Efficient Queries:
- Use `orderBy` with `limit` for pagination
- Use compound queries instead of client-side filtering when possible
- Cache frequently accessed data using Svelte stores

### Cost Optimization:
- Use real-time listeners sparingly
- Implement proper pagination for large datasets
- Use `get()` instead of `onSnapshot()` for one-time reads

## Backup and Export
- Firestore automatically handles backups
- Use the `exportTransactions()` function in your UI for manual CSV exports
- Consider implementing periodic automated backups for critical data

## Future Scalability
If you need to scale to multiple congregations in the future, consider this structure:

```
congregations/{congregationId}/transactions/{transactionId}
```

This would allow you to isolate data per congregation while maintaining the same transaction structure.
