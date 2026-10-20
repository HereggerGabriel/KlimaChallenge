import {
  isInCurrentWeek,
  isSameLocalDay,
  localDateKey,
  startOfWeek,
  weekStartKey,
} from "@/utils/dateKeys";
import { computeStreak } from "@/utils/streakSystem";
import { Trip } from "@/types/trip";

// Run in Austrian time so the "just after midnight" cases differ from UTC.
process.env.TZ = "Europe/Vienna";

const trip = (date: Date): Trip => ({
  id: date.toISOString(),
  date,
  origin: "Villach",
  destination: "Klagenfurt",
  transportType: "Train",
  cost: 10.2,
  distance: 45,
  description: "",
});

describe("localDateKey", () => {
  it("uses the local day, not the UTC day, just after midnight", () => {
    // 00:30 in Vienna (CEST, UTC+2) is still the previous day in UTC.
    const justAfterMidnight = new Date(2026, 9, 21, 0, 30);
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe("2026-10-20");
    expect(localDateKey(justAfterMidnight)).toBe("2026-10-21");
  });
});

describe("startOfWeek / weekStartKey", () => {
  it("returns Monday 00:00 for a mid-week date", () => {
    const wednesday = new Date(2026, 9, 21, 15, 0);
    const monday = startOfWeek(wednesday);
    expect(monday.getDay()).toBe(1);
    expect(monday.getHours()).toBe(0);
    expect(weekStartKey(wednesday)).toBe("2026-10-19");
  });

  it("treats Sunday as the end of the week, not the start", () => {
    expect(weekStartKey(new Date(2026, 9, 25, 23, 0))).toBe("2026-10-19");
  });

  it("keeps the local Monday just after midnight on Monday", () => {
    expect(weekStartKey(new Date(2026, 9, 26, 0, 15))).toBe("2026-10-26");
  });
});

describe("isInCurrentWeek", () => {
  const now = new Date(2026, 9, 21, 12, 0); // Wednesday

  it("includes Monday 00:00 and Sunday 23:59", () => {
    expect(isInCurrentWeek(new Date(2026, 9, 19, 0, 0), now)).toBe(true);
    expect(isInCurrentWeek(new Date(2026, 9, 25, 23, 59), now)).toBe(true);
  });

  it("excludes last Sunday and next Monday (future trips don't count)", () => {
    expect(isInCurrentWeek(new Date(2026, 9, 18, 23, 59), now)).toBe(false);
    expect(isInCurrentWeek(new Date(2026, 9, 26, 0, 0), now)).toBe(false);
  });

  it("handles the week with the DST switch (Oct 25, 2026)", () => {
    const sundayAfterSwitch = new Date(2026, 9, 25, 22, 0);
    expect(isInCurrentWeek(sundayAfterSwitch, now)).toBe(true);
  });
});

describe("isSameLocalDay", () => {
  it("compares calendar days in local time", () => {
    expect(isSameLocalDay(new Date(2026, 9, 21, 0, 5), new Date(2026, 9, 21, 23, 55))).toBe(true);
    expect(isSameLocalDay(new Date(2026, 9, 20, 23, 55), new Date(2026, 9, 21, 0, 5))).toBe(false);
  });
});

describe("computeStreak", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 0, 30)); // just after midnight
  });
  afterEach(() => jest.useRealTimers());

  it("counts consecutive local days ending today", () => {
    const trips = [
      trip(new Date(2026, 9, 21, 0, 10)),
      trip(new Date(2026, 9, 20, 8, 0)),
      trip(new Date(2026, 9, 19, 8, 0)),
    ];
    expect(computeStreak(trips)).toBe(3);
  });

  it("stays active if the last trip was yesterday", () => {
    expect(computeStreak([trip(new Date(2026, 9, 20, 8, 0))])).toBe(1);
  });

  it("is 0 when the streak is broken", () => {
    expect(computeStreak([trip(new Date(2026, 9, 18, 8, 0))])).toBe(0);
  });
});
