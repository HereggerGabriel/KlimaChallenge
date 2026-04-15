---
name: Cloud Sync Implementation Plan (#39)
description: Step-by-step plan for adding Supabase cloud sync to trips — safe, offline-first approach
type: project
---

# Cloud Sync — Implementation Plan (#39)

**Guiding principles:**
1. AsyncStorage stays as primary source of truth — app works fully offline
2. No data loss under any circumstance — when in doubt, keep both copies
3. Never modify the `Trip` type — it touches too many files
4. Each phase ships independently and can be tested before the next begins

---

## Phase 0 — Prerequisites (no sync code yet)

### 0a. Delete `initialTrips` from `tripStorage.ts`
- Still exported but unused since S13 (loadTrips returns `[]` on missing key)
- Risk: if ever passed to a sync function, it uploads fake data to Supabase
- **Action:** Delete the `initialTrips` export and the `generateDate` helper entirely

### 0b. Switch trip ID generation to `crypto.randomUUID()`
- Current new-trip IDs are `Date.now().toString()` — not UUID format
- Supabase upsert works fine with varchar, but UUIDs are safer for a real primary key
- Old existing trip IDs (including "1"–"10" from dummy data) keep their string IDs — no migration needed
- **Action:** Wherever a new trip `id` is generated (QuickAddTripModal), replace with `crypto.randomUUID()`

### 0c. Create Supabase `trips` table + RLS

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

create policy "own trips" on trips
  for all using (auth.uid() = user_id);
```

**Notes:**
- `is_deleted` and `updated_at` live **only in Supabase** — local `Trip` type does not change
- `transport_type` maps to `trip.transportType` (camelCase ↔ snake_case handled in sync layer)
- `date` stored as `timestamptz`; JS `Date` objects serialized to ISO string on push, parsed back on pull

---

## Phase 1 — Sync Service (new file, zero integration)

**File:** `services/syncService.ts`

Three exported functions:

```
push(trips, userId)   → upsert all local trips to Supabase (marks is_deleted for pending deletes)
pull(userId)          → fetch all non-deleted remote trips, return as Trip[]
sync(trips, userId)   → push then pull, return merged Trip[]
```

### Merge strategy (safe / local-wins)
1. Pull remote trips into a map keyed by `id`
2. For each remote trip not in local set → add it (cross-device pickup)
3. For each local trip → upsert to Supabase unconditionally (local content wins on conflict)
4. Result: union of both sets; local version wins if same ID exists on both sides

This is intentionally the simplest correct strategy. It handles single-device use perfectly
and is acceptable for rare two-device scenarios where the same trip isn't edited on both
devices simultaneously.

### Delete propagation (soft delete via `@pending_deletes`)

**Problem:** Hard-deleting locally doesn't inform Supabase. Deleted trip gets pulled back on next sync.

**Solution:** New AsyncStorage key `@pending_deletes` — JSON array of trip IDs.

When a user deletes a trip:
1. Remove from local `trips` state (existing behavior — unchanged)
2. Append the ID to `@pending_deletes`

During `push()`:
- Read `@pending_deletes`
- Call `update trips set is_deleted = true where id = any(...)` for those IDs
- Clear `@pending_deletes` after successful push

During `pull()`:
- Always filter `where is_deleted = false`

**No change to the `Trip` type. No change to existing delete handlers except two extra AsyncStorage lines.**

---

## Phase 2 — Integration Points

### 2a. `saveAndSync` wrapper

Add to `services/syncService.ts`:

```ts
export async function saveAndSync(trips: Trip[], userId: string): Promise<void> {
  await saveTrips(trips);                    // local first — always succeeds
  sync(trips, userId).catch(() => {});       // fire-and-forget — never blocks UI
}
```

Replace `saveTrips(...)` calls with `saveAndSync(...)` in:
- `app/(tabs)/user.tsx` — add/edit/delete handlers
- `app/trips.tsx` — delete and edit handlers

**If sync fails (offline), the catch swallows it. Local data is already saved.**

### 2b. Pull on focus

`useFocusEffect` in `user.tsx` already reloads trips on every screen focus.
Add a pull call at the start of that reload:

```
pull(userId) → merge result into local state → re-save to AsyncStorage
             ↘ on failure: use local data as normal (no-op)
```

### 2c. Getting the user ID

Call `supabase.auth.getUser()` inside `syncService.ts` directly.
The Supabase client already holds the session — no prop-drilling needed.
If it returns an error → skip sync entirely, return without throwing.

---

## Phase 3 — XP Reconciliation

**Problem:** XP is stored separately from trips. If new trips arrive from Supabase (cross-device),
XP will be under-counted.

**Solution:** After a pull that adds remote trips not in the local set, recompute XP:

```ts
const recomputed = mergedTrips.reduce(
  (total, trip) => total + getXPForTrip(trip.distance, trip.transportType),
  0
);
await AsyncStorage.setItem("userXP", recomputed.toString());
```

**Safe guard:** Only recompute if `mergedTrips.length > localTrips.length`.
Otherwise XP behaves exactly as today — no regression.

The XP seeding fallback in `user.tsx:186–192` already does this exact reduce.
Promote it to the primary path when new remote trips arrive.

---

## Phase 4 — Error Handling & UX

### Sync status indicator
- Add a `syncStatus: 'idle' | 'syncing' | 'error'` state to `user.tsx`
- Show a subtle icon in the screen header only when `status === 'error'`
- No modal, no blocking UI — users offline see a "sync pending" dot and continue normally

### Token expiry guard (in `syncService.ts`)
```ts
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) return; // skip sync, don't throw
```

---

## Implementation Order

| Step | File(s) | Risk | Dependency |
|------|---------|------|------------|
| 1 | `services/tripStorage.ts` — delete `initialTrips` | None | — |
| 2 | `components/ui/QuickAddTripModal.tsx` — UUID generation | None | — |
| 3 | Supabase dashboard — create table + RLS | None | — |
| 4 | `services/syncService.ts` — write push/pull/sync in isolation | None | Steps 1–3 |
| 5 | `user.tsx` + `trips.tsx` — add `@pending_deletes` to delete handlers | Low | Step 4 |
| 6 | `user.tsx` + `trips.tsx` — replace `saveTrips` with `saveAndSync` | Low | Step 5 |
| 7 | `user.tsx` — add pull to `useFocusEffect` | Low | Step 6 |
| 8 | `user.tsx` — XP recompute on new remote trips | Low | Step 7 |
| 9 | `user.tsx` — sync status indicator in header | None | Step 6 |

Steps 1–3 are blockers for everything else.
Steps 1 and 2 are independent and can be done in the same session.
Steps 4–9 build sequentially on top of each other.

---

## Open Questions (resolve before starting Step 4)

- [ ] Should `@pending_deletes` be cleared only after a confirmed successful Supabase push,
      or also cleared if the trip no longer exists remotely (already deleted)?
- [ ] If a user has used the app under a dummy/test account, do we want to migrate those
      local trips to their real account on first real login?
- [ ] Do we want real-time Supabase subscriptions (live updates across devices) or
      pull-on-focus is sufficient for now?

**Recommendation:** Pull-on-focus is sufficient for V1. Real-time subscriptions add complexity
(subscription lifecycle, reconnect handling) and can be added later.
