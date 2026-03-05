# Cloudinary & Monthly Images Setup

If you see **"Cloudinary is not configured"** or **"Insufficient permissions"**, follow these steps.

## 1. Configure Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com) and open the [Dashboard](https://cloudinary.com/console).
2. Note your **Cloud name**, **API Key**, and **API Secret**.
3. Set them as environment variables.

### Local development

Create or edit `.env` in the project root (same level as `package.json`):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Restart the dev server after changing `.env`.

### Netlify

1. Netlify dashboard → your site → **Site configuration** → **Environment variables**.
2. Add (or **Options** → **Edit** for existing ones):
   - **Key:** `CLOUDINARY_CLOUD_NAME` → **Value:** your cloud name  
   - **Key:** `CLOUDINARY_API_KEY` → **Value:** your API key  
   - **Key:** `CLOUDINARY_API_SECRET` → **Value:** your API secret  
3. Trigger a new **Deploy** so the server uses the new variables.

---

## 2. Fix “Insufficient permissions” (Firestore)

Monthly images are stored in Firestore. You must be **signed in** and have **rules deployed**.

1. **Sign in** to the app with Firebase Auth (same account you use for the rest of the app).
2. Deploy Firestore rules so the `monthly_images` collection is allowed:

   ```bash
   firebase deploy --only firestore:rules
   ```

3. Deploy the composite index for listing images by month (if you haven’t already):

   ```bash
   firebase deploy --only firestore:indexes
   ```

After this, the “Monthly Images” section should load and upload/delete without permission errors.
