import {
  estimateDistanceKm,
  findStation,
  normalizeStationName,
  railDistanceKm,
  searchStations,
} from "@/services/stations";

describe("normalizeStationName", () => {
  it("expands abbreviations and ignores case and accents", () => {
    expect(normalizeStationName("Villach Hbf")).toBe("villach hauptbahnhof");
    expect(normalizeStationName("Villach HBF")).toBe("villach hauptbahnhof");
    expect(normalizeStationName("Villach Westbf")).toBe("villach westbahnhof");
    expect(normalizeStationName("Velden/Wörthersee")).toBe("velden woerthersee");
  });
});

describe("findStation", () => {
  it("finds stations by abbreviated or differently cased names", () => {
    expect(findStation("Villach HBF")?.name).toBe("Villach Hauptbahnhof");
    expect(findStation("klagenfurt hbf")?.name).toBe("Klagenfurt Hauptbahnhof");
    expect(findStation("Velden/Wörthersee")?.name).toBe("Velden/Wörthersee");
  });

  it("treats a bare city name as its main station", () => {
    expect(findStation("Graz")?.name).toBe("Graz Hauptbahnhof");
  });

  it("returns undefined for unknown places", () => {
    expect(findStation("Mein Büro")).toBeUndefined();
    expect(findStation("")).toBeUndefined();
  });
});

describe("searchStations", () => {
  it("puts the main station first for a city name", () => {
    expect(searchStations("wien")[0].name).toBe("Wien Hauptbahnhof");
    expect(searchStations("villach")[0].name).toBe("Villach Hauptbahnhof");
  });

  it("matches word prefixes in any order", () => {
    const names = searchStations("west villach").map((s) => s.name);
    expect(names).toContain("Villach Westbahnhof");
  });

  it("needs at least two characters", () => {
    expect(searchStations("v")).toEqual([]);
  });
});

describe("railDistanceKm", () => {
  it("returns realistic track distances", () => {
    const villach = findStation("Villach Hauptbahnhof")!;
    const klagenfurt = findStation("Klagenfurt Hauptbahnhof")!;
    const wien = findStation("Wien Hauptbahnhof")!;
    const graz = findStation("Graz Hauptbahnhof")!;
    expect(railDistanceKm(villach, klagenfurt)).toBeCloseTo(37.9, 0);
    expect(railDistanceKm(wien, graz)).toBeGreaterThan(200);
    expect(railDistanceKm(wien, graz)).toBeLessThan(220);
    expect(railDistanceKm(villach, villach)).toBe(0);
  });

  it("is symmetric", () => {
    const a = findStation("Salzburg Hauptbahnhof")!;
    const b = findStation("Innsbruck Hauptbahnhof")!;
    expect(railDistanceKm(a, b)).toBe(railDistanceKm(b, a));
  });
});

describe("estimateDistanceKm", () => {
  it("works with typed names and returns null for unknown places", () => {
    expect(estimateDistanceKm("Villach Hbf", "Klagenfurt Hbf")).toBeCloseTo(37.9, 0);
    expect(estimateDistanceKm("Villach Hbf", "Mein Büro")).toBeNull();
  });
});
