import { Trip } from '@/types/trip';

export type AchievementCategory = 'general' | 'distance' | 'transport' | 'streak' | 'savings';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string; // MaterialIcons name
  category: AchievementCategory;
  computeProgress: (
    trips: Trip[],
    streak: number,
    savedVsCar: number,
  ) => { current: number; target: number };
}

export const ACHIEVEMENT_CATEGORIES: { key: AchievementCategory; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'distance', label: 'Distance' },
  { key: 'transport', label: 'Transport' },
  { key: 'streak', label: 'Streaks' },
  { key: 'savings', label: 'Savings' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Current active streak: consecutive days (ending today or yesterday) with ≥1 trip */
export function computeStreak(trips: Trip[]): number {
  if (trips.length === 0) return 0;

  const dates = new Set(trips.map((t) => toDate(t.date).toDateString()));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (!dates.has(today.toDateString()) && !dates.has(yesterday.toDateString())) return 0;

  const start = dates.has(today.toDateString()) ? new Date(today) : new Date(yesterday);
  let streak = 0;
  const cur = new Date(start);

  while (dates.has(cur.toDateString())) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  return streak;
}

/** Estimated savings vs driving a car (€0.30/km assumption) */
export function computeSavedVsCar(trips: Trip[]): number {
  return trips.reduce((sum, t) => sum + (t.distance * 0.3 - t.cost), 0);
}

// ── Achievement definitions ────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ── General ──
  {
    id: 'general_first',
    title: 'First Steps',
    description: 'Log your very first trip',
    xpReward: 25,
    icon: 'star',
    category: 'general',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 1), target: 1 }),
  },
  {
    id: 'general_5trips',
    title: 'Getting Started',
    description: 'Log 5 trips',
    xpReward: 50,
    icon: 'thumb-up',
    category: 'general',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 5), target: 5 }),
  },
  {
    id: 'general_25trips',
    title: 'Frequent Rider',
    description: 'Log 25 trips',
    xpReward: 100,
    icon: 'directions-transit',
    category: 'general',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 25), target: 25 }),
  },
  {
    id: 'general_100trips',
    title: 'Century Club',
    description: 'Log 100 trips — absolute legend',
    xpReward: 300,
    icon: 'military-tech',
    category: 'general',
    computeProgress: (trips) => ({ current: Math.min(trips.length, 100), target: 100 }),
  },

  // ── Distance ──
  {
    id: 'dist_10',
    title: '10km Club',
    description: 'Travel 10km total by public transport',
    xpReward: 50,
    icon: 'directions-walk',
    category: 'distance',
    computeProgress: (trips) => {
      const km = trips.reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 10), target: 10 };
    },
  },
  {
    id: 'dist_100',
    title: '100km Club',
    description: 'Travel 100km total',
    xpReward: 100,
    icon: 'directions-bike',
    category: 'distance',
    computeProgress: (trips) => {
      const km = trips.reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 100), target: 100 };
    },
  },
  {
    id: 'dist_500',
    title: '500km Club',
    description: 'Travel 500km total — impressive dedication',
    xpReward: 200,
    icon: 'terrain',
    category: 'distance',
    computeProgress: (trips) => {
      const km = trips.reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 500), target: 500 };
    },
  },
  {
    id: 'dist_1000',
    title: '1000km Voyager',
    description: 'Travel 1000km total — legendary',
    xpReward: 500,
    icon: 'public',
    category: 'distance',
    computeProgress: (trips) => {
      const km = trips.reduce((s, t) => s + t.distance, 0);
      return { current: Math.min(Math.round(km), 1000), target: 1000 };
    },
  },

  // ── Transport ──
  {
    id: 'transport_train_5',
    title: 'Train Rider',
    description: 'Take 5 train trips',
    xpReward: 75,
    icon: 'train',
    category: 'transport',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => t.transportType === 'Train').length, 5),
      target: 5,
    }),
  },
  {
    id: 'transport_bus_5',
    title: 'Bus Regular',
    description: 'Take 5 bus trips',
    xpReward: 50,
    icon: 'directions-bus',
    category: 'transport',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => t.transportType === 'Bus').length, 5),
      target: 5,
    }),
  },
  {
    id: 'transport_tram_5',
    title: 'Tram Enthusiast',
    description: 'Take 5 tram trips',
    xpReward: 50,
    icon: 'tram',
    category: 'transport',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => t.transportType === 'Tram').length, 5),
      target: 5,
    }),
  },
  {
    id: 'transport_subway_3',
    title: 'Metro Explorer',
    description: 'Take 3 subway trips',
    xpReward: 75,
    icon: 'subway',
    category: 'transport',
    computeProgress: (trips) => ({
      current: Math.min(trips.filter((t) => t.transportType === 'Subway').length, 3),
      target: 3,
    }),
  },
  {
    id: 'transport_all_4',
    title: 'Multi-Modal Master',
    description: 'Use all 4 transport types at least once',
    xpReward: 100,
    icon: 'swap-horiz',
    category: 'transport',
    computeProgress: (trips) => {
      const types = new Set(trips.map((t) => t.transportType));
      const count = ['Train', 'Bus', 'Tram', 'Subway'].filter((tp) => types.has(tp)).length;
      return { current: count, target: 4 };
    },
  },

  // ── Streaks ──
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Log trips on 3 consecutive days',
    xpReward: 50,
    icon: 'local-fire-department',
    category: 'streak',
    computeProgress: (_trips, streak) => ({ current: Math.min(streak, 3), target: 3 }),
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'Log trips every day for a week',
    xpReward: 150,
    icon: 'whatshot',
    category: 'streak',
    computeProgress: (_trips, streak) => ({ current: Math.min(streak, 7), target: 7 }),
  },
  {
    id: 'streak_30',
    title: '30-Day Streak',
    description: 'A whole month of green commuting',
    xpReward: 500,
    icon: 'emoji-events',
    category: 'streak',
    computeProgress: (_trips, streak) => ({ current: Math.min(streak, 30), target: 30 }),
  },

  // ── Savings ──
  {
    id: 'savings_20',
    title: 'Eco Saver',
    description: 'Save €20 vs driving (€0.30/km assumed)',
    xpReward: 75,
    icon: 'savings',
    category: 'savings',
    computeProgress: (_trips, _streak, saved) => ({
      current: Math.min(Math.round(Math.max(0, saved)), 20),
      target: 20,
    }),
  },
  {
    id: 'savings_100',
    title: 'Green Champion',
    description: 'Save €100 vs driving by car',
    xpReward: 150,
    icon: 'park',
    category: 'savings',
    computeProgress: (_trips, _streak, saved) => ({
      current: Math.min(Math.round(Math.max(0, saved)), 100),
      target: 100,
    }),
  },
  {
    id: 'savings_500',
    title: 'Planet Protector',
    description: 'Save €500 vs driving — true hero',
    xpReward: 300,
    icon: 'nature',
    category: 'savings',
    computeProgress: (_trips, _streak, saved) => ({
      current: Math.min(Math.round(Math.max(0, saved)), 500),
      target: 500,
    }),
  },
];
