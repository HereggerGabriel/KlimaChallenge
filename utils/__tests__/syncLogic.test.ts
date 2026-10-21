import { Trip } from "@/types/trip";
import { DEFAULT_TICKET } from "@/utils/ticketPeriod";
import {
  applyRemote,
  claimToRow,
  decideAccount,
  EMPTY_OUTBOX,
  latestSyncedAt,
  LocalData,
  OLDEST,
  outboxSize,
  profileToRow,
  queueClaims,
  queueEverything,
  queueProfile,
  queueTripDeletes,
  queueTrips,
  removeUploaded,
  rowToClaim,
  rowToProfile,
  rowToTrip,
  tripToRow,
} from "@/utils/syncLogic";

const T1 = "2026-10-21T10:00:00.000Z";
const T2 = "2026-10-21T11:00:00.000Z";
const T3 = "2026-10-21T12:00:00.000Z";

const trip = (id: string, overrides: Partial<Trip> = {}): Trip => ({
  id,
  date: new Date("2026-10-20T07:30:00.000Z"),
  origin: "Villach Hbf",
  destination: "Klagenfurt Hbf",
  transportType: "Train",
  cost: 8.6,
  distance: 37.9,
  description: "",
  ...overrides,
});

const claim = {
  key: "achievement:general_first",
  kind: "achievement" as const,
  xp: 50,
  claimedAt: T1,
};
const profile = { name: "Gabriel", ticket: { ...DEFAULT_TICKET, startDate: "2026-03-01" } };
const local = (overrides: Partial<LocalData> = {}): LocalData => ({
  trips: [],
  claims: [],
  profile,
  ...overrides,
});
const noRemote = { trips: [], claims: [], profile: null };

describe("row conversion", () => {
  it("round-trips trips, claims and the profile", () => {
    const t = trip("a", { description: "via Feldkirchen" });
    expect(rowToTrip(tripToRow(t, T1))).toEqual(t);
    expect(rowToClaim(claimToRow(claim, T1))).toEqual(claim);
    expect(rowToProfile(profileToRow(profile, T1))).toEqual(profile);
  });

  it("accepts numbers as strings and timestamps in another format", () => {
    const row = { ...tripToRow(trip("a"), T1), cost: "8.60" as unknown as number };
    expect(rowToTrip(row).cost).toBe(8.6);
    const c = rowToClaim({ ...claimToRow(claim, T1), claimed_at: "2026-10-21T10:00:00+00:00" });
    expect(c.claimedAt).toBe(T1);
  });

  it("marks deletions with deleted_at", () => {
    expect(tripToRow(trip("a"), T1).deleted_at).toBeNull();
    expect(queueTripDeletes(EMPTY_OUTBOX, [trip("a")], T2).trips.a.deleted_at).toBe(T2);
  });
});

describe("outbox", () => {
  it("keeps one entry per trip, the latest change", () => {
    let o = queueTrips(EMPTY_OUTBOX, [trip("a"), trip("b")], T1);
    o = queueTrips(o, [trip("a", { cost: 5 })], T2);
    expect(outboxSize(o)).toBe(2);
    expect(o.trips.a).toMatchObject({ cost: 5, updated_at: T2 });
  });

  it("removes uploaded entries but keeps ones changed during the upload", () => {
    const uploaded = queueClaims(queueTrips(EMPTY_OUTBOX, [trip("a"), trip("b")], T1), [claim], T1);
    const current = queueTrips(uploaded, [trip("b", { cost: 3 })], T2);
    const left = removeUploaded(current, uploaded);
    expect(Object.keys(left.trips)).toEqual(["b"]);
    expect(left.claims).toEqual({});
  });

  it("queues everything with the profile marked oldest when asked", () => {
    const o = queueEverything(local({ trips: [trip("a")], claims: [claim] }), T1, OLDEST);
    expect(outboxSize(o)).toBe(3);
    expect(o.profile?.updated_at).toBe(OLDEST);
  });
});

describe("applyRemote", () => {
  it("adds new remote trips (restore on a new phone)", () => {
    const remote = { ...noRemote, trips: [tripToRow(trip("a"), T1)] };
    const r = applyRemote(local(), EMPTY_OUTBOX, remote);
    expect(r.changed).toBe(true);
    expect(r.data.trips).toEqual([trip("a")]);
  });

  it("removes trips deleted on another phone", () => {
    const remote = { ...noRemote, trips: [tripToRow(trip("a"), T2, T2)] };
    const r = applyRemote(local({ trips: [trip("a"), trip("b")] }), EMPTY_OUTBOX, remote);
    expect(r.data.trips.map((t) => t.id)).toEqual(["b"]);
  });

  it("keeps a newer local change that is still waiting to upload", () => {
    const outbox = queueTrips(EMPTY_OUTBOX, [trip("a", { cost: 5 })], T3);
    const remote = { ...noRemote, trips: [tripToRow(trip("a", { cost: 9 }), T2)] };
    const r = applyRemote(local({ trips: [trip("a", { cost: 5 })] }), outbox, remote);
    expect(r.changed).toBe(false);
    expect(r.outbox.trips.a).toBeDefined();
  });

  it("lets a newer remote change win over an older pending one", () => {
    const outbox = queueTrips(EMPTY_OUTBOX, [trip("a", { cost: 5 })], T1);
    const remote = { ...noRemote, trips: [tripToRow(trip("a", { cost: 9 }), T2)] };
    const r = applyRemote(local({ trips: [trip("a", { cost: 5 })] }), outbox, remote);
    expect(r.data.trips[0].cost).toBe(9);
    expect(r.outbox.trips.a).toBeUndefined();
  });

  it("reports no change when the rows match what's on the phone", () => {
    const remote = {
      trips: [tripToRow(trip("a"), T1)],
      claims: [claimToRow(claim, T1)],
      profile: profileToRow(profile, T1),
    };
    const r = applyRemote(local({ trips: [trip("a")], claims: [claim] }), EMPTY_OUTBOX, remote);
    expect(r.changed).toBe(false);
  });

  it("takes the account's profile over one queued as oldest", () => {
    const outbox = queueProfile(EMPTY_OUTBOX, profile, OLDEST);
    const remoteProfile = { ...profile, name: "Account" };
    const r = applyRemote(local(), outbox, {
      ...noRemote,
      profile: profileToRow(remoteProfile, T1),
    });
    expect(r.data.profile.name).toBe("Account");
    expect(r.outbox.profile).toBeNull();
  });

  it("applies claims and revoked claims", () => {
    const other = { ...claim, key: "streak:7", kind: "streak" as const };
    const remote = { ...noRemote, claims: [claimToRow(claim, T2, T2), claimToRow(other, T2)] };
    const r = applyRemote(local({ claims: [claim] }), EMPTY_OUTBOX, remote);
    expect(r.data.claims).toEqual([other]);
  });
});

describe("latestSyncedAt", () => {
  it("moves the cursor to the newest server time", () => {
    const remote = {
      trips: [{ ...tripToRow(trip("a"), T1), synced_at: T2 }],
      claims: [{ ...claimToRow(claim, T1), synced_at: T3 }],
      profile: null,
    };
    expect(latestSyncedAt(T1, remote)).toBe(T3);
    expect(latestSyncedAt(T1, noRemote)).toBe(T1);
    expect(latestSyncedAt(null, noRemote)).toBeNull();
  });
});

describe("decideAccount", () => {
  const anon = { id: "anon", isAnonymous: true };
  const account = { id: "acc", isAnonymous: false };

  it("syncs as usual for the same user", () => {
    expect(decideAccount("acc", account, 3)).toBe("same");
  });

  it("adopts the data on the first sync and for a fresh anonymous session", () => {
    expect(decideAccount(null, anon, 3)).toBe("adopt");
    expect(decideAccount(null, account, 3)).toBe("adopt");
    expect(decideAccount("old-anon", anon, 3)).toBe("adopt");
  });

  it("asks when logging in to an existing account with trips on the phone", () => {
    expect(decideAccount("anon", account, 3)).toBe("ask");
    expect(decideAccount("anon", account, 0)).toBe("switch");
  });
});
