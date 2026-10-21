// Cloud backup through the store, against an in-memory Supabase (testing/fakeSupabase.ts).

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppDataProvider, useAppData } from "@/store/AppData";
import { STORAGE_KEY } from "@/services/tripStorage";
import { Trip } from "@/types/trip";
import type { FakeSupabase } from "@/testing/fakeSupabase";
import { claimToRow, profileToRow, tripToRow } from "@/utils/syncLogic";
import { DEFAULT_TICKET } from "@/utils/ticketPeriod";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/lib/supabase", () => {
  const fake = require("@/testing/fakeSupabase").createFakeSupabase();
  return { supabase: fake.client, fake };
});
const { fake } = jest.requireMock("@/lib/supabase") as { fake: FakeSupabase };

const ACCOUNT = { id: "account-1", is_anonymous: false, email: "a@example.com" };
const T0 = "2026-10-01T08:00:00.000Z";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

async function renderStore() {
  const hook = renderHook(() => useAppData(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
  await act(() => hook.result.current.syncNow());
  return hook;
}

const tripData = (overrides: Partial<Omit<Trip, "id">> = {}): Omit<Trip, "id"> => ({
  date: new Date("2026-10-20T07:30:00.000Z"),
  origin: "Villach Hbf",
  destination: "Klagenfurt Hbf",
  transportType: "Train",
  cost: 8.6,
  distance: 37.9,
  description: "",
  ...overrides,
});

/** A trip that already exists in the account (uploaded from another phone). */
function seedAccountTrip(id: string, overrides: Partial<Trip> = {}) {
  fake.remoteWrite("trips", {
    ...tripToRow({ ...tripData(), id, ...overrides }, T0),
    user_id: ACCOUNT.id,
  });
}

const liveRows = (table: string, userId: string) =>
  fake.rows(table, userId).filter((r) => !r.deleted_at);

beforeEach(async () => {
  fake.reset();
  await AsyncStorage.clear();
});

describe("cloud backup", () => {
  it("uploads trips that were on the phone before the backup existed", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...tripData(), id: "old-1", date: new Date().toISOString() }]),
    );
    const { result } = await renderStore();
    expect(liveRows("trips", "anon-1").map((r) => r.id)).toEqual(["old-1"]);
    expect(fake.rows("profiles", "anon-1")).toHaveLength(1);
    expect(result.current.syncStatus).toEqual({ failed: false, pending: 0 });
  });

  it("uploads added, edited and deleted trips and claims", async () => {
    const { result } = await renderStore();
    await act(() => result.current.addTrip(tripData()));
    await act(() => result.current.claimReward("achievement:x", "achievement", 10));
    await act(() => result.current.syncNow());
    const id = result.current.trips[0].id;
    expect(liveRows("trips", "anon-1").map((r) => r.id)).toEqual([id]);
    expect(liveRows("reward_claims", "anon-1").map((r) => r.key)).toEqual(["achievement:x"]);

    await act(() => result.current.updateTrip(id, { cost: 12 }));
    await act(() => result.current.syncNow());
    expect(fake.rows("trips", "anon-1")[0].cost).toBe(12);

    await act(() => result.current.deleteTrip(id));
    await act(() => result.current.syncNow());
    // Soft delete: the row stays, marked deleted, so other phones learn about it.
    expect(fake.rows("trips", "anon-1")[0].deleted_at).toBeTruthy();
  });

  it("deleting all trips marks every trip and claim as deleted", async () => {
    const { result } = await renderStore();
    await act(() => result.current.addTrip(tripData()));
    await act(() => result.current.claimReward("achievement:x", "achievement", 10));
    await act(() => result.current.syncNow());
    await act(() => result.current.deleteAllTrips());
    await act(() => result.current.syncNow());
    expect(liveRows("trips", "anon-1")).toEqual([]);
    expect(liveRows("reward_claims", "anon-1")).toEqual([]);
  });

  it("works offline, reports the failure and catches up later", async () => {
    const { result } = await renderStore();
    fake.setOffline(true);
    await act(() => result.current.addTrip(tripData()));
    await act(() => result.current.syncNow());
    expect(result.current.trips).toHaveLength(1); // saved locally all the same
    expect(result.current.syncStatus).toEqual({ failed: true, pending: 1 });

    fake.setOffline(false);
    await act(() => result.current.syncNow());
    expect(result.current.syncStatus).toEqual({ failed: false, pending: 0 });
    expect(liveRows("trips", "anon-1")).toHaveLength(1);
  });

  it("keeps the outbox across app restarts", async () => {
    const first = await renderStore();
    fake.setOffline(true);
    await act(() => first.result.current.addTrip(tripData()));
    first.unmount();

    fake.setOffline(false);
    await renderStore();
    expect(liveRows("trips", "anon-1")).toHaveLength(1);
  });

  it("picks up trips added and deleted on another phone", async () => {
    fake.signIn(ACCOUNT);
    seedAccountTrip("t-1");
    seedAccountTrip("t-2");
    const { result } = await renderStore();
    expect(result.current.trips.map((t) => t.id).sort()).toEqual(["t-1", "t-2"]);

    fake.remoteWrite("trips", {
      ...tripToRow(
        { ...tripData(), id: "t-1" },
        new Date().toISOString(),
        new Date().toISOString(),
      ),
      user_id: ACCOUNT.id,
    });
    await act(() => result.current.syncNow());
    expect(result.current.trips.map((t) => t.id)).toEqual(["t-2"]);
  });

  it("restores trips, rewards and the ticket when logging in on a new phone", async () => {
    seedAccountTrip("t-1");
    fake.remoteWrite("reward_claims", {
      ...claimToRow({ key: "achievement:x", kind: "achievement", xp: 25, claimedAt: T0 }, T0),
      user_id: ACCOUNT.id,
    });
    fake.remoteWrite("profiles", {
      ...profileToRow(
        { name: "Gabriel", ticket: { ...DEFAULT_TICKET, startDate: "2026-03-01" } },
        T0,
      ),
      user_id: ACCOUNT.id,
    });
    const { result } = await renderStore(); // fresh install: anonymous, empty

    await act(async () => fake.signIn(ACCOUNT));
    await act(() => result.current.syncNow());
    expect(result.current.pendingMerge).toBeNull(); // nothing on the phone to ask about
    expect(result.current.trips.map((t) => t.id)).toEqual(["t-1"]);
    expect(result.current.claims.map((c) => c.key)).toEqual(["achievement:x"]);
    // The account's profile wins over the new phone's default one.
    expect(result.current.profile.ticket.startDate).toBe("2026-03-01");
    expect(result.current.profile.name).toBe("Gabriel");
  });

  describe("logging in to an existing account with trips on the phone", () => {
    async function phoneWithTrip() {
      seedAccountTrip("account-trip");
      const hook = await renderStore();
      await act(() => hook.result.current.addTrip(tripData({ cost: 3 })));
      await act(() => hook.result.current.syncNow());
      await act(async () => fake.signIn(ACCOUNT));
      await waitFor(() => expect(hook.result.current.pendingMerge).toEqual({ tripCount: 1 }));
      return hook;
    }

    it("asks first and uploads nothing until answered", async () => {
      await phoneWithTrip();
      expect(fake.rows("trips", ACCOUNT.id).map((r) => r.id)).toEqual(["account-trip"]);
    });

    it("Yes: adds the phone's trips to the account", async () => {
      const { result } = await phoneWithTrip();
      const phoneTripId = result.current.trips[0].id;
      await act(() => result.current.resolveMerge(true));
      expect(result.current.pendingMerge).toBeNull();
      expect(result.current.trips.map((t) => t.id).sort()).toEqual(
        ["account-trip", phoneTripId].sort(),
      );
      expect(liveRows("trips", ACCOUNT.id)).toHaveLength(2);
    });

    it("No: keeps only the account's data", async () => {
      const { result } = await phoneWithTrip();
      await act(() => result.current.resolveMerge(false));
      expect(result.current.trips.map((t) => t.id)).toEqual(["account-trip"]);
      expect(liveRows("trips", ACCOUNT.id)).toHaveLength(1);
    });

    it("asks again after a restart if the question was never answered", async () => {
      const first = await phoneWithTrip();
      first.unmount();
      const second = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(second.result.current.pendingMerge).toEqual({ tripCount: 1 }));
    });
  });

  it("creating an account keeps the trips: same user ID, nothing moves", async () => {
    const { result } = await renderStore();
    await act(() => result.current.addTrip(tripData()));
    await act(() => result.current.syncNow());
    await act(async () => fake.signIn({ id: "anon-1", is_anonymous: false }));
    await act(() => result.current.syncNow());
    expect(result.current.pendingMerge).toBeNull();
    expect(result.current.trips).toHaveLength(1);
    expect(liveRows("trips", "anon-1")).toHaveLength(1);
  });

  it("logging out clears the phone and never uploads the old data for the next user", async () => {
    fake.signIn(ACCOUNT);
    seedAccountTrip("t-1");
    const { result } = await renderStore();
    await act(() => result.current.logOut());
    expect(result.current.trips).toEqual([]);

    await act(() => fake.client.auth.signInAnonymously().then(() => {}));
    await act(() => result.current.syncNow());
    expect(liveRows("trips", "anon-2")).toEqual([]);
    expect(liveRows("trips", ACCOUNT.id)).toHaveLength(1);
  });
});
