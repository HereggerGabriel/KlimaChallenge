# KlimaChallenge — Roadmap

Goal: a polished, well-functioning prototype, then a user study (Jan–Feb 2027), then thesis submission (end of March 2027).
Work happens on the `dev/prototype` branch.

## Design decisions (Oct 20, 2026)
- **Sign-in:** anonymous by default (Supabase anonymous sign-in, no email needed); users can optionally link an email account later, e.g. to keep their data on a new phone.
- **Trip price:** the app estimates the single-ticket price from the distance, the user can correct it, and the corrected price is remembered per route.
- **Language:** German + English, following the phone's language.
- **Rewards:** keep tap-to-claim for quests and achievements (the claim moment matters, and claims are useful study data).

## M1 — Foundation
- [x] Enforce LF line endings (`.gitattributes`)
- [x] Remove junk files and retired Trello/Excel tooling
- [ ] Untrack `.claude/settings.local.json` (contained a Trello token); needs your OK (Claude config)
- [x] Move docs and old PM spreadsheets into `docs/`; add this roadmap
- [ ] Updated CLAUDE.md + memory files (written, uncommitted); needs your OK (Claude config)
- [x] Align dependencies with Expo SDK 54, remove unused ones, add `expo-dev-client`
- [x] Remove dead template code and NativeWind
- [x] Merge `app.json` + `app.config.ts` into one config; consistent KlimaChallenge branding
- [x] Prettier + ESLint, one-time formatting pass
- [x] `tsc` at 0 errors
- [x] EAS development build installed on an Android phone (USB + `adb reverse`)

## M2 — Fix what's broken
- [ ] Replace the dead ÖBB proxy (`oebb.macistry.com`, suspended) with a bundled Austrian station list (GTFS), autocomplete and a distance estimate
- [ ] Price estimate from distance (approximate ÖBB/Verbund standard fares), editable, remembered per route
- [x] Replace `IconSymbol` with `MaterialIcons` everywhere (icons blank on Android)
- [ ] Fix trip export/import: `expo-file-system/legacy` import done in M1; error handling still open
- [x] Daily/weekly quest keys in local time instead of UTC (+ first unit tests)
- [x] Keep trips sorted by date after add/edit/import
- [x] Move user screen styles out of `app/` (router treated them as a route)
- [x] Profile: KlimaTicket picker as a scrollable bottom sheet (was unscrollable)
- [x] Clear error when Supabase env vars are missing
- [ ] Anonymous sign-in on first launch; remove the mandatory login/register flow (enable anonymous sign-ins in the Supabase dashboard)
- [ ] Optional "link email" in the profile (keeps the same user ID); password reset only for linked accounts
- [ ] Logout only for linked accounts, and it clears local data

## M3 — Data core
- [ ] Shared trips store (one set of add/edit/delete functions for all screens)
- [ ] XP calculated from trips plus a log of claimed rewards, instead of a stored counter
- [ ] Ticket profile with start date: break-even per ticket year, honest "savings"
- [ ] Unit tests: levels, streaks, quests, break-even, import

## M4 — Polish and insights
- [ ] Split oversized screens (quests, profile, stats, TripDetailModal)
- [ ] App icon, splash screen, compressed images
- [ ] Onboarding rework (#44) including ticket setup
- [ ] Insights: weekly recap, this week vs last week, break-even projection, CO₂ framing
- [ ] Undo for deletes; offline/error states (#51)
- [ ] Translation setup (German + English, follows the phone language); move all UI texts into translation files
- [ ] Accessibility basics
- [ ] Bottom spacing for Android's navigation bar on all screens

### UI findings from the device walkthrough (Oct 20, 2026)
Fixed on the spot: black donut center, "560 trips needed" with no trips, trip creation crash (`crypto` missing on Hermes), unscrollable ticket picker, duplicated login subtitle.

All screens
- [ ] Edge-to-edge: content scrolls under the status bar; buttons and forms sit behind Android's navigation bar (fix centrally with safe-area insets)
- [ ] One term for the trip amount everywhere ("Ticket value"); currently "Cost", "Ticket Price" and "Ticket Value"
- [ ] Consistent money formatting (always cents, or always rounded); stats and quests mix both
- [ ] Remove extra bottom padding in cards (trip card, transport mix)

Main screen
- [ ] Only one "Add Trip" button in the empty state
- [ ] Remove the large gap between Financial Overview and Recent Trips
- [ ] New-user hint on the level card ("Log your first trip to earn XP")
- [ ] Favorites only for routes with 2+ trips; layout adapts to 1–2 cards (no half-width card, no truncated route)
- [ ] Badge on the level card when rewards are ready to claim ("1 ready")
- [ ] Financial Overview: show each number once (donut + 2–3 key figures), details live on the stats screen
- [ ] Log Out moves to the profile (or goes away with anonymous sign-in)

Trip form and detail
- [ ] Quick Add flow: route (station autocomplete) → transport type → price/distance auto-filled and editable → date defaults to now
- [ ] Remove the dead "Connection" section
- [ ] Detail view: route title on two lines instead of truncating; transport row uses the trip's transport icon

Trip list
- [ ] Label the trip count ("1 trip")
- [ ] Undo after swipe-delete ("Trip deleted · Undo")
- [ ] Add-trip button on the list screen
- [ ] Daily totals in group headers ("TODAY · €10.20 · 42 km")

Stats and quests
- [ ] Week labels as dates ("13 Oct") instead of "W43"
- [ ] Show "saved vs. driving" (already computed in achievementSystem) as a headline number
- [ ] Top routes: tap to log again
- [ ] Quest cards: fixed layout (XP top right, CLAIM below), full-width progress bars

## M5 — Study-ready
- [ ] Consent screen, anonymized one-way data upload
- [ ] Switch for the game features (optional baseline phase)
- [ ] Internal builds (Android APK; TestFlight if the Apple account is set up)

## Out of scope for the thesis
Full cloud sync (plan in `.claude/memory/plan_cloud_sync.md`), trip generator (#52), push notifications, shareable cards, App Store release.
