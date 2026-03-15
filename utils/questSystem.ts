import { Trip } from '@/types/trip';

export type QuestType = 'daily' | 'weekly' | 'milestone';

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  xpReward: number;
  icon: string; // MaterialIcons name
  computeProgress: (trips: Trip[]) => { current: number; target: number };
}

export const QUESTS_PER_ROTATION = 3;

// ── Main Quest ─────────────────────────────────────────────────────────────
export const MAIN_QUEST_ID = 'main_quest_klimaticket';
export const MAIN_QUEST_XP = 2000;
export const MAIN_QUEST_CELEBRATED_KEY = '@mainQuestCelebrated';

/** Randomly pick n quests from a pool — call this once per day/week and persist the result */
export function pickRandomQuests(pool: Quest[], n: number): Quest[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Date helpers ────────────────────────────────────────────────────────────

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function isToday(d: Date | string): boolean {
  return toDate(d).toDateString() === new Date().toDateString();
}

function isThisWeek(d: Date | string): boolean {
  const date = toDate(d);
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return date >= monday;
}

// ── Claim key helpers ──────────────────────────────────────────────────────

function getDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStartKey(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split('T')[0];
}

export function getClaimKey(quest: Quest): string {
  if (quest.type === 'daily') return `${quest.id}:${getDateKey()}`;
  if (quest.type === 'weekly') return `${quest.id}:${getWeekStartKey()}`;
  return quest.id;
}

// ── Reset time helpers ─────────────────────────────────────────────────────

export function timeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function daysUntilMonday(): string {
  const day = new Date().getDay();
  const days = day === 1 ? 7 : (8 - day) % 7;
  return days === 1 ? '1 day' : `${days} days`;
}

// ── Daily quest pool (7 quests — 3 shown per day) ─────────────────────────

export const DAILY_QUEST_POOL: Quest[] = [
  {
    id: 'daily_log_trip',
    type: 'daily',
    title: 'Log a trip today',
    description: 'Record at least one trip today',
    xpReward: 25,
    icon: 'directions-transit',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => isToday(t.date)).length, 1),
      target: 1,
    }),
  },
  {
    id: 'daily_train',
    type: 'daily',
    title: 'Ride the rails',
    description: 'Take a train trip today',
    xpReward: 20,
    icon: 'train',
    computeProgress: (trips) => ({
      current: Math.min(
        trips.filter((t) => isToday(t.date) && t.transportType === 'Train').length,
        1,
      ),
      target: 1,
    }),
  },
  {
    id: 'daily_bus',
    type: 'daily',
    title: 'Bus it today',
    description: 'Take a bus trip today',
    xpReward: 20,
    icon: 'directions-bus',
    computeProgress: (trips) => ({
      current: Math.min(
        trips.filter((t) => isToday(t.date) && t.transportType === 'Bus').length,
        1,
      ),
      target: 1,
    }),
  },
  {
    id: 'daily_tram',
    type: 'daily',
    title: 'Tram day',
    description: 'Take a tram trip today',
    xpReward: 20,
    icon: 'tram',
    computeProgress: (trips) => ({
      current: Math.min(
        trips.filter((t) => isToday(t.date) && t.transportType === 'Tram').length,
        1,
      ),
      target: 1,
    }),
  },
  {
    id: 'daily_10km',
    type: 'daily',
    title: 'Cover 10km today',
    description: 'Travel at least 10km in a single day',
    xpReward: 30,
    icon: 'route',
    computeProgress: (trips) => {
      const km = trips.filter((t) => isToday(t.date)).reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km * 10) / 10, 10), target: 10 };
    },
  },
  {
    id: 'daily_15km',
    type: 'daily',
    title: 'Go the distance',
    description: 'Travel at least 15km today',
    xpReward: 40,
    icon: 'speed',
    computeProgress: (trips) => {
      const km = trips.filter((t) => isToday(t.date)).reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km * 10) / 10, 15), target: 15 };
    },
  },
  {
    id: 'daily_2trips',
    type: 'daily',
    title: 'Double up',
    description: 'Log 2 trips today',
    xpReward: 35,
    icon: 'repeat',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => isToday(t.date)).length, 2),
      target: 2,
    }),
  },
  {
    id: 'daily_multimodal',
    type: 'daily',
    title: 'Mix it up',
    description: 'Use 2 different transport types today',
    xpReward: 35,
    icon: 'compare-arrows',
    computeProgress: (trips) => {
      const types = new Set(trips.filter((t) => isToday(t.date)).map((t) => t.transportType));
      return { current: Math.min(types.size, 2), target: 2 };
    },
  },
];

// ── Weekly quest pool (7 quests — 3 shown per week) ───────────────────────

export const WEEKLY_QUEST_POOL: Quest[] = [
  {
    id: 'weekly_5trips',
    type: 'weekly',
    title: 'Log 5 trips this week',
    description: 'Stay consistent with 5 trips this week',
    xpReward: 75,
    icon: 'event-repeat',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => isThisWeek(t.date)).length, 5),
      target: 5,
    }),
  },
  {
    id: 'weekly_7trips',
    type: 'weekly',
    title: 'Daily commuter',
    description: 'Log at least 7 trips this week',
    xpReward: 100,
    icon: 'calendar-today',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => isThisWeek(t.date)).length, 7),
      target: 7,
    }),
  },
  {
    id: 'weekly_3types',
    type: 'weekly',
    title: 'Go multi-modal',
    description: 'Use 3 different transport types this week',
    xpReward: 60,
    icon: 'compare-arrows',
    computeProgress: (trips) => {
      const types = new Set(trips.filter((t) => isThisWeek(t.date)).map((t) => t.transportType));
      return { current: Math.min(types.size, 3), target: 3 };
    },
  },
  {
    id: 'weekly_4types',
    type: 'weekly',
    title: 'Transport master',
    description: 'Use all 4 transport types this week',
    xpReward: 90,
    icon: 'swap-horiz',
    computeProgress: (trips) => {
      const types = new Set(trips.filter((t) => isThisWeek(t.date)).map((t) => t.transportType));
      const needed = ['Train', 'Bus', 'Tram', 'Subway'];
      return { current: Math.min(needed.filter((tp) => types.has(tp)).length, 4), target: 4 };
    },
  },
  {
    id: 'weekly_50km',
    type: 'weekly',
    title: 'Travel 50km this week',
    description: 'Rack up 50km of green travel',
    xpReward: 100,
    icon: 'speed',
    computeProgress: (trips) => {
      const km = trips.filter((t) => isThisWeek(t.date)).reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 50), target: 50 };
    },
  },
  {
    id: 'weekly_100km',
    type: 'weekly',
    title: 'Century week',
    description: 'Travel 100km in a single week',
    xpReward: 150,
    icon: 'flight-takeoff',
    computeProgress: (trips) => {
      const km = trips.filter((t) => isThisWeek(t.date)).reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 100), target: 100 };
    },
  },
  {
    id: 'weekly_3trains',
    type: 'weekly',
    title: 'Train week',
    description: 'Take 3 train trips this week',
    xpReward: 60,
    icon: 'train',
    computeProgress: (trips) => ({
      current: Math.min(
        trips.filter((t) => isThisWeek(t.date) && t.transportType === 'Train').length,
        3,
      ),
      target: 3,
    }),
  },
  {
    id: 'weekly_5days',
    type: 'weekly',
    title: '5-day streak',
    description: 'Log trips on 5 different days this week',
    xpReward: 90,
    icon: 'date-range',
    computeProgress: (trips) => {
      const days = new Set(
        trips
          .filter((t) => isThisWeek(t.date))
          .map((t) => toDate(t.date).toDateString()),
      );
      return { current: Math.min(days.size, 5), target: 5 };
    },
  },
];

// ── Milestone quests (all shown, never rotate) ────────────────────────────

export const MILESTONE_QUESTS: Quest[] = [
  {
    id: 'milestone_first_trip',
    type: 'milestone',
    title: 'First Steps',
    description: 'Log your very first trip',
    xpReward: 50,
    icon: 'star',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 1), target: 1 }),
  },
  {
    id: 'milestone_10trips',
    type: 'milestone',
    title: 'Regular Commuter',
    description: 'Log 10 trips in total',
    xpReward: 100,
    icon: 'repeat',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 10), target: 10 }),
  },
  {
    id: 'milestone_25trips',
    type: 'milestone',
    title: 'Dedicated Traveler',
    description: 'Log 25 trips in total',
    xpReward: 150,
    icon: 'emoji-transportation',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 25), target: 25 }),
  },
  {
    id: 'milestone_50trips',
    type: 'milestone',
    title: 'Climate Champion',
    description: "Log 50 trips — you're making a real difference",
    xpReward: 250,
    icon: 'eco',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 50), target: 50 }),
  },
  {
    id: 'milestone_100trips',
    type: 'milestone',
    title: 'Century Rider',
    description: 'Log 100 trips — an absolute legend',
    xpReward: 400,
    icon: 'military-tech',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 100), target: 100 }),
  },
  {
    id: 'milestone_multimodal',
    type: 'milestone',
    title: 'Multi-Modal Pioneer',
    description: 'Use all 4 transport types at least once',
    xpReward: 200,
    icon: 'swap-horiz',
    computeProgress: (trips) => {
      const types = new Set(trips.map((t) => t.transportType));
      const count = ['Train', 'Bus', 'Tram', 'Subway'].filter((tp) => types.has(tp)).length;
      return { current: count, target: 4 };
    },
  },
  {
    id: 'milestone_100km',
    type: 'milestone',
    title: '100km Adventurer',
    description: 'Travel 100km total by public transport',
    xpReward: 150,
    icon: 'explore',
    computeProgress: (trips) => {
      const km = trips.reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 100), target: 100 };
    },
  },
  {
    id: 'milestone_500km',
    type: 'milestone',
    title: '500km Voyager',
    description: 'Travel 500km total — a true green explorer',
    xpReward: 300,
    icon: 'flight-takeoff',
    computeProgress: (trips) => {
      const km = trips.reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 500), target: 500 };
    },
  },
  {
    id: 'milestone_1000km',
    type: 'milestone',
    title: '1000km Legend',
    description: 'Travel 1000km total — truly legendary',
    xpReward: 500,
    icon: 'public',
    computeProgress: (trips) => {
      const km = trips.reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 1000), target: 1000 };
    },
  },
];
