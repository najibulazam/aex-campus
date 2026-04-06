# Settings Release Hardening (Step 12)

## Error Handling

- Firebase-aware error mapping is centralized in `lib/firebaseErrorMessage.ts`.
- Permission denied errors show actionable guidance in UI-facing messages.

## Telemetry

- Settings operation failures emit structured telemetry via `lib/settingsTelemetry.ts`.
- Captured fields:
  - scope (`profile` or `preferences`)
  - action (`load`, `save`, `reset`)
  - firebase error code (when available)
  - message
  - timestamp

## Data Integrity Safety

- Reset flows preserve immutable `createdAt` timestamps when documents already exist.
- Malformed legacy settings documents are deleted and recreated to recover from schema/rule drift.

## Operational Runbook

- Deploy Firestore rules:
  - `firebase deploy --only firestore`
- Validate app integrity:
  - `npm run lint`
  - `npm run build`
- Smoke test route:
  - `/settings?tab=preferences`
  - `/settings?tab=profile`
  - `/settings?tab=notifications`
