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

**Completed (session 9, 2026-03-16):**

30. ~~**Stats & Insights screen**~~ — DONE. app/stats.tsx; 4 stat cards; KlimaTicket progress; WeeklyBarChart (custom View); Transport Mix; Top Routes; CO2 with long-press tooltip.
31. ~~**Stats entry point (FinancialOverview donut)**~~ — DONE. Donut wheel tappable via onStatsPress prop → /stats.
32. ~~**Stats entry point (profile)**~~ — DONE. "Stats & Insights" button in profile → /stats.
33. ~~**Normalise trip.date on load**~~ — CLOSED. Already resolved; `loadTrips()` does `date: new Date(trip.date)` on parse.

**Remaining — Feature Backlog (priority order):**

1. 🔴 **#36 Delete All Trips must also reset quests/achievements** — `handleDeleteAllTrips` clears trips+XP+mainQuestCelebrated but NOT `@claimedQuests`, `@claimedAchievements`, `@dailyQuestSelection`, `@weeklyQuestSelection`. User who resets sees stale claimed state. **Very high priority.**
2. 🔴 **#37 Remove `initialTrips` demo data fallback** — `loadTrips()` in `tripStorage.ts` returns 10 hardcoded trips when key is missing. New users see fake data. Change fallback to `[]`. Pre-prod blocker.
3. 🟡 **#38 Profile KlimaTicket dropdown — close on outside tap** — tapping outside the open dropdown does nothing; should close it.
4. 🟠 **#39 Cloud sync for trips (Supabase)** — trips are AsyncStorage-only; logging in on a new device starts from scratch. Sync to Supabase trips table.
5. 🔵 **#40 Trip export / CSV download** — useful for tax/Jobticket purposes; export all trips as CSV.
6. **Pricing API research** — HAFAS proxy returns no ticket prices. Candidates: ÖBB Scotty API, VAO, scraping ÖBB.at.
7. **More prefetched route prices** — add Graz, Salzburg, Innsbruck, Linz routes to ROUTE_PRICES in TripRouteFields.

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
