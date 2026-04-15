---
name: Trello board reference
description: KlimaChallenge Trello board ID, list structure, and sync script location
type: reference
---

**Board:** KlimaChallenge — https://trello.com/b/PbkrPAvm/klimachallenge
**Board ID:** `69df5cc90cd28a274ecf9993`
**Sync script:** `trello_sync.js` in project root (credentials in `.env`, gitignored)
**Token expiry:** 30 days from 2026-04-15 (renew by ~2026-05-14)

**List structure:**
- Pre-Production — launch checklist items
- Active — items queued for the next session (user-managed)
- Backlog — prioritized upcoming work
- Done (Current) — completed items from active sessions (archive when ~20 cards)
- Done (S11-S16) — archived
- Done (S6-S10) — archived
- Done (S1-S5) — archived

**Labels:** S effort (green), M effort (yellow), L effort (orange), Pre-launch (red), Tech Debt (blue), Bug Fix (purple), UX/Polish (sky)
