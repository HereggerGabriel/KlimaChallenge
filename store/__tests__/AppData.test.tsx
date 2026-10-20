import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppDataProvider, useAppData } from "@/store/AppData";
import { getXPForTrip } from "@/utils/levelSystem";
import { STORAGE_KEY } from "@/services/tripStorage";
import { Trip } from "@/types/trip";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

async function renderStore() {
  const hook = renderHook(() => useAppData(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
  return hook;
}

const tripData = (overrides: Partial<Omit<Trip, "id">> = {}): Omit<Trip, "id"> => ({
  date: new Date(),
  origin: "Villach Hauptbahnhof",
  destination: "Klagenfurt Hauptbahnhof",
  transportType: "Train",
  cost: 10,
  distance: 37.9,
  description: "",
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("AppData store", () => {
  it("starts empty at level 1", async () => {
    const { result } = await renderStore();
    expect(result.current.trips).toEqual([]);
    expect(result.current.xp).toBe(0);
    expect(result.current.level).toBe(1);
  });

  it("derives XP from trips and emits a reward event on add", async () => {
    const { result } = await renderStore();
    await act(() => result.current.addTrip(tripData()));
    const expected = getXPForTrip(37.9, "Train");
    expect(result.current.xp).toBe(expected);
    expect(result.current.rewardEvents[0]).toMatchObject({ xp: expected, levelUp: null });
  });

  it("removes a trip's XP when the trip is deleted", async () => {
    const { result } = await renderStore();
    await act(() => result.current.addTrip(tripData()));
    await act(() => result.current.deleteTrip(result.current.trips[0].id));
    expect(result.current.trips).toHaveLength(0);
    expect(result.current.xp).toBe(0);
  });

  it("recomputes XP when a trip is edited", async () => {
    const { result } = await renderStore();
    await act(() => result.current.addTrip(tripData({ distance: 10 })));
    await act(() => result.current.updateTrip(result.current.trips[0].id, { distance: 40 }));
    expect(result.current.xp).toBe(getXPForTrip(40, "Train"));
  });

  it("claims a reward once and reports a level-up", async () => {
    const { result } = await renderStore();
    await act(() => result.current.claimReward("achievement:test", "achievement", 120));
    await act(() => result.current.claimReward("achievement:test", "achievement", 120));
    expect(result.current.claims).toHaveLength(1);
    expect(result.current.xp).toBe(120);
    expect(result.current.isClaimed("achievement:test")).toBe(true);
    expect(result.current.rewardEvents.at(-1)).toMatchObject({ xp: 120, levelUp: 2 });
  });

  it("merges imported trips and skips known IDs; imported trips count for XP", async () => {
    const { result } = await renderStore();
    await act(() => result.current.addTrip(tripData()));
    const existing = result.current.trips[0];
    let outcome = { added: 0, skipped: 0 };
    await act(async () => {
      outcome = await result.current.mergeTrips([
        existing,
        { ...tripData({ distance: 20 }), id: "imported-1" },
      ]);
    });
    expect(outcome).toEqual({ added: 1, skipped: 1 });
    expect(result.current.xp).toBe(getXPForTrip(37.9, "Train") + getXPForTrip(20, "Train"));
  });

  it("awards streak milestones automatically", async () => {
    const { result } = await renderStore();
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return d;
    };
    await act(() => result.current.addTrip(tripData({ date: day(2) })));
    await act(() => result.current.addTrip(tripData({ date: day(1) })));
    await act(() => result.current.addTrip(tripData({ date: day(0) })));
    expect(result.current.streak).toBe(3);
    expect(result.current.isClaimed("streak:3")).toBe(true);
  });

  it("raises the main quest event when the ticket pays off", async () => {
    const { result } = await renderStore();
    await act(() =>
      result.current.updateProfile({
        ticket: { label: "Test", cost: 25, period: "year", startDate: null },
      }),
    );
    await act(() => result.current.addTrip(tripData({ cost: 10 })));
    expect(result.current.mainQuestEvent).toBeNull();
    await act(() => result.current.addTrip(tripData({ cost: 20 })));
    expect(result.current.mainQuestEvent).toEqual({ valueUsed: 30, cost: 25 });
  });

  it("migrates the old storage layout once", async () => {
    await AsyncStorage.multiSet([
      ["userXP", "999"],
      ["@claimedAchievements", JSON.stringify(["general_first"])],
      ["@claimedQuests", JSON.stringify(["milestone_first_trip"])],
      ["userName", "Gabriel"],
      ["klimaTicketType", "KlimaTicket Kärnten"],
      ["klimaTicketCost", "430"],
      [
        STORAGE_KEY,
        JSON.stringify([{ ...tripData(), id: "old-1", date: new Date().toISOString() }]),
      ],
    ]);
    const { result } = await renderStore();
    expect(result.current.profile.name).toBe("Gabriel");
    expect(result.current.profile.ticket).toMatchObject({
      label: "KlimaTicket Kärnten",
      cost: 430,
    });
    expect(result.current.claims.map((c) => c.key).sort()).toEqual([
      "achievement:general_first",
      "quest:milestone_first_trip",
    ]);
    // XP is recomputed from data, the stored 999 is gone.
    expect(result.current.xp).toBe(getXPForTrip(37.9, "Train") + 25 + 50);
    expect(await AsyncStorage.getItem("userXP")).toBeNull();
  });

  it("deleteAllTrips clears trips and rewards but keeps the profile", async () => {
    const { result } = await renderStore();
    await act(() => result.current.updateProfile({ name: "Gabriel" }));
    await act(() => result.current.addTrip(tripData()));
    await act(() => result.current.claimReward("achievement:x", "achievement", 10));
    await act(() => result.current.deleteAllTrips());
    expect(result.current.trips).toEqual([]);
    expect(result.current.claims).toEqual([]);
    expect(result.current.profile.name).toBe("Gabriel");
  });
});
