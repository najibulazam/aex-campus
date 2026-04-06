# AI Extension Campus

A modern student productivity web app built with Next.js App Router, React, TypeScript, Firebase Auth, and Cloud Firestore.

The app provides a single campus workspace for tasks, courses, schedule planning, study groups, and account-level settings, with responsive desktop/mobile experiences and real-time Firestore sync.

## What This App Includes

- Authentication:
	- Email/password signup and login
	- Protected dashboard routes
- Dashboard workspace:
	- Personalized welcome text from saved profile display name
	- Responsive desktop two-column layout
	- Mobile floating Task Manager button with slide-up task sheet
	- Summary cards for tasks, courses, schedule, and groups
	- Upcoming deadlines and upcoming events panels
- Task management:
	- Add/update/toggle/delete tasks
	- Priority, due date, optional time
	- Filter views (All, Pending, Completed)
- Course management:
	- Create/read/update/delete courses
	- Status filters, search, and inline validation
- Schedule management:
	- Create/read/update/delete events
	- Event type/status, date-range checks, reminders
	- Search and range filtering
- Study groups:
	- Create/read/update/delete groups
	- Membership-aware access, optional meeting metadata
	- Search and status filtering
- Settings center:
	- Profile, Preferences, and Notifications tabs
	- Inline validation, dirty-state tracking, discard/reset flows
	- Unsaved-change guard on tab switch/reload
- Navbar UX:
	- Account menu with outside-click close
	- Live notification panel derived from due tasks, upcoming events, and group meetings
	- Unseen indicator dot with local read-state persistence

## Tech Stack

- Next.js 16.2.1 (App Router)
- React 19 + TypeScript 5
- Tailwind CSS 4
- Firebase:
	- Authentication
	- Cloud Firestore
- Lucide icons

## Application Routes

- /
- /login
- /signup
- /tasks
- /courses
- /schedule
- /groups
- /settings

## Firestore Collections

- tasks
- courses
- scheduleEvents
- studyGroups
- userProfiles
- userPreferences

## Security Model (Firestore Rules)

Rules are defined in firestore.rules and include owner/member scoped access plus schema validation.

- tasks, courses, scheduleEvents:
	- owner-only CRUD by userId
- studyGroups:
	- member read, owner write/delete
- userProfiles and userPreferences:
	- owner-only document access by uid
	- immutable invariants enforced on update (for example createdAt/userId constraints)

## Local Development Setup

### 1. Prerequisites

- Node.js 20+
- npm
- Firebase project with:
	- Authentication enabled (Email/Password)
	- Firestore database enabled

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Create a .env.local file in the project root with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000

## NPM Scripts

- npm run dev: start local dev server
- npm run build: production build
- npm run start: run production server
- npm run lint: ESLint checks

## Firestore Deployment

Rules and indexes are versioned in:

- firestore.rules
- firestore.indexes.json

Deploy both rules and indexes:

```bash
firebase deploy --only firestore
```

If needed, you can also deploy indexes directly:

```bash
firebase deploy --only firestore:indexes
```

## Quality Checks

Run before shipping changes:

```bash
npm run lint
npm run build
```

## Project Structure (High Level)

- app/(dashboard): dashboard pages and module routes
- components: reusable UI components (navbar, task controls, auth guard)
- context: auth context/provider
- lib: Firebase client, services, hooks, validators, telemetry helpers
- types: shared TypeScript domain models
- styles: global styles and theme tokens
- docs: settings architecture, verification checklist, and release hardening notes

## Troubleshooting

### "Missing or insufficient permissions" in console

- Confirm you are authenticated.
- Ensure firestore.rules are deployed to the same Firebase project in your .env.local.
- Redeploy firestore with:

```bash
firebase deploy --only firestore
```

### Missing Firestore index warnings

- Deploy firestore.indexes.json.
- Some listeners include client-side sort fallback, but deployed indexes are recommended for performance.

### Notifications dot not clearing

- Opening the notifications panel marks current items as seen.
- Seen state is stored locally in browser storage; clear site storage if you need a reset during testing.

## Additional Documentation

- docs/settings-scope-navigation-lock.md
- docs/settings-verification-checklist.md
- docs/settings-release-hardening.md

## Notes

- Mobile and desktop dashboard layouts are intentionally different to optimize usability by viewport.
- Settings data is persisted in Firestore and used across the app (for example profile name on dashboard welcome).
