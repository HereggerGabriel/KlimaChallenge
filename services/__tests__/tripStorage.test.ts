import { generateTripId, sortTripsNewestFirst } from "@/services/tripStorage";
import { Trip } from "@/types/trip";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateTripId", () => {
  it("works without a global crypto (as on Hermes)", () => {
    const original = globalThis.crypto;
    // Simulate React Native's Hermes engine, which has no `crypto` global.
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 1000 }, generateTripId));
      expect(ids.size).toBe(1000);
      for (const id of ids) expect(id).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });

  it("uses crypto.randomUUID when available", () => {
    expect(generateTripId()).toMatch(UUID_V4);
  });
});

describe("sortTripsNewestFirst", () => {
  const trip = (id: string, date: string): Trip => ({
    id,
    date: new Date(date),
    origin: "A",
    destination: "B",
    transportType: "Train",
    cost: 1,
    distance: 1,
    description: "",
  });

  it("sorts newest first without mutating the input", () => {
    const input = [trip("old", "2026-10-01"), trip("new", "2026-10-20"), trip("mid", "2026-10-10")];
    const sorted = sortTripsNewestFirst(input);
    expect(sorted.map((t) => t.id)).toEqual(["new", "mid", "old"]);
    expect(input.map((t) => t.id)).toEqual(["old", "new", "mid"]);
  });
});
