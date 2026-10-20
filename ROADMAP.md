# KlimaChallenge — Roadmap

Goal: a polished, well-functioning prototype, then a user study (Jan–Feb 2027), then thesis submission (end of March 2027).
Work happens on the `dev/prototype` branch.

## M1 — Foundation
- [x] Enforce LF line endings (`.gitattributes`)
- [x] Untrack `.claude/settings.local.json` (contained a Trello token), remove junk files and retired Trello/Excel tooling
- [x] Move docs and old PM spreadsheets into `docs/`; replace CLAUDE.md and add this roadmap
- [ ] Align dependencies with Expo SDK 54, remove unused ones, add `expo-dev-client`
- [ ] Remove dead template code and NativeWind
- [ ] Merge `app.json` + `app.config.ts` into one config; consistent KlimaChallenge branding
- [ ] Prettier + ESLint, one-time formatting pass
- [ ] `tsc` at 0 errors
- [ ] EAS development build installed on an Android phone

## M2 — Fix what's broken
- [ ] Replace the dead ÖBB proxy (`oebb.macistry.com`, suspended) with a bundled Austrian station list (GTFS), autocomplete and a distance estimate
- [ ] Replace `IconSymbol` with `MaterialIcons` everywhere (icons blank on Android)
- [ ] Fix trip export/import (`expo-file-system/legacy`) and add error handling
- [ ] Daily/weekly quest keys in local time instead of UTC
- [ ] Keep trips sorted by date after add/edit
- [ ] Clear local data on logout
- [ ] Working "Forgot password"; re-enable email confirmation

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
- [ ] Accessibility basics; German translation (decision pending)

## M5 — Study-ready
- [ ] Consent screen, anonymized one-way data upload
- [ ] Switch for the game features (optional baseline phase)
- [ ] Internal builds (Android APK; TestFlight if the Apple account is set up)

## Out of scope for the thesis
Full cloud sync (plan in `.claude/memory/plan_cloud_sync.md`), trip generator (#52), push notifications, shareable cards, App Store release.
