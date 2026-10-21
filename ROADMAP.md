# KlimaChallenge — Roadmap

Goal: a polished, well-functioning prototype, then a user study (Jan–Feb 2027), then thesis submission (end of March 2027).
Work happens on the `dev/prototype` branch (pushed to GitHub).

**New session? Start here:** this file, then `docs/ARCHITECTURE.md`. Readable progress: [Project Log](https://claude.ai/artifact/5H3s9HaFLvgKiXJ3ESSi3j) (add a session row at the end of each session) · decisions of 21 Oct with reasons: [Status, Recap & Next Steps](https://claude.ai/artifact/1aqw6UxEwQtETnQbH9RZ8K).

## Schedule (proposal, Oct 20, 2026)

| Milestone | Dates | Status |
|---|---|---|
| M1 Foundation | Oct 20 | done |
| M2 Trip entry + fixes | Oct 20 | done |
| M3 Data core | Oct 20 | done |
| M4 Cloud backup | Nov 16 – Nov 22 | done Oct 21 |
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

## Decisions of 21 Oct 2026
- **Participants:** students and commuters; mainly Carinthia, plus Vienna/Graz commuters, maybe Tyrol. Anyone may join; non-holders pick a **hypothetical ticket** ("would have paid off"). Profile flag "I own this ticket" vs "comparing only", recorded as study variable.
- **One trip = the whole journey** with one ticket price; optional "via / extra modes" note.
- **Consent:** privacy notice for everyone in onboarding; participants enter a **study code** + explicit consent at the start (code links questionnaires to usage data); "leave study + delete my data" in the profile. Ethics requirement still to ask.
- **Baseline switch** gets built; use decided with the supervisor (not yet consulted).
- **Reminders:** onboarding asks "Do you want reminders?"; on/off recorded over time. Needs expo-notifications (new build, bundle with other native changes in M5).
- **Streak:** weekly **goal ladder** replaces the daily streak: active days (≥1 trip), start 1 day or onboarding estimate, +1 suggested after each met week (user accepts or keeps), default cap 5 (user can raise), one pause per month; streak = consecutive weeks with goal met; weekly goal recorded as study data.
- **Rewards revoked automatically** when deleted/edited trips no longer meet a claimed quest, checked against the claim's own day/week; user sees "−35 XP: Double up no longer met"; deletions logged.
- **Social:** only an anonymous community total.
- **Apple account** after the pilot, ideally by mid-December.
- **Thesis language** English; app German + English.
- **Supabase** stays free, kept active; weekly study-data export (M6).
- **Documentation:** PM spreadsheet updated at each milestone + Project Log doc every session.

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

## M4 — Cloud backup ✅
Done Oct 21, 2026 (planned Nov 16–22). Migration `supabase/migrations/20261021120000_cloud_backup.sql` (run once in the dashboard SQL editor); how it works: `docs/ARCHITECTURE.md` → Cloud backup.
- [x] Supabase tables for trips, claimed rewards and the profile (name + ticket), row-level security (each user only sees their own rows)
- [x] Save locally first, then upload in the background; works offline and catches up later (outbox survives restarts)
- [x] Restore on login / new phone; deletions propagate (soft delete via `deleted_at`)
- [x] Anonymous trips are kept when creating an account (same user ID via upgrade, nothing to move)
- [x] Anonymous user logs in to an *existing* account: ask "Add the N trips from this phone to your account?" → Yes merges them (UUIDs prevent duplicates), No keeps only the account's data (decided Oct 20, 2026)
- [x] Small sync status indicator (red cloud on the main screen, only shown when something fails; tap for details + retry)
- [x] Study export: views `study.trips`, `study.rewards`, `study.tickets` without station names or free text (dashboard only, not exposed to the app's API; merged anonymous users left out to avoid double counting)
- [x] Red "−XP" toast when deleting a trip (or an edit lowers its XP)
- [x] Device test: offline + catch-up, soft delete, logout + restore, merge Yes and No
- [x] Tests: sync logic + store sync/merge against an in-memory Supabase fake (13 suites, 106 tests)

Notes for later:
- Name is also stored once in the auth user metadata at account creation (not kept in sync; the app only uses `profiles.name`).
- "No" on the merge question leaves the phone's anonymous trips in the cloud under an anonymous user nobody can reach; in the study views that user counts as a separate person.

## M5 — Polish + insights
Session plan with order, approach and open questions: [`docs/M5_PLAN.md`](docs/M5_PLAN.md).
General
- [ ] Translation setup (German + English, follows the phone language); all UI texts in translation files
- [ ] Edge-to-edge: content under the status bar, buttons behind Android's navigation bar (central fix with safe-area insets)
- [ ] One term for the trip amount ("Ticket value") and one money format everywhere
- [ ] Split oversized screens (quests, profile, stats, TripDetailModal)
- [ ] App icon, splash screen, compressed images
- [ ] Onboarding rework (#44): ticket + start date (or hypothetical ticket), usual trip + real price, reminders yes/no, study code
- [ ] Onboarding asks for the most common trip and its real price (seeds the remembered route price; real prices for the study)
- [ ] Optional: request ÖBB's partner deep-link parameters so "Check price" opens the shop with the route pre-filled
- [ ] Undo for deletes; offline/error states (#51)
- [ ] Trip list search and filter (#46): search box, filter by transport type and date range
- [ ] Accessibility basics
- [ ] Password reset for accounts (needs an email link back into the app)

Insights (second research goal: motivation through insight)
- [ ] Citable source for the CO₂ factor (0.16 kg/km in `app/stats.tsx`, currently an estimate: car 0.21 − public transport 0.05), e.g. Umweltbundesamt Austria; needed before "Saved vs. driving" shows it
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

## M5b — Gamification (alongside M5)
- [ ] Weekly goal ladder (replaces daily streak; see decisions)
- [ ] Quests fitted to the user (only modes they use; targets relative to own average)
- [ ] Daily ticket value ("ticket costs €3.84/day; today you used €10.50")
- [ ] Break-even journey map (route across Austria, stops at 25/50/75/100%)
- [ ] Seasonal challenges (timed for the study window)
- [ ] Reflection line after logging ("your best week so far")
- [ ] Surprise bonuses (new station or mode, sparingly)
- [ ] Community total (needs M4)
- [ ] Automatic reward revocation on delete/edit (the "−XP" toast for deleted trips exists; claimed rewards are not revoked yet)

## M6 — Study-ready
- [ ] Privacy notice (everyone) + study code and consent (participants), leave-study option
- [ ] "Own ticket" vs "comparing" flag; hypothetical ticket wording
- [ ] Weekly study-data export script; keep the free Supabase project active
- [ ] Switch for the game features (optional tracking-only baseline phase)
- [ ] Decide on email confirmation for accounts (currently off)
- [ ] Regenerate stations/fares with 2027 ÖBB data (mid-December)
- [ ] Internal builds: Android APK; TestFlight (Apple account by mid-December)
- [ ] Final test round on Android and iPhone before handing out builds (PP5): sign-in, trip entry, backup + restore, rewards
- [ ] Pre/post questionnaires ready; analysis script for the exported data

## Out of scope for the thesis
Trip generator (#52), push notifications, shareable cards, App Store release, real-time sync between devices.
