# Vercel Deployment Guide

This guide deploys AI Extension Campus to Vercel with Firebase Auth + Firestore.

## 1. Pre-Deploy Checklist

- Build succeeds locally:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Firestore rules and indexes are deployed to your target Firebase project:
  - `firebase deploy --only firestore`
- Your local `.env.local` points to the same Firebase project you intend to use in production.

## 2. Required Files

- `.env.vercel.example`: template for all required Vercel environment variables.
- `vercel.json`: minimal project config for framework detection consistency.

## 3. Create Vercel Project

1. Open Vercel dashboard.
2. Import repository: `najibulazam/aex-campus`.
3. Framework should detect as Next.js automatically.
4. Keep default build command (`next build`) unless you have custom needs.

## 4. Add Environment Variables in Vercel

In Project Settings -> Environment Variables, add all `NEXT_PUBLIC_FIREBASE_*` keys from `.env.vercel.example`.

Recommended scopes:

- Production
- Preview

If you use separate Firebase projects for preview and production, use environment-specific values.

## 5. Firebase Auth Domain Configuration

After first Vercel deployment, add these in Firebase Console -> Authentication -> Settings -> Authorized domains:

- `<your-project>.vercel.app`
- your custom production domain (if any)
- any preview domains you actively test auth on

Without this, login/signup can fail on deployed URLs.

## 6. Deploy

- Trigger deployment from Vercel dashboard or by pushing to `main`.
- Verify Vercel build logs show successful `next build`.

## 7. Post-Deploy Smoke Test

- Open `/signup`, create a user.
- Confirm redirect to `/` works.
- Open `/settings` and confirm it defaults to Profile tab.
- Add one task, one schedule event, one study group.
- Refresh and confirm data persists.

## 8. Common Problems and Fixes

### A) `permission-denied` after signup

- Confirm Firestore rules are deployed to the same Firebase project used by Vercel env vars.
- Confirm `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in Vercel matches deployed rules project.
- Retry once: app includes a one-time profile load retry after token refresh.

### B) Auth works locally but fails on Vercel

- Add deployed Vercel domain to Firebase Auth authorized domains.

### C) Missing environment variables

- Verify every key in `.env.vercel.example` exists in Vercel settings.
- Redeploy after updating env vars.

## 9. Optional: Preview/Production Firebase Split

If you want safer testing:

- Use a separate Firebase project for Preview deployments.
- Keep Production on its own Firebase project.
- Set Vercel env vars by environment scope accordingly.
