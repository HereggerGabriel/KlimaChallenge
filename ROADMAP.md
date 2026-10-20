# KlimaChallenge — Roadmap

Goal: a polished, well-functioning prototype, then a user study (Jan–Feb 2027), then thesis submission (end of March 2027).
Work happens on the `dev/prototype` branch.

## Schedule (proposal, Oct 20, 2026)

| Milestone | Dates | Status |
|---|---|---|
| M1 Foundation | Oct 20 | done |
| M2 Trip entry + fixes | Oct 20 | done |
| M3 Data core | Oct 20 | done |
| M4 Cloud backup | Nov 16 – Nov 22 | |
| Pilot test (5–8 people, 2 weeks) | Nov 30 – Dec 13 | runs in parallel with M5 |
| M5 Polish + insights | Nov 23 – Dec 18 | |
| M6 Study-ready | Dec 19 – Jan 10 | includes holidays |
| Study | Jan 11 – Feb 21 | |
| Analysis + writing | Feb 22 – Mar 31 | |

## Design decisions (Oct 20, 2026)
- **Sign-in:** anonymous by default (Supabase anonymous sign-in, no email needed). Users can optionally create an account, which upgrades the same user ID.
- **Data:** trips are backed up to Supabase (M4), so logging in on a new phone restores them. The same table provides the study data (exported without station names).
- **Trip price:** the app estimates the single-ticket price from the distance, the user can correct it, and the corrected price is remembered per route.
- **Language:** German + English, following the phone's language.
- **Rewards:** keep tap-to-claim for quests and achievements (the claim moment matters, and claims are useful study data).

## M1 — Foundation ✅
Done: LF line endings, repo cleanup, dependencies aligned with SDK 54, dead code and NativeWind removed, single app config, Prettier + ESLint, `tsc` at 0, dev build on Android (USB + `adb reverse`, `npm run dev`).

Waiting on the user (changes to Claude's own config can't be committed by Claude):
- [x] Untrack `.claude/settings.local.json` (contained a Trello token, expired since May 2026)
- [x] Commit the updated CLAUDE.md + `.claude/memory/` files

## M2 — Trip entry + fixes
Done: icons on Android, quest dates in local time (+ first unit tests), trips sorted by date, styles moved out of `app/`, scrollable ticket picker, trip creation crash (`crypto` on Hermes), donut and "trips needed" fixes, anonymous sign-in, optional account (upgrade in place), logout in the profile with a warning.

- [x] Bundled Austrian station list (ÖBB GTFS, 1,117 stations) with autocomplete in origin/destination
- [x] Rail distance from the GTFS track network (offline, Dijkstra); straight-line fallback
- [x] Price estimate from distance (model fitted to ÖBB Relationspreise, median deviation 4.9%), editable, remembered per route
- [x] Data pipeline documented in `scripts/data/README.md`; ÖBB attribution in the profile
- [x] Quick Add flow: route → transport type → price/distance auto-filled → date defaults to now; dead "Connection" section removed
- [x] Trip edit: ticket value and distance editable (weren't before)
- [x] Hint under estimated prices (regional Verbund tickets often cost more) + "Check price at ÖBB" link to the ticket shop
- [x] Test the new trip entry on the device
- [x] "Check price at ÖBB" opens the route pre-filled in the ÖBB timetable (one tap on "Ticket und Preise" per connection); remembered price shows the ÖBB estimate alongside
- [x] Export/import: clear messages (not JSON, no trips, nothing to export, sharing unavailable, X imported / Y already there)

## M3 — Data core
- [x] Shared store `store/AppData.tsx` (trips, reward log, profile); all screens use it, none touch storage directly
- [x] XP calculated from trips plus a log of claimed rewards (with timestamps), instead of a stored counter; one-time migration of old data
- [x] App-wide "+XP" / level-up feedback driven by the store
- [x] Ticket profile with start date ("Ticket valid from"): break-even and main quest per ticket period
- [x] Net savings after break-even ("Net Savings +€X") and the current ticket period ("Ticket year since … · N days left") in the overview and stats
- [x] Unit tests: levels, derived XP, migration, ticket periods, store (59 tests)
- [x] Unit tests: quest progress functions, import file parsing (11 suites, 76 tests in total)
- [x] Device test of the store migration flows (add/edit/delete, claims, import, ticket start date)

## M4 — Cloud backup
Builds on M3's data model; replaces the one-way study upload planned earlier. Background in `.claude/memory/plan_cloud_sync.md`.
- [ ] Supabase tables for trips and claimed rewards, row-level security (each user only sees their own rows)
- [ ] Save locally first, then upload in the background; works offline and catches up later
- [ ] Restore on login / new phone; deletions propagate (soft delete)
- [ ] Anonymous trips are kept when creating an account (same user ID via upgrade, nothing to move)
- [ ] Decide: anonymous user logs in to an *existing* account → merge this phone's trips into it (suggested; UUIDs prevent duplicates) or ask first
- [ ] Small sync status indicator (only shown when something fails)
- [ ] Study export: query/view without station names (date, transport type, km, price, rewards)

## M5 — Polish + insights
General
- [ ] Translation setup (German + English, follows the phone language); all UI texts in translation files
- [ ] Edge-to-edge: content under the status bar, buttons behind Android's navigation bar (central fix with safe-area insets)
- [ ] One term for the trip amount ("Ticket value") and one money format everywhere
- [ ] Split oversized screens (quests, profile, stats, TripDetailModal)
- [ ] App icon, splash screen, compressed images
- [ ] Onboarding rework (#44) including ticket setup and start date
- [ ] Onboarding asks for the most common trip and its real price (seeds the remembered route price; real prices for the study)
- [ ] Optional: request ÖBB's partner deep-link parameters so "Check price" opens the shop with the route pre-filled
- [ ] Undo for deletes; offline/error states (#51)
- [ ] Accessibility basics
- [ ] Password reset for accounts (needs an email link back into the app)

Insights (second research goal: motivation through insight)
- [ ] "Saved vs. driving" as a headline number
- [ ] Weekly recap: this week vs. last week
- [ ] Break-even forecast ("pays off around [date]")
- [x] Week labels as dates ("13.10.") instead of "W43"
- [ ] Daily totals in trip list headers

Walkthrough findings (Oct 20, 2026)
- [x] Main screen: one "Add Trip" button in the empty state
- [ ] Main screen: smaller gap above Recent Trips; new-user hint on the level card
- [ ] Main screen: Financial Overview shows each number once (details on the stats screen)
- [x] Favorites only for routes with 2+ trips; cards stretch to full width when alone
- [ ] Badge on the level card when rewards are ready ("1 ready")
- [ ] Trip detail: route title on two lines; transport row uses the trip's icon
- [x] Trip list: labelled count ("3 trips")
- [ ] Trip list: add button, undo after swipe-delete
- [ ] Top routes: tap to log again
- [ ] Quest cards: fixed layout (XP top right, CLAIM below), full-width progress bars
- [ ] Remove extra bottom padding in cards

## M6 — Study-ready
- [ ] Consent screen (GDPR), study participant info
- [ ] Switch for the game features (optional tracking-only baseline phase)
- [ ] Decide on email confirmation for accounts (currently off)
- [ ] Internal builds: Android APK; TestFlight if the Apple Developer account is set up
- [ ] Pre/post questionnaires ready; analysis script for the exported data

## Out of scope for the thesis
Trip generator (#52), push notifications, shareable cards, App Store release, real-time sync between devices.
