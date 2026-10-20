import {
  calculateCurrentLevelXP,
  calculateLevel,
  calculateXPForNextLevel,
  getXPForTrip,
} from "@/utils/levelSystem";
import { migrateLegacyClaims, rewardKey, RewardClaim, totalXP, tripsXP } from "@/utils/rewards";
import { MAIN_QUEST_XP } from "@/utils/questSystem";
import { Trip } from "@/types/trip";

const trip = (distance: number, transportType = "Train"): Trip => ({
  id: `${distance}-${transportType}`,
  date: new Date(2026, 9, 20),
  origin: "A",
  destination: "B",
  transportType,
  cost: 10,
  distance,
  description: "",
});

describe("levelSystem", () => {
  it("gives 10 base XP + 1 per km (max 50), times the transport bonus", () => {
    expect(getXPForTrip(42, "Train")).toBe(Math.round(52 * 1.2));
    expect(getXPForTrip(100, "Tram")).toBe(Math.round(60 * 1.4));
    expect(getXPForTrip(0, "Bus")).toBe(Math.round(10 * 1.1));
  });

  it("starts at level 1 and needs 100, then 150, 225 ... XP per level", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(249)).toBe(2);
    expect(calculateLevel(250)).toBe(3);
    expect(calculateXPForNextLevel(1)).toBe(100);
    expect(calculateXPForNextLevel(3)).toBe(225);
  });

  it("reports progress within the current level", () => {
    expect(calculateCurrentLevelXP(130, calculateLevel(130))).toBe(30);
    expect(calculateCurrentLevelXP(250, calculateLevel(250))).toBe(0);
  });
});

describe("derived XP", () => {
  const claims: RewardClaim[] = [
    { key: rewardKey.achievement("general_first"), kind: "achievement", xp: 25, claimedAt: "x" },
    { key: rewardKey.streak(3), kind: "streak", xp: 50, claimedAt: "x" },
  ];

  it("is trip XP plus claimed reward XP", () => {
    const trips = [trip(42), trip(5, "Bus")];
    expect(tripsXP(trips)).toBe(getXPForTrip(42, "Train") + getXPForTrip(5, "Bus"));
    expect(totalXP(trips, claims)).toBe(tripsXP(trips) + 75);
  });

  it("drops a deleted trip's XP automatically", () => {
    const trips = [trip(42), trip(5, "Bus")];
    expect(totalXP(trips.slice(1), claims)).toBe(
      totalXP(trips, claims) - getXPForTrip(42, "Train"),
    );
  });

  it("is 0 with no data", () => {
    expect(totalXP([], [])).toBe(0);
  });
});

describe("migrateLegacyClaims", () => {
  it("converts old claim lists with their XP values and drops unknown IDs", () => {
    const claims = migrateLegacyClaims(
      {
        quests: [
          "daily_train:2026-10-20",
          "milestone_first_trip",
          "main_quest_klimaticket",
          "nope",
        ],
        achievements: ["general_first", "unknown_achievement"],
        streakDays: [3, 999],
      },
      "2026-10-20T20:00:00.000Z",
    );
    expect(claims.map((c) => c.key)).toEqual([
      "quest:daily_train:2026-10-20",
      "quest:milestone_first_trip",
      "mainQuest:legacy",
      "achievement:general_first",
      "streak:3",
    ]);
    expect(claims.find((c) => c.kind === "mainQuest")?.xp).toBe(MAIN_QUEST_XP);
    expect(claims.every((c) => c.xp > 0 && c.claimedAt === "2026-10-20T20:00:00.000Z")).toBe(true);
  });
});
