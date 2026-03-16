import { Trip } from '@/types/trip';

export const STREAK_MILESTONES_KEY = '@claimedStreakMilestones';

export const STREAK_MILESTONES = [
  { days: 3,   xp: 50 },
  { days: 7,   xp: 150 },
  { days: 14,  xp: 300 },
  { days: 30,  xp: 600 },
  { days: 60,  xp: 1000 },
  { days: 100, xp: 2000 },
];

/**
 * Returns the total bonus XP to award and the milestone day-counts that were
 * newly reached. Pass in the current streak and the set of already-claimed
 * milestone day-counts.
 */
export function getNewMilestoneXP(
  streak: number,
  claimed: Set<number>
): { xp: number; milestones: number[] } {
  let xp = 0;
  const milestones: number[] = [];
  for (const m of STREAK_MILESTONES) {
    if (streak >= m.days && !claimed.has(m.days)) {
      xp += m.xp;
      milestones.push(m.days);
    }
  }
  return { xp, milestones };
}

/**
 * Computes the current consecutive-day streak from a list of trips.
 * A streak is the number of consecutive calendar days (going backwards from
 * today or yesterday) on which the user logged at least one trip.
 * If neither today nor yesterday has a trip, the streak is 0.
 */
export function computeStreak(trips: Trip[]): number {
  if (trips.length === 0) return 0;

  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dateSet = new Set(
    trips.map((t) => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      return toDateStr(d);
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = toDateStr(today);
  const yesterdayStr = toDateStr(yesterday);

  // Streak must include today or yesterday to be active
  if (!dateSet.has(todayStr) && !dateSet.has(yesterdayStr)) return 0;

  const start = dateSet.has(todayStr) ? new Date(today) : new Date(yesterday);

  let streak = 0;
  const cursor = new Date(start);

  while (dateSet.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
