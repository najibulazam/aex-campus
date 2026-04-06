# Settings Verification Checklist (Step 11)

## Preconditions

- User is authenticated.
- Firestore rules are deployed from `firestore.rules`.
- Settings route is reachable at `/settings?tab=preferences`.

## Functional Flows

- Profile save succeeds:
  - Open `/settings?tab=profile`
  - Change display name and save
  - Reload page and verify persisted value
- Preferences save succeeds:
  - Open `/settings?tab=preferences`
  - Change density or date format and save
  - Reload page and verify persisted value
- Notifications save succeeds:
  - Open `/settings?tab=notifications`
  - Change reminder minutes and quiet hours and save
  - Reload page and verify persisted value
- Reset actions succeed:
  - Trigger reset on profile and preferences tabs
  - Verify values return to defaults without permission errors

## Validation/UX Checks

- Invalid profile URL shows inline validation error.
- Negative reminder minutes are blocked with inline validation.
- Tab switch prompts when current tab has unsaved edits.
- Browser refresh warns when unsaved settings exist.
- Discard clears local unsaved edits only.

## Security Checks

- Owner-only access:
  - Signed-in user can read/write own `userProfiles/{uid}` and `userPreferences/{uid}` documents.
  - Cross-user document access is denied.
- Invariant checks:
  - `userId` cannot be changed.
  - `createdAt` cannot be changed on update.

## Automation Checks

- Lint: `npm run lint`
- Build: `npm run build`
