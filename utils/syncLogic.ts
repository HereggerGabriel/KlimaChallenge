// Pure logic of the cloud backup: converting between app data and database
// rows, the outbox of changes still to upload, and applying downloaded rows.
// No network or storage here; services/cloudSync.ts and store/AppData.tsx do that.
//
// Model: the phone is the source of truth for the UI. Every local change puts
// a row into the outbox (keyed by trip ID / reward key), the background sync
// upserts the outbox and then pulls rows other phones changed. A conflict on the
// same row is decided by updated_at (the later edit wins), on the server by a
// trigger and here in applyRemote.

import { Trip } from "@/types/trip";
import { RewardClaim, RewardKind } from "@/utils/rewards";
import { TicketProfile } from "@/utils/ticketPeriod";

// ── Rows (as in supabase/migrations/*_cloud_backup.sql) ─────────────────────

export interface TripRow {
  id: string;
  date: string;
  origin: string;
  destination: string;
  transport_type: string;
  cost: number;
  distance: number;
  description: string;
  updated_at: string;
  deleted_at: string | null;
  /** Set by the server; absent in rows the phone uploads. */
  synced_at?: string;
}

export interface ClaimRow {
  key: string;
  kind: RewardKind;
  xp: number;
  claimed_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at?: string;
}

export interface ProfileRow {
  name: string;
  ticket_label: string;
  ticket_cost: number;
  ticket_period: TicketProfile["period"];
  ticket_start_date: string | null;
  updated_at: string;
  synced_at?: string;
}

/** Same shape as the store's Profile. */
export interface SyncedProfile {
  name: string;
  ticket: TicketProfile;
}

export function tripToRow(trip: Trip, updatedAt: string, deletedAt: string | null = null): TripRow {
  return {
    id: trip.id,
    date: new Date(trip.date).toISOString(),
    origin: trip.origin,
    destination: trip.destination,
    transport_type: trip.transportType,
    cost: Number(trip.cost) || 0,
    distance: Number(trip.distance) || 0,
    description: trip.description ?? "",
    updated_at: updatedAt,
    deleted_at: deletedAt,
  };
}

export function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    date: new Date(row.date),
    origin: row.origin,
    destination: row.destination,
    transportType: row.transport_type,
    // numeric columns can arrive as strings depending on the client
    cost: Number(row.cost) || 0,
    distance: Number(row.distance) || 0,
    description: row.description ?? "",
  };
}

export function claimToRow(
  claim: RewardClaim,
  updatedAt: string,
  deletedAt: string | null = null,
): ClaimRow {
  return {
    key: claim.key,
    kind: claim.kind,
    xp: claim.xp,
    claimed_at: claim.claimedAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
  };
}

export function rowToClaim(row: ClaimRow): RewardClaim {
  return {
    key: row.key,
    kind: row.kind,
    xp: Number(row.xp) || 0,
    claimedAt: new Date(row.claimed_at).toISOString(),
  };
}

export function profileToRow(profile: SyncedProfile, updatedAt: string): ProfileRow {
  return {
    name: profile.name,
    ticket_label: profile.ticket.label,
    ticket_cost: Number(profile.ticket.cost) || 0,
    ticket_period: profile.ticket.period,
    ticket_start_date: profile.ticket.startDate,
    updated_at: updatedAt,
  };
}

export function rowToProfile(row: ProfileRow): SyncedProfile {
  return {
    name: row.name ?? "",
    ticket: {
      label: row.ticket_label,
      cost: Number(row.ticket_cost) || 0,
      period: row.ticket_period === "month" ? "month" : "year",
      // a date column comes back as YYYY-MM-DD, the app's own day-key format
      startDate: row.ticket_start_date ? row.ticket_start_date.slice(0, 10) : null,
    },
  };
}

// ── Outbox: changes not uploaded yet ────────────────────────────────────────

export interface Outbox {
  trips: Record<string, TripRow>;
  claims: Record<string, ClaimRow>;
  profile: ProfileRow | null;
}

export const EMPTY_OUTBOX: Outbox = { trips: {}, claims: {}, profile: null };

/**
 * When a profile goes into the outbox with this time, any profile already in
 * the account is newer and wins; the local one is only used if there is none.
 * Used when switching to an existing account.
 */
export const OLDEST = new Date(0).toISOString();

export function queueTrips(outbox: Outbox, trips: Trip[], now: string): Outbox {
  if (trips.length === 0) return outbox;
  const next = { ...outbox.trips };
  for (const t of trips) next[t.id] = tripToRow(t, now);
  return { ...outbox, trips: next };
}

export function queueTripDeletes(outbox: Outbox, trips: Trip[], now: string): Outbox {
  if (trips.length === 0) return outbox;
  const next = { ...outbox.trips };
  for (const t of trips) next[t.id] = tripToRow(t, now, now);
  return { ...outbox, trips: next };
}

export function queueClaims(outbox: Outbox, claims: RewardClaim[], now: string): Outbox {
  if (claims.length === 0) return outbox;
  const next = { ...outbox.claims };
  for (const c of claims) next[c.key] = claimToRow(c, now);
  return { ...outbox, claims: next };
}

export function queueClaimDeletes(outbox: Outbox, claims: RewardClaim[], now: string): Outbox {
  if (claims.length === 0) return outbox;
  const next = { ...outbox.claims };
  for (const c of claims) next[c.key] = claimToRow(c, now, now);
  return { ...outbox, claims: next };
}

export function queueProfile(outbox: Outbox, profile: SyncedProfile, now: string): Outbox {
  return { ...outbox, profile: profileToRow(profile, now) };
}

/** Everything on this phone, e.g. for the first upload or when adding it to an account. */
export function queueEverything(
  data: { trips: Trip[]; claims: RewardClaim[]; profile: SyncedProfile },
  now: string,
  profileTime: string = now,
): Outbox {
  return queueProfile(
    queueClaims(queueTrips(EMPTY_OUTBOX, data.trips, now), data.claims, now),
    data.profile,
    profileTime,
  );
}

export function outboxSize(outbox: Outbox): number {
  return (
    Object.keys(outbox.trips).length + Object.keys(outbox.claims).length + (outbox.profile ? 1 : 0)
  );
}

/**
 * Removes what was uploaded. An entry changed again while the upload ran has a
 * newer updated_at and stays for the next round.
 */
export function removeUploaded(current: Outbox, uploaded: Outbox): Outbox {
  const keep = <R extends { updated_at: string }>(
    cur: Record<string, R>,
    done: Record<string, R>,
  ): Record<string, R> => {
    const next: Record<string, R> = {};
    for (const [k, row] of Object.entries(cur)) {
      if (done[k]?.updated_at !== row.updated_at) next[k] = row;
    }
    return next;
  };
  return {
    trips: keep(current.trips, uploaded.trips),
    claims: keep(current.claims, uploaded.claims),
    profile:
      current.profile && uploaded.profile?.updated_at === current.profile.updated_at
        ? null
        : current.profile,
  };
}

// ── Applying downloaded rows ────────────────────────────────────────────────

export interface LocalData {
  trips: Trip[];
  claims: RewardClaim[];
  profile: SyncedProfile;
}

export interface RemoteChanges {
  trips: TripRow[];
  claims: ClaimRow[];
  profile: ProfileRow | null;
}

/** A local change still waiting in the outbox beats an older remote row. */
const localWins = (pending: { updated_at: string } | null | undefined, remoteUpdatedAt: string) =>
  !!pending && Date.parse(pending.updated_at) >= Date.parse(remoteUpdatedAt);

/**
 * Applies rows from the server to the local data. Remote rows win, except over
 * a newer local change that is still in the outbox; outbox entries that lost
 * are dropped. Trips come back in any order; the caller sorts them.
 */
export function applyRemote(
  local: LocalData,
  outbox: Outbox,
  remote: RemoteChanges,
): { data: LocalData; outbox: Outbox; changed: boolean } {
  let changed = false;
  const trips = new Map(local.trips.map((t) => [t.id, t]));
  const claims = new Map(local.claims.map((c) => [c.key, c]));
  const pendingTrips = { ...outbox.trips };
  const pendingClaims = { ...outbox.claims };
  let pendingProfile = outbox.profile;
  let profile = local.profile;

  for (const row of remote.trips) {
    if (localWins(pendingTrips[row.id], row.updated_at)) continue;
    delete pendingTrips[row.id];
    if (row.deleted_at) {
      if (trips.delete(row.id)) changed = true;
    } else {
      const incoming = rowToTrip(row);
      if (!sameTrip(trips.get(row.id), incoming)) {
        trips.set(row.id, incoming);
        changed = true;
      }
    }
  }

  for (const row of remote.claims) {
    if (localWins(pendingClaims[row.key], row.updated_at)) continue;
    delete pendingClaims[row.key];
    if (row.deleted_at) {
      if (claims.delete(row.key)) changed = true;
    } else {
      const incoming = rowToClaim(row);
      const existing = claims.get(row.key);
      if (
        !existing ||
        existing.xp !== incoming.xp ||
        existing.kind !== incoming.kind ||
        existing.claimedAt !== incoming.claimedAt
      ) {
        claims.set(row.key, incoming);
        changed = true;
      }
    }
  }

  if (remote.profile && !localWins(pendingProfile, remote.profile.updated_at)) {
    pendingProfile = null;
    const incoming = rowToProfile(remote.profile);
    if (JSON.stringify(incoming) !== JSON.stringify(profile)) {
      profile = incoming;
      changed = true;
    }
  }

  return {
    data: { trips: [...trips.values()], claims: [...claims.values()], profile },
    outbox: { trips: pendingTrips, claims: pendingClaims, profile: pendingProfile },
    changed,
  };
}

function sameTrip(a: Trip | undefined, b: Trip): boolean {
  return (
    !!a &&
    new Date(a.date).getTime() === b.date.getTime() &&
    a.origin === b.origin &&
    a.destination === b.destination &&
    a.transportType === b.transportType &&
    Number(a.cost) === b.cost &&
    Number(a.distance) === b.distance &&
    (a.description ?? "") === b.description
  );
}

/** The newest server time in the downloaded rows: where the next pull starts. */
export function latestSyncedAt(cursor: string | null, remote: RemoteChanges): string | null {
  let best = cursor;
  const rows: { synced_at?: string }[] = [
    ...remote.trips,
    ...remote.claims,
    ...(remote.profile ? [remote.profile] : []),
  ];
  for (const r of rows) {
    if (r.synced_at && (!best || Date.parse(r.synced_at) > Date.parse(best))) best = r.synced_at;
  }
  return best;
}

// ── Which user does the data on this phone belong to? ───────────────────────

export type AccountDecision =
  /** Same user as last time: just sync. */
  | "same"
  /** No owner yet (first sync, or after an update from before M4), or a fresh
   *  anonymous session replaced a lost one: keep everything and upload it. */
  | "adopt"
  /** Logged in to an existing account, nothing on this phone worth keeping. */
  | "switch"
  /** Logged in to an existing account with trips on this phone: ask the user. */
  | "ask";

export function decideAccount(
  syncedUserId: string | null,
  user: { id: string; isAnonymous: boolean },
  localTripCount: number,
): AccountDecision {
  if (syncedUserId === user.id) return "same";
  if (syncedUserId === null || user.isAnonymous) return "adopt";
  return localTripCount > 0 ? "ask" : "switch";
}
