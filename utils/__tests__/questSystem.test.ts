import {
  DAILY_QUEST_POOL,
  getClaimKey,
  MILESTONE_QUESTS,
  pickRandomQuests,
  Quest,
  WEEKLY_QUEST_POOL,
} from "@/utils/questSystem";
import { Trip } from "@/types/trip";

process.env.TZ = "Europe/Vienna";

const quest = (pool: Quest[], id: string) => pool.find((q) => q.id === id)!;

const trip = (date: Date, transportType = "Train", distance = 10): Trip => ({
  id: `${date.toISOString()}-${transportType}-${distance}`,
  date,
  origin: "A",
  destination: "B",
  transportType,
  cost: 5,
  distance,
  description: "",
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 21, 12, 0)); // Wednesday
});
afterEach(() => jest.useRealTimers());

describe("daily quests", () => {
  it("count only today's trips (local time)", () => {
    const logTrip = quest(DAILY_QUEST_POOL, "daily_log_trip");
    expect(logTrip.computeProgress([trip(new Date(2026, 9, 20, 23, 30))])).toEqual({
      current: 0,
      target: 1,
    });
    expect(logTrip.computeProgress([trip(new Date(2026, 9, 21, 0, 15))])).toEqual({
      current: 1,
      target: 1,
    });
  });

  it("check transport type and distance", () => {
    const today = new Date(2026, 9, 21, 8, 0);
    expect(
      quest(DAILY_QUEST_POOL, "daily_bus").computeProgress([trip(today, "Train")]).current,
    ).toBe(0);
    expect(
      quest(DAILY_QUEST_POOL, "daily_10km").computeProgress([
        trip(today, "Bus", 6),
        trip(today, "Tram", 6),
      ]),
    ).toEqual({ current: 10, target: 10 }); // capped at the target
    expect(
      quest(DAILY_QUEST_POOL, "daily_multimodal").computeProgress([
        trip(today, "Bus"),
        trip(today, "Tram"),
      ]).current,
    ).toBe(2);
  });
});

describe("weekly quests", () => {
  it("count trips from Monday on and ignore last week and future trips", () => {
    const fiveTrips = quest(WEEKLY_QUEST_POOL, "weekly_5trips");
    const trips = [
      trip(new Date(2026, 9, 18, 20)), // last Sunday
      trip(new Date(2026, 9, 19, 7)), // Monday
      trip(new Date(2026, 9, 21, 7)), // Wednesday
      trip(new Date(2026, 9, 27, 7)), // next Tuesday
    ];
    expect(fiveTrips.computeProgress(trips)).toEqual({ current: 2, target: 5 });
  });

  it("count distinct days for the 5-day quest", () => {
    const fiveDays = quest(WEEKLY_QUEST_POOL, "weekly_5days");
    const sameDay = [trip(new Date(2026, 9, 19, 7)), trip(new Date(2026, 9, 19, 18))];
    expect(fiveDays.computeProgress(sameDay).current).toBe(1);
  });
});

describe("milestone quests", () => {
  it("track totals across all time", () => {
    const trips = Array.from({ length: 12 }, (_, i) => trip(new Date(2025, 0, i + 1), "Train", 10));
    expect(quest(MILESTONE_QUESTS, "milestone_10trips").computeProgress(trips)).toEqual({
      current: 10,
      target: 10,
    });
    expect(quest(MILESTONE_QUESTS, "milestone_100km").computeProgress(trips)).toEqual({
      current: 100,
      target: 100,
    });
  });
});

describe("getClaimKey", () => {
  it("is per day for daily, per week for weekly and once for milestones", () => {
    expect(getClaimKey(quest(DAILY_QUEST_POOL, "daily_train"))).toBe("daily_train:2026-10-21");
    expect(getClaimKey(quest(WEEKLY_QUEST_POOL, "weekly_3trains"))).toBe(
      "weekly_3trains:2026-10-19",
    );
    expect(getClaimKey(quest(MILESTONE_QUESTS, "milestone_first_trip"))).toBe(
      "milestone_first_trip",
    );
  });
});

describe("pickRandomQuests", () => {
  it("picks n distinct quests from the pool", () => {
    const picked = pickRandomQuests(DAILY_QUEST_POOL, 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((q) => q.id)).size).toBe(3);
  });
});
