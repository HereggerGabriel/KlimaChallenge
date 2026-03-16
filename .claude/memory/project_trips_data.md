---
name: TravelApp trip data model and persistence
description: How trips are stored, loaded and structured; XP/level system details; delete trip flow
type: project
---

**Trip interface** (`types/trip.ts`):

```ts
interface Trip {
  id: string;
  date: Date;
  origin: string;
  destination: string;
  transportType: string; // 'Bus' | 'Train' | 'Tram' | 'Subway'
  cost: number;
  distance: number;
  description: string;
}
```

**Persistence:** `services/tripStorage.ts` uses AsyncStorage key `@travelapp_trips`.

- `loadTrips()` falls back to `initialTrips` (10 dummy entries) if nothing stored.
- On parse, `distance` and `cost` are coerced with `parseFloat(...) || 0` to prevent NaN from old/corrupt data.
- `saveTrips()` triggered by useEffect in UserScreen on every trips state change.
- `getTripById(id)` — used by the now-unused trip detail screen.

**XP system** (`utils/levelSystem.ts`):

- `getXPForTrip(distance, transportType)` — `distance || 0` guard, base 10 XP + min(distance, 50) XP, × transport bonus (Tram 1.4×, Subway 1.3×, Train 1.2×, Bus 1.1×), rounded
- `addXP(currentXP, amount)` — simple addition
- `calculateLevel(totalXP)` — iterative, uses cumulative `xpThreshold(level)` helper
- `calculateCurrentLevelXP(totalXP, level)` — returns `max(0, totalXP - xpThreshold(level))`
- `calculateXPForNextLevel(level)` — `floor(100 * 1.5^(level-1))`
- XP stored in AsyncStorage key `"userXP"`

**XP init logic (in `user.tsx`):**

- Read `userXP` from AsyncStorage; parse with `parseInt`
- If result is NaN (missing, never set, or corrupt "NaN" string): seed from all loaded trips, store, and set
- This ensures the 10 hardcoded dummy trips grant XP on fresh installs

**Delete trip flow:**

- User taps trip card → `TripDetailModal` opens
- User taps trash icon → in-app confirm overlay shown (styled, dark palette)
- On confirm: `handleDeleteTrip(tripId)` in `user.tsx` runs:
  - Finds trip, calculates its XP via `getXPForTrip`
  - Subtracts from `userXP` (min 0), persists to AsyncStorage
  - Filters trip out of `trips` state (triggers `saveTrips` via useEffect)

**Level thresholds:**

| Level | XP to reach | XP to advance |
|-------|-------------|---------------|
| 1 | 0 | 100 |
| 2 | 100 | 150 |
| 3 | 250 | 225 |
| 4 | 475 | 338 |

**Bug fixed (previous session):** Old formula caused negative XP display at level 1. Fixed by using cumulative `xpThreshold` which returns 0 at level 1.

**Note:** `services/` and `types/` live outside `app/` to prevent Expo Router from treating them as routes.
