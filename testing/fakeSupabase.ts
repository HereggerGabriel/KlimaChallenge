// In-memory stand-in for the Supabase client, for store tests. Implements just
// what the app uses: auth session + events, and upsert / select with eq, gt,
// order, range. Behaves like the migration: rows are per user (row-level
// security), the server sets synced_at, and an older update never overwrites a
// newer row.

type Row = Record<string, unknown> & { user_id: string; updated_at: string; synced_at?: string };
type User = { id: string; is_anonymous: boolean; email?: string };
type Listener = (event: string, session: { user: User } | null) => void;

const PRIMARY_KEYS: Record<string, string[]> = {
  trips: ["user_id", "id"],
  reward_claims: ["user_id", "key"],
  profiles: ["user_id"],
};

const networkError = { message: "TypeError: Network request failed" };

export function createFakeSupabase() {
  const tables: Record<string, Row[]> = { trips: [], reward_claims: [], profiles: [] };
  const listeners = new Set<Listener>();
  let user: User | null = { id: "anon-1", is_anonymous: true };
  let offline = false;
  let clock = Date.parse("2026-10-21T08:00:00Z");
  let anonCount = 1;
  const calls: { table: string; op: "upsert" | "select"; rows?: number }[] = [];

  const session = () => (user ? { user } : null);
  const emit = (event: string) => listeners.forEach((l) => l(event, session()));

  function select(table: string) {
    const filters: ((r: Row) => boolean)[] = [];
    let sortBy: string | null = null;
    let range: [number, number] | null = null;
    const builder = {
      eq(col: string, v: unknown) {
        filters.push((r) => r[col] === v);
        return builder;
      },
      gt(col: string, v: string) {
        filters.push((r) => Date.parse(String(r[col])) > Date.parse(v));
        return builder;
      },
      order(col: string) {
        sortBy = col;
        return builder;
      },
      range(from: number, to: number) {
        range = [from, to];
        return builder;
      },
      then<T>(resolve: (r: { data: Row[] | null; error: typeof networkError | null }) => T) {
        calls.push({ table, op: "select" });
        if (offline) return Promise.resolve(resolve({ data: null, error: networkError }));
        // Row-level security: only the signed-in user's rows.
        let rows = tables[table].filter((r) => user && r.user_id === user.id);
        rows = rows.filter((r) => filters.every((f) => f(r)));
        if (sortBy) {
          const key = sortBy;
          rows = [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
        }
        if (range) rows = rows.slice(range[0], range[1] + 1);
        return Promise.resolve(resolve({ data: rows.map((r) => ({ ...r })), error: null }));
      },
    };
    return builder;
  }

  function upsert(table: string, incoming: Row[]) {
    calls.push({ table, op: "upsert", rows: incoming.length });
    if (offline) return Promise.resolve({ error: networkError });
    if (!user || incoming.some((r) => r.user_id !== user!.id)) {
      return Promise.resolve({ error: { message: "new row violates row-level security policy" } });
    }
    const pk = PRIMARY_KEYS[table];
    for (const row of incoming) {
      const i = tables[table].findIndex((r) => pk.every((k) => r[k] === row[k]));
      const syncedAt = new Date((clock += 1000)).toISOString();
      if (i < 0) tables[table].push({ ...row, synced_at: syncedAt });
      else if (Date.parse(row.updated_at) >= Date.parse(tables[table][i].updated_at))
        tables[table][i] = { ...row, synced_at: syncedAt };
      // else: an older edit, the trigger keeps the newer row
    }
    return Promise.resolve({ error: null });
  }

  const client = {
    auth: {
      getSession: async () => ({ data: { session: session() }, error: null }),
      onAuthStateChange: (cb: Listener) => {
        listeners.add(cb);
        Promise.resolve().then(() => cb("INITIAL_SESSION", session()));
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
      signInAnonymously: async () => {
        user = { id: `anon-${++anonCount}`, is_anonymous: true };
        emit("SIGNED_IN");
        return { data: { session: session() }, error: null };
      },
      signOut: async () => {
        user = null;
        emit("SIGNED_OUT");
        return { error: null };
      },
    },
    from: (table: string) => ({
      select: () => select(table),
      upsert: (rows: Row[]) => upsert(table, rows),
    }),
  };

  return {
    client,
    tables,
    calls,
    /** Rows of one table that belong to `userId`. */
    rows: (table: string, userId: string) => tables[table].filter((r) => r.user_id === userId),
    /** Signs in as a different user, as a login would. */
    signIn(next: User | null) {
      user = next;
      emit(next ? "SIGNED_IN" : "SIGNED_OUT");
    },
    setOffline(value: boolean) {
      offline = value;
    },
    /** A write from another phone, through the same rules as an upload. */
    remoteWrite(table: string, row: Row) {
      const pk = PRIMARY_KEYS[table];
      const syncedAt = new Date((clock += 1000)).toISOString();
      const i = tables[table].findIndex((r) => pk.every((k) => r[k] === row[k]));
      if (i < 0) tables[table].push({ ...row, synced_at: syncedAt });
      else tables[table][i] = { ...row, synced_at: syncedAt };
    },
    reset() {
      for (const t of Object.keys(tables)) tables[t].length = 0;
      calls.length = 0;
      listeners.clear();
      user = { id: "anon-1", is_anonymous: true };
      anonCount = 1;
      offline = false;
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
