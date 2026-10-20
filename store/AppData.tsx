// Single source of truth for trips, claimed rewards and the user's profile.
// Every screen reads and changes data through this store, so XP, level,
// streak and ticket progress are always computed from the same data.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trip } from "@/types/trip";
import { generateTripId, loadTrips, saveTrips, sortTripsNewestFirst } from "@/services/tripStorage";
import {
  calculateCurrentLevelXP,
  calculateLevel,
  calculateXPForNextLevel,
} from "@/utils/levelSystem";
import { migrateLegacyClaims, RewardClaim, RewardKind, rewardKey, totalXP } from "@/utils/rewards";
import { computeStreak, getNewMilestoneXP, STREAK_MILESTONES } from "@/utils/streakSystem";
import {
  computeTicketProgress,
  DEFAULT_TICKET,
  TicketProfile,
  TicketProgress,
  ticketPeriodKey,
} from "@/utils/ticketPeriod";

// ── Storage keys ────────────────────────────────────────────────────────────
const CLAIMS_KEY = "@rewardClaims";
const PROFILE_KEY = "@profile";
const MAIN_QUEST_CELEBRATED_PREFIX = "@mainQuestCelebrated:";
// Old layout, migrated once and then removed.
const LEGACY_KEYS = {
  xp: "userXP",
  quests: "@claimedQuests",
  achievements: "@claimedAchievements",
  streak: "@claimedStreakMilestones",
  mainQuestCelebrated: "@mainQuestCelebrated",
  name: "userName",
  ticketType: "klimaTicketType",
  ticketCost: "klimaTicketCost",
};

export interface Profile {
  name: string;
  ticket: TicketProfile;
}

const DEFAULT_PROFILE: Profile = { name: "", ticket: DEFAULT_TICKET };

/** One "+XP" moment for the feedback overlay; several can queue up. */
export interface RewardEvent {
  id: number;
  xp: number;
  /** The new level if this reward crossed a level boundary. */
  levelUp: number | null;
}

export interface MainQuestEvent {
  valueUsed: number;
  cost: number;
}

interface AppDataContextValue {
  isLoaded: boolean;
  trips: Trip[];
  claims: RewardClaim[];
  profile: Profile;
  // Derived
  xp: number;
  level: number;
  levelXP: number;
  levelXPNeeded: number;
  streak: number;
  ticketProgress: TicketProgress;
  periodKey: string;
  // Feedback
  rewardEvents: RewardEvent[];
  dismissRewardEvent: () => void;
  mainQuestEvent: MainQuestEvent | null;
  dismissMainQuestEvent: () => void;
  // Actions
  addTrip: (trip: Omit<Trip, "id">) => Promise<void>;
  updateTrip: (id: string, updates: Partial<Omit<Trip, "id">>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  mergeTrips: (incoming: Trip[]) => Promise<{ added: number; skipped: number }>;
  isClaimed: (key: string) => boolean;
  claimReward: (key: string, kind: RewardKind, xp: number) => Promise<void>;
  updateProfile: (changes: Partial<Profile>) => Promise<void>;
  /** Deletes all trips and rewards (profile stays). */
  deleteAllTrips: () => Promise<void>;
  /** Re-reads everything from storage, e.g. after logout wiped it. */
  reload: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

// ── Loading + one-time migration ────────────────────────────────────────────

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function loadClaims(): Promise<RewardClaim[]> {
  const stored = await AsyncStorage.getItem(CLAIMS_KEY);
  if (stored) return readJson<RewardClaim[]>(CLAIMS_KEY, []);
  const claims = migrateLegacyClaims(
    {
      quests: await readJson<string[]>(LEGACY_KEYS.quests, []),
      achievements: await readJson<string[]>(LEGACY_KEYS.achievements, []),
      streakDays: await readJson<number[]>(LEGACY_KEYS.streak, []),
    },
    new Date().toISOString(),
  );
  await AsyncStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  await AsyncStorage.multiRemove([
    LEGACY_KEYS.xp,
    LEGACY_KEYS.quests,
    LEGACY_KEYS.achievements,
    LEGACY_KEYS.streak,
  ]);
  return claims;
}

async function loadProfile(): Promise<Profile> {
  const stored = await readJson<Profile | null>(PROFILE_KEY, null);
  if (stored)
    return { ...DEFAULT_PROFILE, ...stored, ticket: { ...DEFAULT_TICKET, ...stored.ticket } };
  const [name, label, cost] = await Promise.all([
    AsyncStorage.getItem(LEGACY_KEYS.name),
    AsyncStorage.getItem(LEGACY_KEYS.ticketType),
    AsyncStorage.getItem(LEGACY_KEYS.ticketCost),
  ]);
  const parsedCost = cost ? parseFloat(cost) : NaN;
  const profile: Profile = {
    name: name ?? "",
    ticket: {
      ...DEFAULT_TICKET,
      ...(label ? { label, period: label.includes("1-month") ? "month" : "year" } : {}),
      ...(parsedCost > 0 ? { cost: parsedCost } : {}),
    },
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  await AsyncStorage.multiRemove([
    LEGACY_KEYS.name,
    LEGACY_KEYS.ticketType,
    LEGACY_KEYS.ticketCost,
  ]);
  return profile;
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);
  const [mainQuestEvent, setMainQuestEvent] = useState<MainQuestEvent | null>(null);

  // Latest state for actions, so consecutive calls never work on stale data.
  const state = useRef({ trips, claims, profile });
  state.current = { trips, claims, profile };
  const eventId = useRef(0);

  const reload = useCallback(async () => {
    const [t, c, p] = await Promise.all([loadTrips(), loadClaims(), loadProfile()]);
    state.current = { trips: t, claims: c, profile: p };
    setTrips(t);
    setClaims(c);
    setProfile(p);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── Persistence helpers ──
  const commitTrips = useCallback(async (next: Trip[]) => {
    state.current = { ...state.current, trips: next };
    setTrips(next);
    await saveTrips(next);
  }, []);

  const commitClaims = useCallback(async (next: RewardClaim[]) => {
    state.current = { ...state.current, claims: next };
    setClaims(next);
    await AsyncStorage.setItem(CLAIMS_KEY, JSON.stringify(next));
  }, []);

  /** Queue the "+XP" feedback for a change from `before` to `after` XP. */
  const emitReward = useCallback((before: number, after: number) => {
    if (after <= before) return;
    const oldLevel = calculateLevel(before);
    const newLevel = calculateLevel(after);
    setRewardEvents((q) => [
      ...q,
      { id: ++eventId.current, xp: after - before, levelUp: newLevel > oldLevel ? newLevel : null },
    ]);
  }, []);

  // ── Actions ──
  const addTrip = useCallback(
    async (data: Omit<Trip, "id">) => {
      const { trips: oldTrips, claims: oldClaims, profile: p } = state.current;
      const newTrips = sortTripsNewestFirst([{ ...data, id: generateTripId() }, ...oldTrips]);
      const xpBefore = totalXP(oldTrips, oldClaims);
      await commitTrips(newTrips);
      emitReward(xpBefore, totalXP(newTrips, oldClaims));

      // Streak milestones are awarded automatically when reached.
      const claimedDays = new Set(
        oldClaims.filter((c) => c.kind === "streak").map((c) => Number(c.key.split(":")[1])),
      );
      const { milestones } = getNewMilestoneXP(computeStreak(newTrips), claimedDays);
      if (milestones.length > 0) {
        const now = new Date().toISOString();
        const added: RewardClaim[] = milestones.map((days) => ({
          key: rewardKey.streak(days),
          kind: "streak",
          xp: STREAK_MILESTONES.find((m) => m.days === days)?.xp ?? 0,
          claimedAt: now,
        }));
        const xpMid = totalXP(newTrips, oldClaims);
        const newClaims = [...oldClaims, ...added];
        await commitClaims(newClaims);
        emitReward(xpMid, totalXP(newTrips, newClaims));
      }

      // Main quest: the ticket paid off in this period for the first time.
      const before = computeTicketProgress(oldTrips, p.ticket);
      const after = computeTicketProgress(newTrips, p.ticket);
      if (before.valueUsed < after.cost && after.valueUsed >= after.cost) {
        const flagKey = MAIN_QUEST_CELEBRATED_PREFIX + ticketPeriodKey(p.ticket);
        if (!(await AsyncStorage.getItem(flagKey))) {
          await AsyncStorage.setItem(flagKey, "true");
          setMainQuestEvent({ valueUsed: after.valueUsed, cost: after.cost });
        }
      }
    },
    [commitTrips, commitClaims, emitReward],
  );

  const updateTrip = useCallback(
    async (id: string, updates: Partial<Omit<Trip, "id">>) => {
      const next = sortTripsNewestFirst(
        state.current.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
      await commitTrips(next);
    },
    [commitTrips],
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      await commitTrips(state.current.trips.filter((t) => t.id !== id));
    },
    [commitTrips],
  );

  const mergeTrips = useCallback(
    async (incoming: Trip[]) => {
      const existing = state.current.trips;
      const ids = new Set(existing.map((t) => t.id));
      const fresh = incoming.filter((t) => !ids.has(t.id));
      if (fresh.length > 0) await commitTrips(sortTripsNewestFirst([...fresh, ...existing]));
      return { added: fresh.length, skipped: incoming.length - fresh.length };
    },
    [commitTrips],
  );

  const isClaimed = useCallback((key: string) => claims.some((c) => c.key === key), [claims]);

  const claimReward = useCallback(
    async (key: string, kind: RewardKind, xp: number) => {
      const { trips: t, claims: oldClaims } = state.current;
      if (oldClaims.some((c) => c.key === key)) return;
      const newClaims = [...oldClaims, { key, kind, xp, claimedAt: new Date().toISOString() }];
      const before = totalXP(t, oldClaims);
      await commitClaims(newClaims);
      emitReward(before, totalXP(t, newClaims));
    },
    [commitClaims, emitReward],
  );

  const updateProfile = useCallback(async (changes: Partial<Profile>) => {
    const current = state.current.profile;
    const next: Profile = {
      ...current,
      ...changes,
      ticket: { ...current.ticket, ...changes.ticket },
    };
    state.current = { ...state.current, profile: next };
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }, []);

  const deleteAllTrips = useCallback(async () => {
    await commitTrips([]);
    await commitClaims([]);
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(
      keys.filter(
        (k) =>
          k.startsWith(MAIN_QUEST_CELEBRATED_PREFIX) ||
          k === LEGACY_KEYS.mainQuestCelebrated ||
          k === "@dailyQuestSelection" ||
          k === "@weeklyQuestSelection",
      ),
    );
  }, [commitTrips, commitClaims]);

  const dismissRewardEvent = useCallback(() => setRewardEvents((q) => q.slice(1)), []);
  const dismissMainQuestEvent = useCallback(() => setMainQuestEvent(null), []);

  // ── Derived values ──
  const value = useMemo<AppDataContextValue>(() => {
    const xp = totalXP(trips, claims);
    const level = calculateLevel(xp);
    return {
      isLoaded,
      trips,
      claims,
      profile,
      xp,
      level,
      levelXP: calculateCurrentLevelXP(xp, level),
      levelXPNeeded: calculateXPForNextLevel(level),
      streak: computeStreak(trips),
      ticketProgress: computeTicketProgress(trips, profile.ticket),
      periodKey: ticketPeriodKey(profile.ticket),
      rewardEvents,
      dismissRewardEvent,
      mainQuestEvent,
      dismissMainQuestEvent,
      addTrip,
      updateTrip,
      deleteTrip,
      mergeTrips,
      isClaimed,
      claimReward,
      updateProfile,
      deleteAllTrips,
      reload,
    };
  }, [
    isLoaded,
    trips,
    claims,
    profile,
    rewardEvents,
    dismissRewardEvent,
    mainQuestEvent,
    dismissMainQuestEvent,
    addTrip,
    updateTrip,
    deleteTrip,
    mergeTrips,
    isClaimed,
    claimReward,
    updateProfile,
    deleteAllTrips,
    reload,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
