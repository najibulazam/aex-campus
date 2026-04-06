# Settings Scope and Navigation Lock

## Scope Lock

- `Profile` is reserved for identity/account details:
  - display name
  - avatar URL
  - academic role
  - timezone
  - profile visibility preferences
- `Settings` is reserved for workspace behavior and app defaults:
  - dashboard density
  - date/week preferences
  - task defaults and automations
- `Notifications` is reserved for reminder and quiet-hour behavior.

## Navigation Rules

- Navbar account menu routes:
  - Profile -> `/settings?tab=profile`
  - Settings -> `/settings?tab=preferences`
- Sidebar Settings route:
  - Settings -> `/settings?tab=preferences`
- Settings page tab contract:
  - valid tabs: `profile`, `preferences`, `notifications`
  - invalid or missing tab falls back to `preferences`

## Current Implementation Status

- Information architecture and tab routing are implemented.
- Full CRUD is implemented on `/settings`:
  - `Profile` tab saves to `userProfiles/{uid}`
  - `Preferences` and `Notifications` tabs save to `userPreferences/{uid}`

## Firestore Security Contract

- `userProfiles/{uid}` and `userPreferences/{uid}` are owner-scoped documents.
- Access model:
  - read/create/update/delete allowed only when `{uid} == request.auth.uid`
- Update invariants:
  - `userId` cannot be reassigned.
  - `createdAt` cannot be mutated after create.
- Schema validation is enforced in rules for both collections (allowed fields, enums, booleans, timestamps, and HH:mm quiet-hour times).

## UX Hardening Contract

- Settings forms now provide inline validation before save:
  - profile: display name, avatar URL format, timezone length/required
  - preferences/notifications: reminder minutes must be a non-negative integer
  - notifications: quiet-hour times must be valid `HH:mm`
- Save actions are disabled when:
  - there are no unsaved changes on the active tab
  - current input is invalid
  - a save/reset request is in-flight
- Unsaved-change safeguards:
  - switching tabs prompts before discarding unsaved edits on the current tab
  - browser reload/close warns when any settings tab has unsaved edits
- Unsaved-change visibility and control:
  - tab pills display an unsaved marker when that tab has local edits
  - each tab now has a `Discard` action to clear unsaved local changes
  - page header displays `You have unsaved changes.` when any tab is dirty
- Status message behavior:
  - success notices auto-dismiss after 4 seconds
  - switching tabs clears the previous status notice to avoid stale context
