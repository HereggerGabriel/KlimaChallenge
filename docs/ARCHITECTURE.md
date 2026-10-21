# KlimaChallenge — Architecture (current, Oct 2026)

Supersedes `.claude/memory/project_state.md` (written before M3; outdated).

## Stack
Expo SDK 54, React Native 0.81, Expo Router v6, TypeScript (strict), Supabase (auth + cloud backup),
AsyncStorage, react-native-gesture-handler, Reanimated 4, react-native-svg, @react-native-community/datetimepicker.
Runs as an **Expo development build** (`expo-dev-client`), not Expo Go.

## Data flow
All screens use **one store**: `store/AppData.tsx` (`AppDataProvider` in `app/_layout.tsx`, hook `useAppData()`).
- **State:** `trips` (AsyncStorage `@travelapp_trips`), `claims` (reward log, `@rewardClaims`), `profile` (name + `TicketProfile`, `@profile`).
- **Derived, never stored:** `xp = tripsXP + rewardsXP` (`utils/rewards.ts`), `level`, `streak`, `ticketProgress` per ticket period (`utils/ticketPeriod.ts`), `periodKey`.
- **Actions:** `addTrip`, `updateTrip`, `deleteTrip`, `mergeTrips`, `claimReward`, `isClaimed`, `updateProfile`, `deleteAllTrips`, `reload`; backup: `syncNow`, `resolveMerge`, `logOut` (plus `syncStatus`, `pendingMerge`).
- **Feedback:** `rewardEvents` queue → `components/ui/RewardFeedback.tsx` (green "+XP" / red "−XP" toast + level-up overlay, app-wide); `mainQuestEvent` → `MainQuestOverlay` on the main screen.
- One-time migration of the pre-M3 layout (`userXP`, `@claimedQuests`, …) happens in the store's loaders.
- Screens never read or write AsyncStorage themselves (except quest rotation selection in `app/quests.tsx`).

## Auth (`lib/auth.ts`, `lib/supabase.ts`)
Anonymous sign-in on first launch (`ensureSession`); optional account = `upgradeAnonymousAccount` (same user ID via `updateUser`); logout only for linked accounts, through the store's `logOut()` (pauses sync, `signOutAndClearLocalData`, reload). Supabase keys in `.env` (see `.env.example`).

## Cloud backup (M4)
- **Tables** (`supabase/migrations/20261021120000_cloud_backup.sql`, run in the dashboard SQL editor): `trips` (PK `user_id, id`), `reward_claims` (PK `user_id, key`), `profiles` (PK `user_id`); row-level security = own rows only. Soft delete via `deleted_at`. `updated_at` comes from the phone (a trigger keeps the newer row if an older edit arrives late); `synced_at` is set by the server and is the pull cursor.
- **Pure logic** `utils/syncLogic.ts`: row mapping, outbox (`queue*`, `removeUploaded`), `applyRemote` (remote wins unless a newer local change is still waiting), `decideAccount` (same / adopt / switch / ask).
- **Network** `services/cloudSync.ts`: `uploadOutbox` (upserts in batches), `downloadChanges` (since cursor − 1 min, paged), session user + auth events.
- **Store:** every action saves locally, then queues rows in the outbox (`@syncOutbox`; owner + cursor in `@syncMeta`). A sync round runs 1.5 s after a change, on app foreground, on user change and on retry (15 s → 1 min → 5 min). Round = settle owner → upload → download → apply.
- **Accounts:** first sync or a new anonymous session adopts the phone's data and uploads it. Logging in to an existing account with trips on the phone sets `pendingMerge` → `components/ui/AccountMergePrompt.tsx` asks (again after a restart if unanswered); without trips it switches silently. When switching, the local profile is queued as "oldest", so the account's profile wins if it has one.
- **Status:** `syncStatus.failed` only when something is missing (changes waiting, or an account not downloaded yet) → `components/ui/SyncStatusBadge.tsx` on the main screen.
- **Study export:** schema `study` (not exposed to the API): `study.trips`, `study.rewards`, `study.tickets`; no station names, no free text; anonymous users whose trips were merged into an account are left out.
- **Tests:** `testing/fakeSupabase.ts` (in-memory client with RLS, LWW, `synced_at`) is mocked in for `@/lib/supabase` in the store tests.

## Trip entry
- `services/stations.ts`: bundled ÖBB stations + rail network (`assets/data/network.json`), search, `findStation`, `railDistanceKm` (Dijkstra), `shortRoute` for display.
- `services/fareEstimate.ts`: `suggestFare` (remembered route price > ÖBB fare model `assets/data/fare-model.json` > local city fare), `FARE_HINT`.
- `hooks/useTripAutofill.ts`: fills distance/price while typing, never overwrites typed values; `initialize()` for edit/log-again.
- `services/oebbLinks.ts`: "Check price at ÖBB" (Scotty URL with route).
- Data pipeline: `scripts/data/` (see its README); raw downloads in gitignored `data-raw/`.

## Key folders
`app/` screens (router) · `components/ui/` · `store/` · `services/` (storage, stations, fares, export/import, parsing, cloud sync) · `utils/` (levels, quests, achievements, streak, dates, rewards, ticket period, format, sync logic) · `assets/data/` (generated) · `scripts/data/` (pipeline) · `supabase/migrations/` (SQL) · `testing/` (test helpers) · tests in `__tests__/` next to the code.

## Conventions
- Colors only from `Palette` (`constants/Colors.ts`), except `#fff`; icons `MaterialIcons` only.
- Dates/day keys in local time (`utils/dateKeys.ts`), never `toISOString()` for day keys.
- Pure logic stays free of Expo/native imports so it is unit-testable.
- Before committing: `npx tsc --noEmit`, `npx eslint .` (0 errors), `npx jest` — check the **Test Suites** line for FAIL, not only Tests.
- Device testing: `npm run dev` (adb reverse + Metro on localhost), `npm run usb` if the phone drops. Screenshots via `adb exec-out screencap -p` from Bash.
