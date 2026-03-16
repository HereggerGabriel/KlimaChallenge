---
name: TravelApp current project state
description: Current state of the TravelApp React Native / Expo project as of 2026-03-16 session 14
type: project
---

A React Native / Expo app for tracking public transport trips (bus, train, tram, subway) in Austria. Users log trips, track costs vs. KlimaTicket savings, earn XP/levels, complete quests, unlock achievements, and view stats & insights.

**Stack:** Expo SDK 54, Expo Router v6 (file-based), TypeScript, AsyncStorage, react-native-gesture-handler ~2.28.0, react-native-reanimated ~4.1.1, react-native-svg 15.12.1, Supabase (real auth — project `vbjpigfbwvetsaoxpogd`), NativeWind (CSS), expo-linear-gradient, @expo/vector-icons/MaterialIcons, @react-native-community/datetimepicker (native date/time picker, plugin added to app.config.ts). No axios — uses built-in fetch. Note: `react-native-gifted-charts` was tried and removed (Metro bundler resolution bug).

**Route architecture:**
- Pre-auth flow: `/` → `/onboarding` → `/login` → `/(tabs)/user`
- Auth gate: `supabase.auth.getSession()` in splash screen
- Non-tab screens (stack-routed): `/quests`, `/stats`, `/profile`, `/trips`
- `app/index.tsx` (splash): checks Supabase session → routes to `/(tabs)/user` or `/onboarding`
- Logout: `supabase.auth.signOut()`, routes to `/onboarding`

**Tab group:**
- Tab bar is HIDDEN (`tabBarStyle: { display: "none" }`)
- Only one screen: `/(tabs)/user` — the main authenticated screen

**Key file structure:**
- `app/_layout.tsx` — root layout, wraps app in `GestureHandlerRootView`; imports `react-native-url-polyfill/auto`
- `app/index.tsx` — animated splash (Reanimated scale+fade, 2s), checks Supabase session
- `app/onboarding.tsx` — 3-slide FRE pager; tappable dots; "Get Started →" only on last slide
- `app/login.tsx` — ImageBackground + dark gradient, LoginForm
- `app/register.tsx` — same dark design as login, RegisterForm
- `app/profile.tsx` — Layout order: avatar → Display Name + KlimaTicket selector + Save → nav shortcuts group (Stats & Insights / View Achievements / My Trips) → Danger Zone. KlimaTicket uses `TICKET_GROUPS` (nationwide 6 + regional 20 presets with real 2026 prices). `SlideToDelete` uses RNGH `Gesture.Pan().runOnJS(true)` + absolute overlay. KlimaTicket dropdown closes on outside tap via absolute `TouchableWithoutFeedback` overlay (zIndex 10); dropdown at zIndex 11.
- `app/quests.tsx` — Quests & Achievements screen (segmented control); daily/weekly/milestone quests + achievements grid; main quest featured card
- `app/stats.tsx` — Stats & Insights screen; overview cards, weekly bar chart, transport mix, top routes, KlimaTicket progress
- `app/trips.tsx` — Full trips list screen. Header (back + "All Trips" + count), filter chips (All/Bus/Train/Tram/Subway), date-grouped list, swipe-left-to-delete (RNGH Pan, -80px threshold, red zone revealed, 200ms fly-off + setTimeout), tap → TripDetailModal. Handles own XP updates + persists to AsyncStorage. useFocusEffect reloads on focus.
- `app/(tabs)/_layout.tsx` — Tabs with hidden tab bar, single screen `user`
- `app/(tabs)/user.tsx` — main screen (see below)
- `app/(tabs)/_user_styles.tsx` — styles for user.tsx; includes `root: { flex: 1 }`, `dateGroupHeader` style; prefixed with `_` so Expo Router ignores it
- `lib/supabase.ts` — singleton Supabase client (AsyncStorage session persistence, Constants fallback for URL/key)
- `services/tripStorage.ts` — AsyncStorage CRUD for trips; `loadTrips()` coerces distance+cost to float; storage key is `STORAGE_KEY = "@travelapp_trips"` (NOT `@trips`); **when key is missing, returns `[]` (NOT initialTrips demo data)**
- `services/oebbApi.ts` — OeBB REST API service; base URL `https://oebb.macistry.com/api`; searchStation, searchConnections (returns ConnectionSearchResult), mapTransportType, summariseJourney (with fallback haversine distance), estimateDistanceKm
- `types/trip.ts` — Trip interface: id, date, origin, destination, transportType, cost, distance, description
- `utils/levelSystem.ts` — XP/level calc; exports `getLevelTitle`, `getXPForTrip`, `calculateLevel`, etc.
- `utils/questSystem.ts` — Quest types, DAILY_QUEST_POOL (8), WEEKLY_QUEST_POOL (8), MILESTONE_QUESTS (9), MAIN_QUEST_ID/XP/CELEBRATED_KEY, pickRandomQuests, getClaimKey, timeUntilMidnight, daysUntilMonday
- `utils/achievementSystem.ts` — Achievement types, ACHIEVEMENTS (19), ACHIEVEMENT_CATEGORIES, computeStreak, computeSavedVsCar
- `utils/tripGrouping.ts` — Shared helpers: `formatDateLabel(date)` → "Today"/"Yesterday"/"Mon 16 Mar 2026"; `groupTripsByDate(trips)` → `TripGroup[]` ({label, trips}[]). Used by both user.tsx and trips.tsx.
- `constants/Colors.ts` — exports `Palette` (custom 9-color system)
- `constants/transport.ts` — exports `TRANSPORT_COLOR` (Bus=blue.mid, Train=green.mid, Tram=red.light, Subway=green.dark) and `transportIcon(type)` returning MaterialIcons name; single source of truth for transport styling
- `components/ui/LoginForm.tsx` — Supabase signInWithPassword, dark Palette style
- `components/ui/RegisterForm.tsx` — Supabase signUp with name metadata, dark Palette style, success state
- `components/ui/FinancialOverview.tsx` — collapsible savings card; donut circle (SVG) is tappable → `onStatsPress` prop → `/stats`
- `components/ui/UserLevelCard.tsx` — XP/level display, animated progress bar; bottom row links to `/quests` via `onQuestsPress` prop
- `components/ui/QuickAddTripModal.tsx` — add trip modal; fully dark theme; uses TripRouteFields; date/time via native `DateTimePicker` (spinner on iOS, dialog on Android; iOS has "Done" button); single `date` Date state (no separate hour/minute); connection autofill sets full date from summary.dep
- `components/ui/TripDetailModal.tsx` — trip detail + edit + delete modal; uses TripRouteFields in edit mode; date/time via native `DateTimePicker` same pattern as QuickAdd; single `editDate` Date state
- `components/ui/TripRouteFields.tsx` — shared route input component; price autofill, distance estimate, suggestions dropdown; dark theme only (light theme removed S11); no `theme` prop
- `components/ui/XPToast.tsx` — floating "+XP" badge animation (Reanimated spring+float)
- `components/ui/LevelUpOverlay.tsx` — full-screen level-up celebration overlay (auto-dismisses ~2.8s)
- `components/ui/MainQuestOverlay.tsx` — full-screen Main Quest celebration (6 floating stars, card spring-in, stats, Claim CTA); triggered when totalCost >= klimaTicketCost for the first time
- `KlimaChallenge_PM.xlsx` — project management Excel file (dashboard, backlog, milestones, architecture, feature registry)
- `pm_updater.py` — Python helper script for updating the PM Excel; use `PMUpdater` class; call at end of each session instead of writing one-off scripts. Has `__main__` template block — fill values and run `python pm_updater.py`. Dashboard: Row 5 = headers, Row 6 = current values, Row 7 = previous values.
- `.claude/memory/` — project memory files (version-controlled in git); always update both this folder AND `C:\Users\gabri\.claude\projects\f--projects-TravelApp-travelapp\memory\` in sync.

**`/(tabs)/user.tsx` — main screen layout:**
1. Header: "My Climate Journey" title + subtitle (paddingTop: 52)
2. `UserLevelCard` — animated XP bar; bottom row: "Quests & Achievements" → `/quests`
3. `FinancialOverview` — collapsible financial card; donut tappable → `/stats`
4. Favorites section (hold-to-add RNGH); star icon in title
5. Recent Trips — clock icon; shows 5 trips **grouped by date** (date group headers); "See all X trips" navigates to `/trips`; trip cards show transport type + time (date removed from card, shown in header); tap opens TripDetailModal
6. Log Out button — red-bordered, bottom of screen
- Wrapped in `<View style={{flex:1}}>` with `XPToast`, `LevelUpOverlay`, `MainQuestOverlay` outside ScrollView
- `checkMainQuest(allTrips, ticketCost)` called after every trip add; one-time flag `@mainQuestCelebrated`
- `useFocusEffect` reloads both profile AND trips+XP from AsyncStorage on every screen focus
- No `showAllTrips` state — expand-in-place removed

**`app/profile.tsx`:**
- Layout order: Avatar → Display Name + KlimaTicket selector + Save → nav shortcuts (Stats, Achievements, My Trips) → Danger Zone
- Nav shortcuts use `navButton`/`navSection` styles (gap: 10 between buttons, marginTop: 32 from Save)

**`app/trips.tsx`:**
- Stack-pushed full trips list at `/trips`
- Filter chips: All / Bus / Train / Tram / Subway
- All trips grouped by date using `groupTripsByDate`
- SwipeableTripCard: RNGH Pan + Reanimated, swipe left past -80px → red delete zone revealed → card flies off → `onDelete()` after 200ms setTimeout
- Tap → TripDetailModal (view/edit with XP delta)
- Own delete/edit handlers that persist to AsyncStorage + saveTrips()
- user.tsx reloads on focus via useFocusEffect (picks up changes made in trips.tsx)

**`app/quests.tsx`:**
- AsyncStorage keys: `@claimedQuests` (JSON array of claim keys), `@claimedAchievements` (JSON array of IDs), `@dailyQuestSelection`, `@weeklyQuestSelection`
- **Empty state banner**: when `trips.length === 0`, info banner shown at top of Quests tab ("Log your first trip to start making quest progress")
- Quest rotation: `loadOrRefreshSelection` stores `{period, ids}` by date/weekStart key; regenerates on new period
- Quests tab: `MainQuestFeaturedCard` at top (red border, progress bar, CLAIM 2000 XP); Daily (3/8); Weekly (3/8); Milestones (9/9)
- Achievements tab: global total row + 5 category sections; 2-col grid with lock overlay, progress bars, CLAIM
- XP awarded on claim → XPToast + LevelUpOverlay

**`app/stats.tsx`:**
- CO2 factor: 0.16 kg/km (car 0.21 − PT 0.05)
- Sections: 4 stat cards (trips, distance, CO2 with long-press tooltip, avg cost); KlimaTicket progress bar; WeeklyBarChart (custom View-based, last 8 ISO weeks); Transport Mix (horizontal bars); Top Routes (ranked list, top 5)
- **Empty state**: when `totalTrips === 0`, all data sections replaced by icon + title + body + "Log a Trip" CTA button (routes back). No zero-value noise for new users.
- Entry: profile "Stats & Insights" button + tapping donut in FinancialOverview

**XP / level system:**
- `getXPForTrip(distance, transportType)` — base 10 + min(distance,50) XP × transport multiplier
- `getLevelTitle(level)` — "Novice Explorer" → "Legendary Voyager"
- XP stored in AsyncStorage key `"userXP"`; seeded from all trips on first load
- Edit trip: XP delta (new - old) applied; never goes below 0
- Delete trip: trip XP subtracted (min 0)

**AsyncStorage keys in use:**
- `userXP`, `userName`, `klimaTicketType`, `klimaTicketCost`
- `@trips` (trip list)
- `@claimedQuests`, `@claimedAchievements`
- `@dailyQuestSelection`, `@weeklyQuestSelection`
- `@mainQuestCelebrated`

**Design system:**
- All screens: `Palette.blue.dark` (#00334f) background
- Cards: `rgba(255,255,255,0.07)` bg + `rgba(255,255,255,0.12)` border
- Accents/CTAs: `Palette.green.mid` (#3fb28f)
- No hardcoded hex except `#fff`
- Icons in modals/overlays: MaterialIcons ONLY (not IconSymbol — SF Symbols unreliable inside Modal on iOS)

**Auth (Supabase):**
- Project: `vbjpigfbwvetsaoxpogd` (KlimaChallenge)
- Email confirmation currently DISABLED for dev (re-enable before production)

**Pending assets:** `onboard1.png`, `onboard2.png`, `loginbg.png` (user to place in `assets/images/`)

**DateTimePicker notes:**
- Package: `@react-native-community/datetimepicker` (plugin registered in app.config.ts)
- Requires a custom dev build — does NOT work in standard Expo Go
- iOS: `display="spinner"` renders inline; show "Done" button to dismiss
- Android: `display="default"` shows system dialog; close on onChange
- Both modals use a single `Date` state (no separate hour/minute strings); date picker preserves existing time when changing date
