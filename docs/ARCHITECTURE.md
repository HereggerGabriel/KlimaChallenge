# KlimaChallenge — Architecture (current, Oct 2026)

Supersedes `.claude/memory/project_state.md` (written before M3; outdated).

## Stack
Expo SDK 54, React Native 0.81, Expo Router v6, TypeScript (strict), Supabase (auth only so far),
AsyncStorage, react-native-gesture-handler, Reanimated 4, react-native-svg, @react-native-community/datetimepicker.
Runs as an **Expo development build** (`expo-dev-client`), not Expo Go.

## Data flow
All screens use **one store**: `store/AppData.tsx` (`AppDataProvider` in `app/_layout.tsx`, hook `useAppData()`).
- **State:** `trips` (AsyncStorage `@travelapp_trips`), `claims` (reward log, `@rewardClaims`), `profile` (name + `TicketProfile`, `@profile`).
- **Derived, never stored:** `xp = tripsXP + rewardsXP` (`utils/rewards.ts`), `level`, `streak`, `ticketProgress` per ticket period (`utils/ticketPeriod.ts`), `periodKey`.
- **Actions:** `addTrip`, `updateTrip`, `deleteTrip`, `mergeTrips`, `claimReward`, `isClaimed`, `updateProfile`, `deleteAllTrips`, `reload`.
- **Feedback:** `rewardEvents` queue → `components/ui/RewardFeedback.tsx` (XP toast + level-up overlay, app-wide); `mainQuestEvent` → `MainQuestOverlay` on the main screen.
- One-time migration of the pre-M3 layout (`userXP`, `@claimedQuests`, …) happens in the store's loaders.
- Screens never read or write AsyncStorage themselves (except quest rotation selection in `app/quests.tsx`).

## Auth (`lib/auth.ts`, `lib/supabase.ts`)
Anonymous sign-in on first launch (`ensureSession`); optional account = `upgradeAnonymousAccount` (same user ID via `updateUser`); logout only for linked accounts (`signOutAndClearLocalData`, then `reload()`). Supabase keys in `.env` (see `.env.example`).

## Trip entry
- `services/stations.ts`: bundled ÖBB stations + rail network (`assets/data/network.json`), search, `findStation`, `railDistanceKm` (Dijkstra), `shortRoute` for display.
- `services/fareEstimate.ts`: `suggestFare` (remembered route price > ÖBB fare model `assets/data/fare-model.json` > local city fare), `FARE_HINT`.
- `hooks/useTripAutofill.ts`: fills distance/price while typing, never overwrites typed values; `initialize()` for edit/log-again.
- `services/oebbLinks.ts`: "Check price at ÖBB" (Scotty URL with route).
- Data pipeline: `scripts/data/` (see its README); raw downloads in gitignored `data-raw/`.

## Key folders
`app/` screens (router) · `components/ui/` · `store/` · `services/` (storage, stations, fares, export/import, parsing) · `utils/` (levels, quests, achievements, streak, dates, rewards, ticket period, format) · `assets/data/` (generated) · `scripts/data/` (pipeline) · tests in `__tests__/` next to the code.

## Conventions
- Colors only from `Palette` (`constants/Colors.ts`), except `#fff`; icons `MaterialIcons` only.
- Dates/day keys in local time (`utils/dateKeys.ts`), never `toISOString()` for day keys.
- Pure logic stays free of Expo/native imports so it is unit-testable.
- Before committing: `npx tsc --noEmit`, `npx eslint .` (0 errors), `npx jest` — check the **Test Suites** line for FAIL, not only Tests.
- Device testing: `npm run dev` (adb reverse + Metro on localhost), `npm run usb` if the phone drops. Screenshots via `adb exec-out screencap -p` from Bash.
