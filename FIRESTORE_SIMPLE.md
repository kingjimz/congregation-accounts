# Simple Firestore Structure & Rules

## Database Structure

### Collection: `transactions`
Your Firestore database will have a single collection called `transactions`.

**Document Structure:**
```
transactions/{transactionId}
{
  date: "2025-07-23",                    // string (YYYY-MM-DD format)
  description: "Kingdom Hall Utilities", // string
  category: "Local Congregation Expenses", // string
  amount: 125.50,                        // number
  type: "expense",                       // string ("income" or "expense")
  createdAt: timestamp,                  // Firestore timestamp (auto-generated)
  updatedAt: timestamp                   // Firestore timestamp (auto-generated)
}
```

**Example Documents:**
```
transactions/abc123
{
  date: "2025-07-23",
  description: "Monthly Worldwide Work Contribution",
  category: "Worldwide Work Donations",
  amount: 250.00,
  type: "income",
  createdAt: July 23, 2025 at 10:30:00 AM UTC-5,
  updatedAt: July 23, 2025 at 10:30:00 AM UTC-5
}

transactions/def456
{
  date: "2025-07-22",
  description: "Kingdom Hall Maintenance",
  category: "Local Congregation Expenses",
  amount: 89.25,
  type: "expense",
  createdAt: July 22, 2025 at 2:15:00 PM UTC-5,
  updatedAt: July 22, 2025 at 2:15:00 PM UTC-5
}
```

## Firestore Security Rules

Create these rules in the Firebase Console under Firestore Database > Rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read and write access to transactions for authenticated users only
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Alternative: Public Access Rules (if no authentication needed)

If you don't want to implement authentication and want to allow public access:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read and write access to transactions
    match /transactions/{transactionId} {
      allow read, write: if true;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Setting Up the Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Click on the **Rules** tab
5. Replace the default rules with one of the rule sets above
6. Click **Publish**

## Data Validation Rules (Enhanced Security)

For better data validation, you can use these enhanced rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /transactions/{transactionId} {
      allow read: if request.auth != null;
      
      allow create: if request.auth != null
        && validateTransaction(request.resource.data);
      
      allow update: if request.auth != null
        && validateTransaction(request.resource.data);
      
      allow delete: if request.auth != null;
    }
    
    // Validation function
    function validateTransaction(data) {
      return data.keys().hasAll(['date', 'description', 'category', 'amount', 'type'])
        && data.date is string
        && data.description is string
        && data.category is string
        && data.amount is number
        && data.amount >= 0
        && data.type in ['income', 'expense']
        && data.createdAt is timestamp
        && data.updatedAt is timestamp;
    }
  }
}
```

## Summary

**Simple Structure:**
- ✅ Single `transactions` collection
- ✅ Simple document structure with 7 fields
- ✅ No nested collections or complex relationships
- ✅ Easy to query and filter

**Security Options:**
1. **Authenticated users only** (recommended)
2. **Public access** (simpler but less secure)
3. **Enhanced with validation** (most secure)

Choose the security rule that best fits your needs!
