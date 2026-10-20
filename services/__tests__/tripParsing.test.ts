import { parseTripsPayload } from "@/services/tripParsing";

const valid = {
  id: "t1",
  date: "2026-10-20T07:30:00.000Z",
  origin: " Villach Hauptbahnhof ",
  destination: "Klagenfurt Hauptbahnhof",
  transportType: "Train",
  cost: 10.5,
  distance: 37.9,
  description: "commute",
};

describe("parseTripsPayload", () => {
  it("reads the export format { version, trips }", () => {
    const trips = parseTripsPayload({ version: 1, exportedAt: "x", trips: [valid] });
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({
      id: "t1",
      origin: "Villach Hauptbahnhof", // trimmed
      transportType: "Train",
      cost: 10.5,
      distance: 37.9,
    });
    expect(trips[0].date).toEqual(new Date("2026-10-20T07:30:00.000Z"));
  });

  it("accepts a plain array and numbers given as strings", () => {
    const trips = parseTripsPayload([{ ...valid, cost: "10.50", distance: "37.9" }]);
    expect(trips[0].cost).toBe(10.5);
    expect(trips[0].distance).toBe(37.9);
  });

  it("defaults a missing description to an empty string", () => {
    const { description, ...noDescription } = valid;
    expect(description).toBe("commute");
    expect(parseTripsPayload([noDescription])[0].description).toBe("");
  });

  it("skips invalid entries instead of failing the whole file", () => {
    const trips = parseTripsPayload([
      valid,
      { ...valid, id: "bad-date", date: "not a date" },
      { ...valid, id: "bad-type", transportType: "Plane" },
      { ...valid, id: "no-origin", origin: "" },
      { ...valid, id: "bad-cost", cost: "free" },
      { ...valid, id: undefined },
      null,
      "nonsense",
    ]);
    expect(trips.map((t) => t.id)).toEqual(["t1"]);
  });

  it("throws a readable error for files without a trips list", () => {
    expect(() => parseTripsPayload({ hello: "world" })).toThrow(/isn't a KlimaChallenge export/);
    expect(() => parseTripsPayload(42)).toThrow(/isn't a KlimaChallenge export/);
  });
});
