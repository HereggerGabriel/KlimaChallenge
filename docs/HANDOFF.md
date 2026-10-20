# KlimaChallenge — Project Handoff Brief

> Paste this entire file as your first message to give a new Claude instance full project context.
> Last updated: 2026-04-20 (after Session 18)

---

## What this project is

**KlimaChallenge** is a React Native / Expo app for Austrian public transport users. Users log their bus/train/tram/subway trips, track how much they've saved vs. owning a car, earn XP and level up, complete daily/weekly quests, unlock achievements, and see stats & insights. The central hook is the "KlimaTicket" — an Austrian annual public transport pass — and the app gamifies using it instead of driving.

**Current state:** Feature-complete MVP. 18 development sessions done. Pre-launch work remaining (cloud sync, onboarding polish, App Store assets).

---

## Tech stack

- **Expo SDK 54**, Expo Router v6 (file-based routing), TypeScript
- **React Native** with AsyncStorage (local persistence)
- **Supabase** — real auth only so far (project `vbjpigfbwvetsaoxpogd`); cloud sync planned but not yet active
- **react-native-gesture-handler ~2.28.0** — used for swipe-to-delete, hold-to-add favorites
- **react-native-reanimated ~4.1.1** — animations throughout
- **react-native-svg 15.12.1** — donut chart in financial overview
- **NativeWind** — CSS-in-JS styling
- **expo-linear-gradient**, **@expo/vector-icons/MaterialIcons**
- **@react-native-community/datetimepicker** — native date/time picker; requires **custom Expo dev build** (NOT standard Expo Go)
- **expo-file-system ~19.0.21**, **expo-sharing ~14.0.8**, **expo-document-picker ~14.0.8** — trip export/import
- No axios — uses built-in `fetch`

---

## Route architecture

```
/                   → splash (checks Supabase session)
/onboarding         → 3-slide FRE pager
/login              → dark login screen
/register           → dark register screen
/(tabs)/user        → main authenticated screen (tab bar hidden)
/quests             → Quests & Achievements screen
/stats              → Stats & Insights screen
/profile            → User profile screen
/trips              → Full trip list screen
```

---

## Key file structure

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout; wraps in `GestureHandlerRootView`; imports `react-native-url-polyfill/auto` |
| `app/index.tsx` | Animated splash (Reanimated scale+fade, 2s); checks Supabase session |
| `app/onboarding.tsx` | 3-slide pager; tappable dots; "Get Started →" only on last slide |
| `app/login.tsx` | ImageBackground + dark gradient, LoginForm component |
| `app/register.tsx` | Same dark design, RegisterForm component |
| `app/profile.tsx` | Avatar → Name + KlimaTicket picker + Save → Nav shortcuts → Data section (Export/Import) → Danger Zone. **CRLF file — always full rewrite, never Edit tool** |
| `app/quests.tsx` | Quests & Achievements (segmented control); daily/weekly/milestone quests + achievements grid |
| `app/stats.tsx` | Stats & Insights; 4 stat cards; weekly bar chart; transport mix; top routes; KlimaTicket progress |
| `app/trips.tsx` | Full trip list; filter chips; date-grouped; swipe-left-to-delete (RNGH); tap → TripDetailModal |
| `app/(tabs)/user.tsx` | Main screen (see layout below). **CRLF file — always full rewrite, never Edit tool** |
| `app/(tabs)/_user_styles.tsx` | Styles for user.tsx; `_` prefix so Expo Router ignores it |
| `lib/supabase.ts` | Singleton Supabase client (AsyncStorage session persistence) |
| `services/tripStorage.ts` | AsyncStorage CRUD; key `@travelapp_trips`; `loadTrips()` returns `[]` when absent; `generateTripId()` via `crypto.randomUUID()` |
| `services/tripExport.ts` | Export (JSON → share sheet) and import (document picker → merge by ID); versioned format `version: 1` |
| `services/oebbApi.ts` | ÖBB REST API; base URL `https://oebb.macistry.com/api`; searchStation, searchConnections, summariseJourney (haversine fallback) |
| `types/trip.ts` | `Trip` interface (id, date, origin, destination, transportType, cost, distance, description) |
| `utils/levelSystem.ts` | XP/level calc; `getXPForTrip`, `calculateLevel`, `getLevelTitle`, etc. |
| `utils/questSystem.ts` | Quest types; DAILY_QUEST_POOL (8), WEEKLY_QUEST_POOL (8), MILESTONE_QUESTS (9); rotation logic |
| `utils/achievementSystem.ts` | 19 achievements × 5 categories; `computeStreak`, `computeSavedVsCar` |
| `utils/tripGrouping.ts` | `formatDateLabel` + `groupTripsByDate` — shared by user.tsx and trips.tsx |
| `utils/streakSystem.ts` | `computeStreak(trips)`; `STREAK_MILESTONES` (3/7/14/30/60/100 days → XP); `getNewMilestoneXP` |
| `constants/Colors.ts` | Exports `Palette` (custom 9-color system — see below) |
| `constants/transport.ts` | `TRANSPORT_COLOR` + `transportIcon()` — single source of truth for transport styling |
| `components/ui/LoginForm.tsx` | Supabase signInWithPassword |
| `components/ui/RegisterForm.tsx` | Supabase signUp with name metadata |
| `components/ui/FinancialOverview.tsx` | Collapsible savings card; SVG donut tappable → `/stats` |
| `components/ui/UserLevelCard.tsx` | XP/level + animated progress bar; streak badge when > 0; links to `/quests` |
| `components/ui/QuickAddTripModal.tsx` | Add trip modal; native DateTimePicker; optional `prefill` prop |
| `components/ui/TripDetailModal.tsx` | View/edit/delete modal; native DateTimePicker; `onLogAgain` prop |
| `components/ui/TripRouteFields.tsx` | Shared route input; price autofill; distance estimate; suggestions dropdown |
| `components/ui/XPToast.tsx` | Floating "+XP" badge animation |
| `components/ui/LevelUpOverlay.tsx` | Full-screen level-up celebration (auto-dismisses ~2.8s) |
| `components/ui/MainQuestOverlay.tsx` | Full-screen Main Quest celebration (6 stars, spring-in card, 2000 XP) |
| `trello_sync.js` | CLI tool for Trello board sync; credentials in `.env` (gitignored) |
| `pm_updater.py` | Updates `KlimaChallenge_PM_v5.xlsx` at end of each session |

---

## Main screen layout (`/(tabs)/user.tsx`)

1. Header — "My Climate Journey" + subtitle
2. `UserLevelCard` — XP bar + streak badge + link to `/quests`
3. `FinancialOverview` — collapsible savings card; donut → `/stats`
4. Favorites section — top 4 routes by frequency; hold-to-add (RNGH LongPress, 1s, fill animation)
5. Recent Trips — last 5, grouped by date; "See all X trips" → `/trips`; tap → `TripDetailModal`
6. Log Out button (red-bordered)
- `XPToast`, `LevelUpOverlay`, `MainQuestOverlay` rendered outside ScrollView
- `useFocusEffect` reloads profile + trips + XP on every focus

---

## Design system

**Background:** `Palette.blue.dark` (`#00334f`) on all screens
**Cards:** `rgba(255,255,255,0.07)` bg + `rgba(255,255,255,0.12)` border
**Accent/CTA:** `Palette.green.mid` (`#3fb28f`)

**Color palette** (`constants/Colors.ts`):
```ts
export const Palette = {
  blue:  { light: '#84c5dd', mid: '#0b6c8a', dark: '#00334f' },
  green: { light: '#9dcda2', mid: '#3fb28f', dark: '#418880' },
  red:   { light: '#eb6c4c', mid: '#e95b20', dark: '#e63c35' },
};
```

**NEVER hardcode hex values** except `#fff`. Always use `Palette.*`.

---

## Standing rules (critical)

### CRLF files — full rewrite only
`app/(tabs)/user.tsx` and `app/profile.tsx` use Windows CRLF line endings with 4-tab indentation.
**Never use partial edits (search-and-replace) on these files — always rewrite the entire file.**
Partial edits silently fail or corrupt the file.

### Icons inside Modals
Use **`MaterialIcons` only** inside React Native `<Modal>` components.
`IconSymbol` (SF Symbols) is unreliable inside Modal on iOS.

### Custom dev build required
`@react-native-community/datetimepicker` requires a **custom Expo dev build** — does not work in standard Expo Go.

### DateTimePicker pattern
- iOS: `display="spinner"` renders inline; needs a "Done" button to dismiss
- Android: `display="default"` shows system dialog; close on onChange
- Both modals use a single `Date` state (no separate hour/minute strings)

---

## Data model

```ts
interface Trip {
  id: string;           // crypto.randomUUID()
  date: Date;
  origin: string;
  destination: string;
  transportType: string; // 'Bus' | 'Train' | 'Tram' | 'Subway'
  cost: number;
  distance: number;
  description: string;
}
```

**Storage key:** `@travelapp_trips` (NOT `@trips`)
`loadTrips()` returns `[]` when key is absent — no demo data fallback.

---

## XP system

- `getXPForTrip(distance, transportType)` → base 10 + min(distance, 50) XP × transport multiplier
  - Multipliers: Tram 1.4×, Subway 1.3×, Train 1.2×, Bus 1.1×
- XP stored in AsyncStorage key `"userXP"`
- On first load: if XP is NaN/missing, seed by summing XP across all loaded trips
- Edit trip: XP delta (new − old) applied; never goes below 0
- Delete trip: trip XP subtracted (min 0)
- `getLevelTitle(level)` — "Novice Explorer" → "Legendary Voyager"

---

## AsyncStorage keys in use

| Key | Value |
|-----|-------|
| `userXP` | number string |
| `userName` | string |
| `klimaTicketType` | string |
| `klimaTicketCost` | number string |
| `@travelapp_trips` | JSON Trip array |
| `@claimedQuests` | JSON string[] (claim keys) |
| `@claimedAchievements` | JSON string[] (IDs) |
| `@dailyQuestSelection` | JSON {period, ids} |
| `@weeklyQuestSelection` | JSON {period, ids} |
| `@mainQuestCelebrated` | "true" when set |
| `@claimedStreakMilestones` | JSON number[] (milestone day-counts) |

---

## Favorites feature (hold-to-add)

- Top 4 routes by trip frequency shown as cards
- **Hold interaction:** `GestureDetector` + `Gesture.LongPress().minDuration(1000).runOnJS(true)` (RNGH)
- Fill animation: Reanimated `withTiming` fills card bottom→top over 1s; on release early → resets
- On complete: flash overlay plays, `onAdd()` fires, haptic (Impact Light)
- `GestureHandlerRootView` in `app/_layout.tsx` is required for this to work on mobile
- Many other approaches were tried and failed (TouchableOpacity, Pressable, PanResponder, scrollEnabled toggling) — RNGH is the correct solution

---

## Streak system

- `computeStreak(trips)` in `utils/streakSystem.ts` — consecutive-day streak ending today or yesterday
- Shown in `UserLevelCard` footer as 🔥 Xd (red, `local-fire-department` icon) when streak > 0
- `STREAK_MILESTONES`: 3/7/14/30/60/100 days → 50/150/300/600/1000/2000 XP bonus
- Milestones checked after each trip add; XP awarded 1.8s after trip toast

---

## Quest & achievement systems

**Quests (`utils/questSystem.ts`):**
- DAILY_QUEST_POOL (8 quests), WEEKLY_QUEST_POOL (8 quests), MILESTONE_QUESTS (9)
- 3 daily + 3 weekly shown at a time; rotate on new day/week
- Main Quest: reach KlimaTicket cost total → 2000 XP + `MainQuestOverlay` celebration (one-time)
- Claim → XPToast + LevelUpOverlay + Notification haptic

**Achievements (`utils/achievementSystem.ts`):**
- 19 achievements across 5 categories
- Grid view with lock overlay + progress bars + CLAIM button

---

## Cloud sync plan (Phase 0 done, Phase 1+ pending)

**Guiding principles:** AsyncStorage stays primary (offline-first); never modify `Trip` type; each phase ships independently.

**Done (S18):**
- Phase 0a: Removed `initialTrips` dead code from `tripStorage.ts`
- Phase 0b: `generateTripId()` using `crypto.randomUUID()` added; all trip creation uses it

**Next step — Phase 0c:** Create Supabase `trips` table + RLS:
```sql
create table trips (
  id             text primary key,
  user_id        uuid references auth.users not null,
  origin         text not null,
  destination    text not null,
  date           timestamptz not null,
  transport_type text not null,
  cost           numeric not null,
  distance       numeric not null,
  description    text,
  is_deleted     boolean default false,
  updated_at     timestamptz default now()
);
alter table trips enable row level security;
create policy "own trips" on trips for all using (auth.uid() = user_id);
```

**Phase 1:** New `services/syncService.ts` — `push()`, `pull()`, `sync()` functions. Merge strategy: local wins on conflict. Soft deletes via `@pending_deletes` AsyncStorage key.

**Phase 2:** Wire `saveAndSync` into user.tsx + trips.tsx; pull on `useFocusEffect`.

**Phase 3:** Recompute XP after pull if new remote trips arrive.

**Phase 4:** Sync status indicator in header (idle/syncing/error dot).

---

## Feature backlog (priority order, as of S18)

| # | Item | Effort | Notes |
|---|------|--------|-------|
| #52 | Trip generator wizard | M | Bulk-generate trips from route/frequency/date-range for existing KlimaTicket users |
| #39 | Cloud sync (Supabase) | L | Phase 0a+0b done; Phase 0c next |
| #44 | Onboarding rework | L | Pre-launch target |
| #46 | Trip list search & filter | M | |
| #48 | Push notifications | M | |
| #49 | Shareable achievement cards | S | |
| #50 | Stale XP seeding comment cleanup | XS | |
| #51 | Offline / API error indicator | XS | |
| — | Pricing API investigation | M | Pre-release |

**Active/queued:** #52 (trip generator wizard) — untested, needs review on device

---

## Pre-production checklist

- PP1 🔴 Re-enable Supabase email confirmation (currently disabled for dev)
- PP2 🟠 Resolve pricing API
- PP3 🟡 Add onboarding images (`onboard1.png`, `onboard2.png`, `loginbg.png` → `assets/images/`)
- PP4 🟡 App Store assets & metadata (icon, splash, description, screenshots)
- PP5 🟡 Final regression pass + EAS build

---

## Auth (Supabase)

- Project ID: `vbjpigfbwvetsaoxpogd` (KlimaChallenge)
- Email confirmation: **DISABLED** for dev — re-enable before production

---

## Project management

- **Excel:** `KlimaChallenge_PM_v5.xlsx` — dashboard, backlog, milestones, architecture, feature registry
- **Trello board:** https://trello.com/b/PbkrPAvm/klimachallenge (5 lists: Pre-Production / Active / Backlog / Done (Current) / archived Done lists)
- **`pm_updater.py`** — updates Excel at end of each session
- **`trello_sync.js`** — CLI for Trello; credentials in `.env` (gitignored; token expires ~2026-05-14)

---

*This handoff was generated from `.claude/memory/` + `CLAUDE.md` after Session 18.*
