// XP is derived, never stored: XP from trips + XP from claimed rewards.
// The reward log records every claim with its XP and time, which also makes
// claims available as study data.

import { Trip } from "@/types/trip";
import { getXPForTrip } from "@/utils/levelSystem";
import {
  DAILY_QUEST_POOL,
  MAIN_QUEST_ID,
  MAIN_QUEST_XP,
  MILESTONE_QUESTS,
  WEEKLY_QUEST_POOL,
} from "@/utils/questSystem";
import { ACHIEVEMENTS } from "@/utils/achievementSystem";
import { STREAK_MILESTONES } from "@/utils/streakSystem";

export type RewardKind = "quest" | "achievement" | "streak" | "mainQuest";

export interface RewardClaim {
  /** Unique per claim, e.g. "quest:daily_train:2026-10-20", "achievement:general_first", "streak:7". */
  key: string;
  kind: RewardKind;
  xp: number;
  /** ISO timestamp. */
  claimedAt: string;
}

export const rewardKey = {
  quest: (claimKey: string) => `quest:${claimKey}`,
  achievement: (id: string) => `achievement:${id}`,
  streak: (days: number) => `streak:${days}`,
  mainQuest: (periodKey: string) => `mainQuest:${periodKey}`,
};

export function tripsXP(trips: Trip[]): number {
  return trips.reduce((sum, t) => sum + getXPForTrip(t.distance, t.transportType), 0);
}

export function rewardsXP(claims: RewardClaim[]): number {
  return claims.reduce((sum, c) => sum + c.xp, 0);
}

export function totalXP(trips: Trip[], claims: RewardClaim[]): number {
  return tripsXP(trips) + rewardsXP(claims);
}

// ── Migration from the old storage layout ───────────────────────────────────

const QUEST_XP = new Map(
  [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL, ...MILESTONE_QUESTS].map((q) => [q.id, q.xpReward]),
);
const ACHIEVEMENT_XP = new Map(ACHIEVEMENTS.map((a) => [a.id, a.xpReward]));
const STREAK_XP = new Map(STREAK_MILESTONES.map((m) => [m.days, m.xp]));

/**
 * Builds the reward log from the old claim lists (@claimedQuests,
 * @claimedAchievements, @claimedStreakMilestones). The old lists had no
 * timestamps, so `migratedAt` is used. Unknown IDs are dropped.
 */
export function migrateLegacyClaims(
  legacy: { quests: string[]; achievements: string[]; streakDays: number[] },
  migratedAt: string,
): RewardClaim[] {
  const claims: RewardClaim[] = [];
  for (const claimKey of legacy.quests) {
    if (claimKey === MAIN_QUEST_ID) {
      // Old main quest claims had no ticket period; keep them under "legacy".
      claims.push({
        key: rewardKey.mainQuest("legacy"),
        kind: "mainQuest",
        xp: MAIN_QUEST_XP,
        claimedAt: migratedAt,
      });
      continue;
    }
    const xp = QUEST_XP.get(claimKey.split(":")[0]);
    if (xp !== undefined) {
      claims.push({ key: rewardKey.quest(claimKey), kind: "quest", xp, claimedAt: migratedAt });
    }
  }
  for (const id of legacy.achievements) {
    const xp = ACHIEVEMENT_XP.get(id);
    if (xp !== undefined) {
      claims.push({
        key: rewardKey.achievement(id),
        kind: "achievement",
        xp,
        claimedAt: migratedAt,
      });
    }
  }
  for (const days of legacy.streakDays) {
    const xp = STREAK_XP.get(days);
    if (xp !== undefined) {
      claims.push({ key: rewardKey.streak(days), kind: "streak", xp, claimedAt: migratedAt });
    }
  }
  return claims;
}
