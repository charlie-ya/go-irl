# Firebase Security Remediation Guide

## ⚠️ Current Situation
Your Firebase API key and configuration were exposed in `src/lib/firebase.ts` and committed to GitHub. This requires immediate action.

## 🚨 Immediate Actions Required

### 1. Rotate Your Firebase Web App Credentials

Since the API key is compromised, you need to create a new Web App in Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `go-irl-443f4`
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll down to **Your apps** section
5. **Option A: Delete and recreate** (Recommended if no production users yet)
   - Delete the existing web app
   - Click **Add app** → Select **Web** (</> icon)
   - Register a new app with name "goIRL"
   - Copy the new configuration values
   
6. **Option B: Create a new app** (If you have production users)
   - Click **Add app** → Select **Web** (</> icon)
   - Register a new app with name "goIRL-v2"
   - Copy the new configuration values
   - Later, migrate users and delete the old app

### 2. Update Your Environment Variables

Open `.env.local` and replace with your NEW credentials:

```env
VITE_FIREBASE_API_KEY=your-new-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=go-irl-443f4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=go-irl-443f4
VITE_FIREBASE_STORAGE_BUCKET=go-irl-443f4.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=675006608980
VITE_FIREBASE_APP_ID=your-new-app-id-here
VITE_FIREBASE_MEASUREMENT_ID=G-2M21P33B2F
```

### 3. Secure Your Firestore Database

Ensure your Firestore security rules are properly configured:

1. Go to Firebase Console → **Firestore Database** → **Rules**
2. Verify your rules require authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Territory squares - authenticated users can read all, write only their own
    match /territories/{territoryId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4. Configure Firebase App Check (Optional but Recommended)

App Check helps protect your backend resources from abuse:

1. Go to Firebase Console → **App Check**
2. Click **Get started**
3. Register your web app with reCAPTCHA v3
4. Enable enforcement for Firestore

### 5. Remove Exposed Credentials from Git History

The old credentials are still in your Git history. You have two options:

**Option A: Remove from history** (Complex, breaks other clones)
```bash
# Use git-filter-repo (requires installation)
git filter-repo --path src/lib/firebase.ts --invert-paths
```

**Option B: Accept and move forward** (Simpler, recommended)
- The old credentials are already rotated (step 1)
- Firestore rules prevent unauthorized access (step 3)
- Future commits won't expose credentials
- Document this incident in your security log

### 6. Commit Your Security Fixes

```bash
git add .gitignore src/lib/firebase.ts .env.example
git commit -m "security: Move Firebase credentials to environment variables"
git push origin main
```

**⚠️ IMPORTANT:** Never commit `.env.local` - it's already in `.gitignore`

## 🔒 Production Deployment

When deploying to Firebase Hosting or other platforms, you need to set environment variables:

### Firebase Hosting (via GitHub Actions or CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build with environment variables
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_FIREBASE_MEASUREMENT_ID: ${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}
        run: npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: go-irl-443f4
```

Then add secrets in GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Manual Deployment

For manual deploys, ensure `.env.local` is populated before running:

```bash
npm run build
npm run deploy
```

## ✅ Verification Checklist

- [ ] Created new Firebase Web App with fresh credentials
- [ ] Updated `.env.local` with new credentials
- [ ] Verified `.env.local` is in `.gitignore`
- [ ] Tested app locally with `npm run dev`
- [ ] Reviewed and updated Firestore security rules
- [ ] Committed security fixes to Git
- [ ] (Optional) Configured App Check
- [ ] (Optional) Set up CI/CD with environment secrets

## 📚 Additional Security Best Practices

1. **Never commit secrets** - Always use environment variables
2. **Rotate credentials regularly** - Every 90 days for production apps
3. **Monitor Firebase usage** - Set up billing alerts
4. **Review security rules** - Audit Firestore rules monthly
5. **Enable audit logging** - Track who accesses what data
6. **Use App Check** - Prevent API abuse
7. **Implement rate limiting** - Protect against DoS attacks

## 🆘 Need Help?

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
