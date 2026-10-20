import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  estimateTrainFare,
  rememberRoutePrice,
  routeKey,
  suggestFare,
} from "@/services/fareEstimate";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

beforeEach(() => AsyncStorage.clear());

describe("estimateTrainFare", () => {
  it("grows with distance and stays in a plausible range", () => {
    const short = estimateTrainFare(10);
    const mid = estimateTrainFare(40);
    const long = estimateTrainFare(300);
    expect(short).toBeGreaterThan(1);
    expect(mid).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(mid);
    expect(long).toBeLessThan(150);
  });

  it("rounds to 10 cents and returns 0 for no distance", () => {
    expect(Math.round(estimateTrainFare(37.9) * 10) / 10).toBe(estimateTrainFare(37.9));
    expect(estimateTrainFare(0)).toBe(0);
  });
});

describe("routeKey", () => {
  it("is the same in both directions and ignores spelling variants", () => {
    expect(routeKey("Villach Hbf", "Klagenfurt Hbf", "Train")).toBe(
      routeKey("Klagenfurt Hauptbahnhof", "villach hauptbahnhof", "Train"),
    );
  });

  it("differs by transport type", () => {
    expect(routeKey("A", "B", "Bus")).not.toBe(routeKey("A", "B", "Train"));
  });
});

describe("suggestFare", () => {
  it("uses the ÖBB model for trains with a known distance", async () => {
    const s = await suggestFare("Villach Hbf", "Klagenfurt Hbf", "Train", 37.9);
    expect(s?.source).toBe("oebb");
    expect(s?.price).toBe(estimateTrainFare(37.9));
  });

  it("returns null for trains without distance", async () => {
    expect(await suggestFare("Somewhere", "Elsewhere", "Train", null)).toBeNull();
  });

  it("uses a local fare for city transport", async () => {
    expect(await suggestFare("Stephansplatz", "Karlsplatz", "Subway", null)).toEqual({
      price: 3.2,
      source: "local",
    });
  });

  it("prefers a remembered price, in both directions, and still provides the estimate", async () => {
    await rememberRoutePrice("Villach Hbf", "Klagenfurt Hbf", "Train", 10.5);
    expect(await suggestFare("Klagenfurt Hbf", "Villach Hbf", "Train", 37.9)).toEqual({
      price: 10.5,
      source: "remembered",
      estimate: { price: estimateTrainFare(37.9), source: "oebb" },
    });
  });

  it("returns null without a transport type", async () => {
    expect(await suggestFare("A", "B", "", 10)).toBeNull();
  });
});
