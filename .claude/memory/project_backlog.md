---
name: TravelApp backlog
description: Prioritized backlog of planned features and fixes — updated session 10 (2026-03-16)
type: project
---

**Completed (session 3, 2026-03-15):**

1. ~~**Trip detail popup**~~ — DONE. `TripDetailModal`. Delete with confirm overlay. MaterialIcons only.
2. ~~**XP seeding fix**~~ — DONE. Seeds from all trips if stored XP is NaN/missing.
3. ~~**Logout fix**~~ — DONE. Red-bordered button, `supabase.auth.signOut()`, routes to `/onboarding`.
4. ~~**User page overhaul**~~ — DONE. Safe-area, loading spinner, section icons, accent bars, show all/less.

**Completed (session 4, 2026-03-15):**

5. ~~**Proper login/register**~~ — DONE. Real Supabase auth, dark Login/Register screens, onboarding pager, animated splash.

**Completed (session 5, 2026-03-15):**

6. ~~**Trip editing**~~ — DONE. TripDetailModal edit mode with XP delta.
7. ~~**XP feedback on add**~~ — DONE. XPToast + LevelUpOverlay.
8. ~~**Empty state**~~ — DONE.
9. ~~**KlimaTicket cost as a setting**~~ — DONE. Persisted presets in profile.
10. ~~**User profile**~~ — DONE. `app/profile.tsx` with avatar, name, KlimaTicket picker.
11. ~~**Level-up animation**~~ — DONE. LevelUpOverlay spring-in, auto-dismiss.

**Completed (session 6, 2026-03-15):**

12. ~~**Price autofill**~~ — DONE. ROUTE_PRICES + TRANSPORT_FLAT_PRICES in TripRouteFields.
13. ~~**Suggestions dropdown**~~ — DONE. recentPlaces filtered as user types.
14. ~~**Swap button**~~ — DONE. Between origin/destination in TripRouteFields.
15. ~~**Distance estimator**~~ — DONE. Estimate button in TripRouteFields, haversine×1.25.
16. ~~**Shared TripRouteFields component**~~ — DONE. Used by both modals with theme prop.

**Completed (session 7, 2026-03-15):**

17. ~~**ÖBB distance fix**~~ — DONE. summariseJourney haversine fallback, zero extra API calls.
18. ~~**QuickAdd dark theme**~~ — DONE. Fully converted to dark theme matching TripDetailModal.
19. ~~**Price autofill mount fix**~~ — DONE. useRef(false) mount guard skips first render.
20. ~~**Connection description autofill**~~ — DONE. Fills description as "Origin → Dest · HH:MM · TrainName".
21. ~~**Transport type defaults empty**~~ — DONE. Forces user to pick; autofilled from connection.
22. ~~**QuickAdd layout improvements**~~ — DONE. Field order, labels, spacing tightened.
23. ~~**Project management Excel**~~ — DONE. KlimaChallenge_PM.xlsx with 5 sheets.

**Completed (session 8, 2026-03-15):**

24. ~~**Quest system**~~ — DONE. utils/questSystem.ts; daily (8), weekly (8), milestone (9) pools; random rotation stored in AsyncStorage.
25. ~~**Achievement system**~~ — DONE. utils/achievementSystem.ts; 19 achievements × 5 categories; computeStreak, computeSavedVsCar.
26. ~~**Quests & Achievements screen**~~ — DONE. app/quests.tsx; segmented control; section counts; XP claim with toast/level-up.
27. ~~**Main Quest**~~ — DONE. MainQuestFeaturedCard in quests.tsx; MainQuestOverlay celebration (floating stars, spring-in card); one-time @mainQuestCelebrated flag; 2000 XP reward.
28. ~~**Quests entry point (UserLevelCard)**~~ — DONE. Bottom row tap → /quests.
29. ~~**Achievements entry point (profile)**~~ — DONE. "View Achievements" button → /quests?tab=achievements.

**Completed (session 14, 2026-03-16):**

40. ~~**#42 Manual date/time for trips (backfill)**~~ — DONE. Native `@react-native-community/datetimepicker` (plugin added to app.config.ts). iOS: spinner inline + "Done" button. Android: system dialog. Single `date` Date state in both modals — no more separate hour/minute strings. Requires custom dev build (not Expo Go).
41. ~~**Recent trips rework**~~ — DONE. Main screen: date group headers ("Today"/"Yesterday"/date) on 5-trip preview; cards simplified to transport+time. "See all X trips" navigates to new `/trips` screen. New `app/trips.tsx`: filter chips (All/Bus/Train/Tram/Subway), full date-grouped list, swipe-left-to-delete (RNGH Pan, -80px threshold, red zone, 200ms fly-off). New `utils/tripGrouping.ts` shared helper. Deleted dead stubs `app/new-trip.tsx` + `app/trip/[id].tsx`.
42. ~~**Profile layout rework + My Trips shortcut**~~ — DONE. New order: Avatar → Display Name + KlimaTicket + Save → nav shortcuts group (Stats / Achievements / My Trips) → Danger Zone. "My Trips" navigates to `/trips`.

**Completed (session 13, 2026-03-17):**

36. ~~**#36 Delete All — reset quests/achievements**~~ — DONE. `AsyncStorage.multiRemove` for all 4 quest/achievement keys in `handleDeleteAllTrips`.
37. ~~**#37 Remove initialTrips demo fallback**~~ — DONE. `loadTrips()` returns `[]` when key absent.
38. ~~**#38 Profile dropdown close on outside tap**~~ — DONE. Absolute `TouchableWithoutFeedback` overlay (zIndex 10).
39. ~~**#41 Empty states — Stats & Quests**~~ — DONE. Stats: full empty state replacing zero-data sections. Quests: info banner.

**Completed (session 9, 2026-03-16):**

30. ~~**Stats & Insights screen**~~ — DONE. app/stats.tsx; 4 stat cards; KlimaTicket progress; WeeklyBarChart (custom View); Transport Mix; Top Routes; CO2 with long-press tooltip.
31. ~~**Stats entry point (FinancialOverview donut)**~~ — DONE. Donut wheel tappable via onStatsPress prop → /stats.
32. ~~**Stats entry point (profile)**~~ — DONE. "Stats & Insights" button in profile → /stats.
33. ~~**Normalise trip.date on load**~~ — CLOSED. Already resolved; `loadTrips()` does `date: new Date(trip.date)` on parse.

**Completed (session 15, 2026-03-16):**

43. ~~**#45 Haptic feedback**~~ — DONE. `expo-haptics` (already installed). Impact (Medium) on trip add via QuickAdd; Impact (Light) on favorite add; Notification (Success) on level-up, quest claim, achievement claim, main quest claim; Impact (Medium) on swipe-delete in trips.tsx.
44. ~~**#43 Streak system**~~ — DONE. `utils/streakSystem.ts` → `computeStreak(trips)`: consecutive-day streak ending today or yesterday. Displayed in `UserLevelCard` footer as 🔥 Xd (red, `Palette.red.light`, `MaterialIcons local-fire-department`). Computed via `useMemo([trips])` in user.tsx. Hidden when streak = 0.

**Completed (session 16, 2026-03-16):**

45. ~~**Streak milestone rewards**~~ — DONE. `STREAK_MILESTONES` (3/7/14/30/60/100 days → 50/150/300/600/1000/2000 XP) in `utils/streakSystem.ts`. `getNewMilestoneXP(streak, claimed)` returns bonus XP + newly-hit milestone day-counts. `claimedMilestones` state loaded on init/focus. After each trip add, `checkStreakMilestones` fires; if a milestone is hit, XP awarded 1.8s after trip toast (with haptic + level-up if needed). Claimed set persisted to `@claimedStreakMilestones`.
46. ~~**#47 "Log Again" (replaces recurring-trip backlog item)**~~ — DONE. `onLogAgain` prop on `TripDetailModal`; view mode shows two-button row: "Close" + green "Log Again" (replay icon). Tapping closes detail modal, populates `prefillData` state, opens `QuickAddTripModal`. `QuickAddTripModal` gains optional `prefill` prop (PrefillData type); `useEffect([visible])` populates fields when modal opens with prefill. Date always resets to now.

**Remaining — Feature Backlog (priority order, as of S16):**

- 🟠 **#39** Cloud sync for trips (Supabase) — L effort
- 🟠 **#44** Onboarding rework package — L effort, Pre-launch target
- 🟡 **#46** Trip list search & filter — M effort
- 🔵 **#40** Trip export / CSV — S effort
- 🔵 **#47** Recurring trip / one-tap repeat — S effort
- 🔵 **#48** Push notifications — M effort
- 🔵 **#49** Shareable achievement cards — S effort
- 🔵 **#50** Stale XP seeding comment cleanup — XS effort
- 🔵 **#51** Offline / API error indicator — XS effort
- 🟠 Pricing API investigation — M effort, Pre-release
- 🔵 More prefetched route prices — XS effort

**Pre-production checklist:**
- PP1 🔴 Re-enable Supabase email confirmation
- PP2 🟠 Resolve pricing API
- PP3 🟡 Add onboarding images (`onboard1.png`, `onboard2.png`, `loginbg.png`)
- PP4 🟡 App Store assets & metadata
- PP5 🟡 Final regression pass + EAS build

**Tech debt (session 11 — completed):**

- ~~**#9 Memoize computeFavorites**~~ — DONE. `useMemo([trips])` in user.tsx.
- ~~**#25 Memoize recentPlaces**~~ — DONE. `useMemo([trips])` in user.tsx.
- ~~**#10 Centralise transport constants**~~ — DONE. `constants/transport.ts` with `TRANSPORT_COLOR` (Bus=blue.mid, Train=green.mid, Tram=red.light, Subway=green.dark) and `transportIcon()`. user.tsx and stats.tsx import from there.
- ~~**#26 Fix floating checkMainQuest promise**~~ — DONE. `await` added in `handleFavoritePress` and `handleQuickAddSubmit`.
- ~~**#27 Remove getTripById dead code**~~ — DONE. Removed from `services/tripStorage.ts`.

**Tech debt — ALL CLEARED (session 11):**

- ~~**#28 Remove light theme from TripRouteFields**~~ — DONE. `theme` prop removed; light styles deleted; `IconSymbol` import removed.
- ~~**#29 Merge screenStyles into user_styles.tsx**~~ — DONE. `root: { flex: 1 }` in user_styles.tsx; `screenStyles` + `StyleSheet` import removed from user.tsx.
- ~~**#30 typeIcon()**~~ — DONE. Moved to `constants/transport.ts` as `transportIcon()`.
- ~~**#31 eslint-disable TripRouteFields useEffect**~~ — DONE. Comment added above useEffect.
- ~~**#12 Debounce ÖBB connection search**~~ — DONE. 400ms debounce via `searchDebounceRef` in QuickAddTripModal.tsx.

**Pre-production:**

- **Re-enable email confirmation** — disabled in Supabase for dev. Must re-enable before production.
- **Add onboarding images** — `onboard1.png`, `onboard2.png`, `loginbg.png` in `assets/images/`.
- **App Store assets & metadata** — icon, splash, description, screenshots.

**Why:** All items requested by user across sessions 1-10 (2026-03-14 to 2026-03-16).
**How to apply:** Pick items from top of remaining list unless user specifies otherwise. Always check this backlog when starting a new session.
