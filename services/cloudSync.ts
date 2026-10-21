// Network side of the cloud backup: upload the outbox, download changed rows.
// The tables and their rules are in supabase/migrations/*_cloud_backup.sql;
// what to upload and how to merge is decided in utils/syncLogic.ts.

import { supabase } from "@/lib/supabase";
import { ClaimRow, Outbox, ProfileRow, RemoteChanges, TripRow } from "@/utils/syncLogic";

export interface SyncUser {
  id: string;
  isAnonymous: boolean;
}

/** The signed-in user from the stored session (no network), or null. */
export async function currentSyncUser(): Promise<SyncUser | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, isAnonymous: user.is_anonymous === true } : null;
}

/** Calls `onChange` whenever a different user (or nobody) is signed in. */
export function onSyncUserChange(onChange: (user: SyncUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    onChange(user ? { id: user.id, isAnonymous: user.is_anonymous === true } : null);
  });
  return () => data.subscription.unsubscribe();
}

/** One message for every kind of failure; the details only go to the log. */
export class SyncError extends Error {}

function check(error: { message: string } | null, what: string): void {
  if (error) {
    console.warn(`Cloud backup: ${what} failed:`, error.message);
    throw new SyncError(error.message);
  }
}

const BATCH = 500;

async function upsertRows(
  table: string,
  rows: object[],
  userId: string,
  onConflict: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({ ...r, user_id: userId }));
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    check(error, `upload to ${table}`);
  }
}

/** Uploads everything in the outbox. Throws SyncError if any part fails. */
export async function uploadOutbox(userId: string, outbox: Outbox): Promise<void> {
  await upsertRows("trips", Object.values(outbox.trips), userId, "user_id,id");
  await upsertRows("reward_claims", Object.values(outbox.claims), userId, "user_id,key");
  if (outbox.profile) await upsertRows("profiles", [outbox.profile], userId, "user_id");
}

const PAGE = 1000; // PostgREST's default row limit

async function downloadTable<R>(table: string, userId: string, since: string | null): Promise<R[]> {
  const rows: R[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select("*").eq("user_id", userId);
    if (since) query = query.gt("synced_at", since);
    const { data, error } = await query.order("synced_at").range(from, from + PAGE - 1);
    check(error, `download from ${table}`);
    rows.push(...((data ?? []) as R[]));
    if (!data || data.length < PAGE) return rows;
  }
}

/**
 * Rows changed since `cursor` (all rows when null). Starts a minute earlier than
 * the cursor: writes that committed slightly out of order are not missed, and
 * applying a row twice changes nothing.
 */
export async function downloadChanges(
  userId: string,
  cursor: string | null,
): Promise<RemoteChanges> {
  const since = cursor ? new Date(Date.parse(cursor) - 60_000).toISOString() : null;
  const [trips, claims, profiles] = await Promise.all([
    downloadTable<TripRow>("trips", userId, since),
    downloadTable<ClaimRow>("reward_claims", userId, since),
    downloadTable<ProfileRow>("profiles", userId, since),
  ]);
  return { trips, claims, profile: profiles[0] ?? null };
}
