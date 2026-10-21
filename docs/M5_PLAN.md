# M5 + M5b plan (written 21 Oct 2026, end of S21)

Plan for the next sessions. `ROADMAP.md` stays the checklist; this file explains the order, the approach and the open questions.
Planned dates: M5 23 Nov – 18 Dec, but we are about four weeks ahead. **The pilot starts 30 Nov**, so everything marked *pilot* must be in a build by about 27 Nov.

## Principles
- **Refactor before features:** split the oversized screens first. M5b adds to quests, profile and stats, which are already 700–1,000 lines.
- **Texts are born translated:** set up German + English before building new screens, so no text has to be moved twice.
- **One native build:** collect all native dependencies (`expo-localization`, `expo-notifications`) into one EAS dev build at the start. Later sessions are then JS-only (Metro reload, no rebuild).
- **Everything game-related can be switched off:** M6 needs a "tracking only" mode for the baseline. Every M5b feature reads one flag (`gameEnabled` in the store), so the switch is a single setting later.
- **Study data goes through the backup:** every new thing the study measures (weekly goal, pauses, reminders on/off, revoked rewards) is stored like trips: outbox → Supabase → `study.*` view. One migration per session that adds data.
- **Pure logic stays testable:** goal ladder, revocation, forecasts, fitted quests and journey progress go in `utils/` with unit tests; the store only wires them up.

## Sessions

### S22 — Foundations (pilot)
1. **Native bundle + build:** add `expo-localization` and `expo-notifications`; set Android edge-to-edge in `app.config.ts`; one EAS development build, installed on the Xiaomi. Check with the user first that the EAS login works (`npx eas-cli whoami`).
2. **Translation setup:** a small typed dictionary (`i18n/en.ts`, `i18n/de.ts`, `t("key")`, language from `expo-localization`, fallback English). No large library: a few hundred strings, no plurals beyond simple cases (helper `plural(n, one, other)`). Move all UI texts screen by screen; a unit test checks both languages have the same keys.
3. **Edge-to-edge:** one central fix with safe-area insets (screen wrapper or the existing layouts), so content sits under the status bar and buttons stay above Android's navigation bar.
4. **One term + one money format:** "Ticket value" everywhere; `formatEuro()` in `utils/format.ts` (German: `€ 12,10` style per locale), replacing every hand-built `€${x.toFixed(2)}`.
- Done when: the app runs in German on a German phone and in English otherwise; no hardcoded UI strings left (grep check); screens are edge-to-edge on the Xiaomi.

### S23 — Split screens + quick wins (pilot)
1. **Split oversized screens** (behaviour unchanged, tests green): `app/quests.tsx` (1,038 lines) → quest list, achievement list, cards in `components/quests/`; `app/profile.tsx` (1,005) → ticket section, account section, data section; `app/stats.tsx` (687) → chart and card components; `TripDetailModal.tsx` (793) → view / edit parts.
2. **Walkthrough findings** from `ROADMAP.md`: smaller gap above Recent Trips, new-user hint on the level card, Financial Overview shows each number once, "1 ready" badge on the level card, two-line route title + trip icon in the trip detail, add button + undo after swipe-delete in the trip list, tap a top route to log it again, fixed quest card layout, extra bottom padding removed.
3. **Undo for deletes + offline/error states (#51):** an undo snackbar for trip deletes (the store keeps the deleted trip for a few seconds before queueing the delete); clear messages where the app needs the network (login, register).
4. **Trip list search and filter (#46):** search box, filter by transport type and date range.
- Done when: no screen file over ~400 lines, all walkthrough items ticked, device check.

### S24 — Onboarding, reminders, password reset (pilot)
1. **Onboarding rework (#44):** ticket + start date, or a hypothetical ticket ("comparing only", flag stored for the study); usual trip + its real price (seeds the remembered route price); "Do you want reminders?"; a placeholder step for the study code (filled in M6). Keep "Skip".
2. **Reminders:** local notifications via `expo-notifications`; on/off and every change logged with a timestamp (study variable). Content and timing: see open question 2.
3. **Password reset:** "Forgot password?" sends Supabase's reset email; the link opens the app (`klimachallenge://reset-password`) and asks for a new password. The redirect URL must be added in the Supabase dashboard (user action).
4. **Migration 2:** profile gets `owns_ticket` (own vs comparing); new table `setting_changes` (user, key, value, changed_at) for reminders on/off; both in `study.*` views.
- Done when: a new install goes through onboarding in about a minute, reminders arrive on the phone, password reset works end to end.

### S25 — Weekly goal ladder + reward revocation (pilot, core of M5b)
1. **Weekly goal ladder** (decided 21 Oct): active days per week (day with ≥ 1 trip); start at 1 or the onboarding estimate; after each met week, +1 is suggested (user accepts or keeps it); cap 5 by default (user can raise it); one pause per month; streak = consecutive weeks with the goal met. Pure logic in `utils/weeklyGoal.ts` with tests (week boundaries in local time, pauses, changing the goal mid-week, the week the app was installed).
2. **Replace the daily streak** in the level card and the streak milestones (migration of existing streak claims: keep their XP, stop new daily ones).
3. **Automatic reward revocation** (decided 21 Oct): when a deleted or edited trip means a claimed quest is no longer met, checked against the claim's own day or week, the claim is revoked (soft delete + reason) and the user sees "−35 XP: Double up no longer met". This needs every quest to be checkable for a past day or week: refactor the quest progress functions to take a date range. Tests for each quest type.
4. **Migration 3:** table `weekly_goals` (user, week_start, goal, met, paused, accepted_raise); `reward_claims.revoked_reason`; study views.
- Done when: goal ladder visible and correct over a few weeks of test data (unit tests plus seeded trips on the phone), revocation shown on delete.

### S26 — Insights + fitted quests (pilot if possible)
1. **CO₂ factor with a source** (needed first): replace 0.16 kg/km with a cited value (e.g. Umweltbundesamt Austria, car vs rail/bus per passenger-km), source named in the app's info text and in the thesis.
2. **"Saved vs. driving"** as the headline number (money: ticket value used vs ticket cost; CO₂ with the cited factor).
3. **Weekly recap:** this week vs last week (trips, km, ticket value, goal met?).
4. **Break-even forecast:** "pays off around [date]" from the average value per week in the current period; hidden when there's too little data.
5. **Daily ticket value:** "Your ticket costs €3.84 a day; today you used €10.50."
6. **Reflection line after logging:** one short sentence ("your best week so far", "3rd trip this week"); a few rules in a pure function, tested.
7. **Daily totals in trip list headers.**
8. **Fitted quests:** quests only for transport modes the user has used (last 4 weeks); targets relative to the user's own average (see open question 6).

### S27 — Journey map, seasonal, surprises, community total, polish, pilot build
1. **Break-even journey map:** a route across Austria with stops at 25 / 50 / 75 / 100 % of break-even (see open question 3); SVG with `react-native-svg`.
2. **Seasonal challenges:** time-limited challenges for the study window (open question 4).
3. **Surprise bonuses:** small XP for a new station or a new transport mode, sparingly (at most one a week).
4. **Community total:** an anonymous total across all users (e.g. km this week). A Postgres function (`security definer`, returns only the sum) called via RPC, cached for the day; never any per-user data.
5. **App icon, splash screen, compressed images; accessibility basics** (labels on icon buttons, touch targets ≥ 44 px, contrast check).
6. **Pilot build:** Android APK via EAS (preview profile), install test on a second phone.

## Open questions (answer at the start of S22, or earlier)
1. **Translations:** agree on the small built-in dictionary instead of a library (i18next)? Who checks the German texts?
2. **Reminders:** what and when? Proposal: one evening reminder (19:00) only on days without a trip, plus Sunday "1 active day left for your weekly goal" when relevant. Off by default unless the user says yes in onboarding.
3. **Journey map route:** one fixed route (e.g. Bregenz → Vienna along the Westbahn) or one per region (Carinthia: Villach → Klagenfurt → Graz → Vienna)?
4. **Seasonal challenges:** themes and rules for Jan–Feb 2027 (e.g. "Winter weeks": 3 weeks in a row with the goal met)?
5. **Surprise bonuses:** which events, and how much XP?
6. **Fitted quests:** targets = own weekly average × 1.2, rounded up, minimum 1? Which quests stay fixed (e.g. first-time quests)?
7. **Community total:** which number(s) to show: total km, trips or CO₂ saved; this week or since the study start?
8. **Hypothetical ticket:** which tickets can non-holders pick (all KlimaTickets, or just Ö + their region)?
9. **App icon / splash:** design by you, or should I make a simple one?
10. **ÖBB partner deep link (optional):** do you want to email ÖBB to ask for the shop's deep-link parameters?

## User actions along the way
- EAS login / build quota check (S22).
- Supabase dashboard: run migrations 2 and 3 (S24, S25); add the password-reset redirect URL (S24).
- Pick or approve the app icon (S27).
- Recruit the 5–8 pilot participants (before 30 Nov).

## Risks
- **Scope vs pilot date:** S22–S25 are the pilot minimum. If time runs short, S26/S27 items can ship in a build during the pilot (the pilot then also tests updates).
- **Revocation complexity:** quests were written for "today/this week"; making them checkable for any past range touches every quest. Budget a full session.
- **Translations size:** a few hundred strings (texts, alerts, quest and achievement names); moving them is mechanical but long. Split S22 if needed: native build + edge-to-edge + format first, translations second.
