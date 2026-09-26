# Tindahan App (Phase 1)

Offline-first PWA para sa benta at utang log ng tindahan. Pinapalitan ang papel na sales log.

- **Stack:** Vite + React + TypeScript, Tailwind CSS + shadcn/ui, vite-plugin-pwa (Workbox), Firebase Auth (email/password) + Firestore with persistent local cache.
- **Tabs:** Benta · Utang · Close Day · Analytics (placeholder)
- **Business date:** 4:00 AM Asia/Manila cut-off (`src/lib/businessDate.ts`).
- **Utang balance** is never stored; it is always computed from sales and payments (`src/lib/balance.ts`).
- **No hard deletes, no transactions.** Corrections are voids with a reason plus an `audit_log` entry.

---

## 1. Local setup

Requirements: Node 20+ (tested with Node 24), npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (service worker is disabled in dev) |
| `npm run build` | Type-check + production build with service worker into `dist/` |
| `npm run preview` | Serve `dist/` locally (use this to test the PWA/offline behavior) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (business date, balances, totals, normalization, money) |
| `npm run test:rules` | Firestore security rules tests on the local emulator (see section 6) |
| `npm run generate-icons` | Regenerates the placeholder PWA icons in `public/` |

## 2. Environment variables

Put these in `.env.local` (git-ignored; never commit it). Values come from **Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration → Config**.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

If any are missing, the app shows a "Kulang ang Firebase config" screen listing them.

> The Firebase web config is not a secret in the security sense (it ships to every browser); access is enforced by Auth + `firestore.rules`. It is still kept out of git per project policy.

## 3. Firebase manual setup (done once by the admin, in the Firebase console)

1. **Create a Firebase project** (or use an existing one) and add a **Web app**. Copy its config into `.env.local`.
2. **Firestore:** Build → Firestore Database → Create database (production mode). Pick a region close to PH (e.g. `asia-southeast1`).
3. **Enable Email/Password sign-in:** Build → Authentication → Sign-in method → Email/Password → Enable. (Leave "Email link" off.)
4. **Disable self sign-up:** Authentication → Settings → User actions → **uncheck "Enable create (sign-up)"**. The app has no sign-up screen, and this blocks sign-ups via the API too.
5. **Create the 4 users:** Authentication → Users → Add user (email + password) for each family member. Copy each user's **User UID**.
6. **Add `members` docs** (Firestore → Start collection `members`). Document ID = the user's UID:

   | Field | Type | Example |
   |---|---|---|
   | `name` | string | `Ana` |
   | `role` | string | `admin` or `bantay` |
   | `last_sync_at` | timestamp or null | leave `null`; the app fills it in |

   A signed-in user without a `members/{uid}` doc sees **"Walang access"** and is signed out.
7. **Publish the security rules:** copy the contents of `firestore.rules` into Firestore → Rules → Publish (or run `npx firebase deploy --only firestore:rules` yourself after `npx firebase login` and `npx firebase use <project-id>`). No composite indexes are needed (`firestore.indexes.json` is empty).
8. **Authorized domains:** Authentication → Settings → Authorized domains → add your Vercel domain (e.g. `tindahan.vercel.app`).

### Logging in each phone

Open the deployed URL on each phone, have the admin log in with that person's email/password once, then **Add to Home Screen**. Sessions persist (IndexedDB), so users never see the login screen again in normal use. Logout is only in Settings (profile icon → Logout, with confirmation).

## 4. Vercel build settings

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | the six `VITE_FIREBASE_*` values (Production + Preview) |

The app is a single page with no client-side routes, so no rewrites are needed. Vercel's default `cache-control` for static files lets the service worker update itself; new versions install automatically (`registerType: 'autoUpdate'`).

## 5. How it works (key behaviors)

- **Offline:** the app shell is precached by the service worker; Firestore's persistent cache (IndexedDB, multi-tab) holds data and queues writes. Writes are never awaited in the UI, so saving works instantly offline. Each entry shows a **pending** badge until the server acknowledges it.
- **Sync icon (top bar):** green cloud = synced, amber = pending writes on this device, crossed-out = offline, arrows = connecting. When online with no pending writes, the app stamps `members/{uid}.last_sync_at` (at most once per minute).
- **Rejected writes** (e.g. blocked by the rules) show a red "Hindi na-save" banner, because Firestore removes them from the local cache.
- **Close Day:** shows each member's `last_sync_at` (⚠️ if older than `STALE_SYNC_MINUTES` = 30) and warns if this device has pending writes. Closing creates `day_closures/{business_date}` plus an audit entry. A banner flags the most recent earlier business date that has entries but isn't closed yet.
- **After closing:** normal entries on that date are blocked. **Late entry** mode (from the lock banner, or "Magdagdag ng late entry" on any closed date in Close Day) saves with `is_late_entry: true` plus an audit entry. The closure keeps its original totals and also shows **adjusted totals** whenever late entries or later voids change them.
- **Offline entries vs. closing:** an entry recorded *before* the day was closed (e.g. a phone that was offline) is still accepted by the rules when it syncs (`recorded_at < closed_at`), so it isn't lost; it shows up in the adjusted totals.
- **Autocomplete:** items come from the last 60 days of sales (`AUTOCOMPLETE_WINDOW_DAYS`) plus all utang sales, cached per device and fetched incrementally. Suggestions only: any name and any price can be typed.

## 6. Tests

```bash
npm test            # unit tests (vitest)
npm run test:rules  # security rules tests on the Firestore emulator
```

`test:rules` runs `firebase emulators:exec` with the project ID `demo-tindahan`. The `demo-` prefix means it never touches a real Firebase project. The emulator needs **Java 21+** (e.g. [Eclipse Temurin JDK 21](https://adoptium.net/)) on your `PATH`; `firebase-tools` is already a dev dependency.

## 7. Offline test checklist

- [ ] Install via "Add to Home Screen" on Android (Chrome) and iPhone (Safari).
- [ ] Airplane mode → open app → app loads.
- [ ] Record benta, utang, and bayad while offline → appear immediately with "pending" marker; utang balance updates.
- [ ] Turn internet back on → entries sync; visible on another phone.
- [ ] Close Day warns when a device has pending writes / stale `last_sync_at`.
- [ ] Close the app fully, reopen after a day → still logged in (especially on iPhone).

Tip: test offline with `npm run build && npm run preview` (or the deployed site), not `npm run dev`; the service worker only runs in production builds.

## 8. Known limits / notes for later

- Utang balances need **all** utang sales and payments loaded on every phone. That's fine for years at sari-sari store volume, but read costs grow over time. Revisit in a later phase if the Firestore free-tier read quota gets close.
- The first login on a phone must be online (it has to fetch the `members` doc once).
- Icons in `public/` are generated placeholders; replace them with real artwork (same file names and sizes).
