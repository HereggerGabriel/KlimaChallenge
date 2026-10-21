// Single source of truth for trips, claimed rewards and the user's profile.
// Every screen reads and changes data through this store, so XP, level,
// streak and ticket progress are always computed from the same data.
//
// Cloud backup: every change is saved on the phone first and queued in an
// outbox; a background sync uploads the outbox and downloads what changed on
// the server (see utils/syncLogic.ts). The app works the same offline.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trip } from "@/types/trip";
import { signOutAndClearLocalData } from "@/lib/auth";
import {
  currentSyncUser,
  downloadChanges,
  onSyncUserChange,
  SyncError,
  SyncUser,
  uploadOutbox,
} from "@/services/cloudSync";
import {
  applyRemote,
  decideAccount,
  EMPTY_OUTBOX,
  latestSyncedAt,
  OLDEST,
  Outbox,
  outboxSize,
  queueClaimDeletes,
  queueClaims,
  queueEverything,
  queueProfile,
  queueTripDeletes,
  queueTrips,
  removeUploaded,
} from "@/utils/syncLogic";
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
const OUTBOX_KEY = "@syncOutbox";
const SYNC_META_KEY = "@syncMeta";

// ── Sync timing ──
/** Wait this long after a change, so a burst of edits goes up in one request. */
const SYNC_DELAY_MS = 1500;
/** After a failed sync, try again after these delays (the last one repeats). */
const RETRY_DELAYS_MS = [15_000, 60_000, 300_000];

/** Whose data is on this phone, and up to which server time it has been downloaded. */
interface SyncMeta {
  userId: string | null;
  cursor: string | null;
}
const EMPTY_META: SyncMeta = { userId: null, cursor: null };

export interface SyncStatus {
  /** True when the last sync failed and something is actually missing from the
   *  backup (changes waiting) or from the phone (account not downloaded yet). */
  failed: boolean;
  /** Changes on this phone that are not uploaded yet. */
  pending: number;
}
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
  /** Re-reads everything from storage. */
  reload: () => Promise<void>;
  // Cloud backup
  syncStatus: SyncStatus;
  /** Syncs right away and resolves when done. */
  syncNow: () => Promise<SyncStatus>;
  /** Set after logging in to an existing account while this phone has trips. */
  pendingMerge: { tripCount: number } | null;
  /** true: add this phone's trips to the account; false: keep only the account's data. */
  resolveMerge: (keepLocalTrips: boolean) => Promise<void>;
  /** Signs out and removes all data from this phone. */
  logOut: () => Promise<void>;
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

async function loadSyncData(): Promise<{ outbox: Outbox; meta: SyncMeta }> {
  const [outbox, meta] = await Promise.all([
    readJson<Outbox>(OUTBOX_KEY, EMPTY_OUTBOX),
    readJson<SyncMeta>(SYNC_META_KEY, EMPTY_META),
  ]);
  return { outbox: { ...EMPTY_OUTBOX, ...outbox }, meta: { ...EMPTY_META, ...meta } };
}

/** Local reward flags and quest choices that belong to the old data. */
async function clearLocalRewardFlags(): Promise<void> {
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
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);
  const [mainQuestEvent, setMainQuestEvent] = useState<MainQuestEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ failed: false, pending: 0 });
  const [pendingMerge, setPendingMerge] = useState<{ userId: string; tripCount: number } | null>(
    null,
  );

  // Latest state for actions, so consecutive calls never work on stale data.
  const state = useRef({ trips, claims, profile });
  state.current = { trips, claims, profile };
  const eventId = useRef(0);
  // Outbox and sync position; only the counts are React state.
  const syncData = useRef<{ outbox: Outbox; meta: SyncMeta }>({
    outbox: EMPTY_OUTBOX,
    meta: EMPTY_META,
  });
  const syncRun = useRef({
    running: null as Promise<void> | null,
    again: false,
    paused: false,
    mounted: true,
    failed: false,
    retries: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  const saveSyncData = useCallback(async () => {
    const { outbox, meta } = syncData.current;
    setSyncStatus((s) => ({ ...s, pending: outboxSize(outbox) }));
    await AsyncStorage.multiSet([
      [OUTBOX_KEY, JSON.stringify(outbox)],
      [SYNC_META_KEY, JSON.stringify(meta)],
    ]);
  }, []);

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

  const commitProfile = useCallback(async (next: Profile) => {
    state.current = { ...state.current, profile: next };
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }, []);

  /** Sets state and storage for all given parts at once. */
  const commitAll = useCallback(
    async (next: { trips?: Trip[]; claims?: RewardClaim[]; profile?: Profile }) => {
      await Promise.all([
        next.trips && commitTrips(next.trips),
        next.claims && commitClaims(next.claims),
        next.profile && commitProfile(next.profile),
      ]);
    },
    [commitTrips, commitClaims, commitProfile],
  );

  // ── Sync ──
  // syncRound schedules retries through runSync, which is defined after it.
  const runSyncRef = useRef<() => Promise<void>>(() => Promise.resolve());

  /** One round: settle whose data this is, upload the outbox, download changes. */
  const syncRound = useCallback(async () => {
    const run = syncRun.current;
    let user: SyncUser | null = null;
    try {
      user = await currentSyncUser();
      if (!user) {
        // Not signed in (offline on first launch); the splash screen retries.
        if (outboxSize(syncData.current.outbox) > 0) throw new SyncError("Not signed in");
        return;
      }

      const decision = decideAccount(
        syncData.current.meta.userId,
        user,
        state.current.trips.length,
      );
      if (decision === "ask") {
        const id = user.id;
        const tripCount = state.current.trips.length;
        // Same question again (another round): keep the object, so it isn't asked twice.
        setPendingMerge((prev) =>
          prev?.userId === id && prev.tripCount === tripCount ? prev : { userId: id, tripCount },
        );
        return; // nothing is synced until the user answers
      }
      if (decision === "adopt") {
        // Keep everything on the phone and upload it. The profile goes in as
        // "oldest" so a profile the account already has is not overwritten.
        const now = new Date().toISOString();
        const { trips: t, claims: c, profile: p } = state.current;
        syncData.current = {
          outbox: queueProfile(
            queueClaims(queueTrips(syncData.current.outbox, t, now), c, now),
            p,
            OLDEST,
          ),
          meta: { userId: user.id, cursor: null },
        };
        await saveSyncData();
      }
      if (decision === "switch") {
        await commitAll({ trips: [], claims: [] });
        await clearLocalRewardFlags();
        syncData.current = {
          outbox: queueProfile(EMPTY_OUTBOX, state.current.profile, OLDEST),
          meta: { userId: user.id, cursor: null },
        };
        await saveSyncData();
      }

      const uploading = syncData.current.outbox;
      if (outboxSize(uploading) > 0) {
        await uploadOutbox(user.id, uploading);
        if (syncData.current.meta.userId !== user.id) return; // account changed meanwhile
        syncData.current.outbox = removeUploaded(syncData.current.outbox, uploading);
        await saveSyncData();
      }

      const remote = await downloadChanges(user.id, syncData.current.meta.cursor);
      if (syncData.current.meta.userId !== user.id) return;
      // From here to commitAll nothing awaits, so no local edit can slip in between.
      const { data, outbox, changed } = applyRemote(state.current, syncData.current.outbox, remote);
      syncData.current = {
        outbox,
        meta: { userId: user.id, cursor: latestSyncedAt(syncData.current.meta.cursor, remote) },
      };
      if (changed) {
        await commitAll({
          trips: sortTripsNewestFirst(data.trips),
          claims: data.claims,
          profile: { ...DEFAULT_PROFILE, ...data.profile },
        });
      }
      await saveSyncData();

      run.failed = false;
      run.retries = 0;
      setSyncStatus({ failed: false, pending: outboxSize(syncData.current.outbox) });
    } catch (e) {
      if (!(e instanceof SyncError)) console.warn("Cloud backup failed:", e);
      // Only worth showing when something is missing: changes not uploaded,
      // or an account whose data hasn't arrived on this phone yet.
      const { outbox, meta } = syncData.current;
      const failed =
        outboxSize(outbox) > 0 || (meta.cursor === null && !!user && !user.isAnonymous);
      run.failed = failed;
      setSyncStatus({ failed, pending: outboxSize(outbox) });
      run.again = false; // don't hammer a dead connection; retry on a timer
      const delay = RETRY_DELAYS_MS[Math.min(run.retries, RETRY_DELAYS_MS.length - 1)];
      run.retries++;
      if (run.mounted) {
        if (run.timer) clearTimeout(run.timer);
        run.timer = setTimeout(() => runSyncRef.current(), delay);
      }
    }
  }, [saveSyncData, commitAll]);

  /**
   * Starts a sync, or asks the running one to go another round. Resolves when
   * all requested rounds are done.
   */
  const runSync = useCallback((): Promise<void> => {
    const run = syncRun.current;
    if (run.paused || !run.mounted) return Promise.resolve();
    run.again = true;
    if (!run.running) {
      run.running = (async () => {
        try {
          while (run.again && !run.paused && run.mounted) {
            run.again = false;
            await syncRound();
          }
        } finally {
          run.running = null;
        }
      })();
    }
    return run.running;
  }, [syncRound]);
  runSyncRef.current = runSync;

  /** Sync a moment after a local change. */
  const scheduleSync = useCallback(() => {
    const run = syncRun.current;
    if (run.timer) clearTimeout(run.timer);
    run.timer = setTimeout(() => runSync(), SYNC_DELAY_MS);
  }, [runSync]);

  /** Records a local change for upload. */
  const queue = useCallback(
    async (change: (outbox: Outbox, now: string) => Outbox) => {
      syncData.current = {
        ...syncData.current,
        outbox: change(syncData.current.outbox, new Date().toISOString()),
      };
      await saveSyncData();
      scheduleSync();
    },
    [saveSyncData, scheduleSync],
  );

  const reload = useCallback(async () => {
    const [t, c, p, s] = await Promise.all([
      loadTrips(),
      loadClaims(),
      loadProfile(),
      loadSyncData(),
    ]);
    state.current = { trips: t, claims: c, profile: p };
    syncData.current = s;
    setTrips(t);
    setClaims(c);
    setProfile(p);
    setPendingMerge(null);
    setSyncStatus({ failed: false, pending: outboxSize(s.outbox) });
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const run = syncRun.current;
    run.mounted = true;
    reload().then(() => runSync());

    // A different user signed in (login, new anonymous session): sync for them.
    let lastUserId: string | null | undefined;
    const unsubscribe = onSyncUserChange((user) => {
      const id = user?.id ?? null;
      if (id !== lastUserId && lastUserId !== undefined) runSync();
      lastUserId = id;
    });
    // Back in the app: pick up changes from other phones, retry failed uploads.
    const appState = AppState.addEventListener("change", (s) => {
      if (s === "active") runSync();
    });

    return () => {
      run.mounted = false;
      if (run.timer) clearTimeout(run.timer);
      unsubscribe();
      appState.remove();
    };
  }, [reload, runSync]);

  const syncNow = useCallback(async (): Promise<SyncStatus> => {
    const run = syncRun.current;
    if (run.timer) clearTimeout(run.timer);
    await runSync();
    return { failed: run.failed, pending: outboxSize(syncData.current.outbox) };
  }, [runSync]);

  /** Moves this phone to the account that just logged in. */
  const resolveMerge = useCallback(
    async (keepLocalTrips: boolean) => {
      const merge = pendingMerge;
      if (!merge) return;
      const now = new Date().toISOString();
      if (keepLocalTrips) {
        // Trip IDs are UUIDs, so the account's trips and these never collide.
        syncData.current = {
          outbox: queueEverything(state.current, now, OLDEST),
          meta: { userId: merge.userId, cursor: null },
        };
      } else {
        await commitAll({ trips: [], claims: [] });
        await clearLocalRewardFlags();
        syncData.current = {
          outbox: queueProfile(EMPTY_OUTBOX, state.current.profile, OLDEST),
          meta: { userId: merge.userId, cursor: null },
        };
      }
      await saveSyncData();
      setPendingMerge(null);
      await runSync();
    },
    [pendingMerge, commitAll, saveSyncData, runSync],
  );

  const logOut = useCallback(async () => {
    const run = syncRun.current;
    run.paused = true; // no sync may upload the old data to the next session
    if (run.timer) clearTimeout(run.timer);
    try {
      if (run.running) await run.running;
      await signOutAndClearLocalData();
      await reload();
    } finally {
      run.paused = false;
    }
  }, [reload]);

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
      const trip: Trip = { ...data, id: generateTripId() };
      const newTrips = sortTripsNewestFirst([trip, ...oldTrips]);
      const xpBefore = totalXP(oldTrips, oldClaims);
      await commitTrips(newTrips);
      emitReward(xpBefore, totalXP(newTrips, oldClaims));

      // Streak milestones are awarded automatically when reached.
      const claimedDays = new Set(
        oldClaims.filter((c) => c.kind === "streak").map((c) => Number(c.key.split(":")[1])),
      );
      const { milestones } = getNewMilestoneXP(computeStreak(newTrips), claimedDays);
      const added: RewardClaim[] = [];
      if (milestones.length > 0) {
        const now = new Date().toISOString();
        added.push(
          ...milestones.map((days) => ({
            key: rewardKey.streak(days),
            kind: "streak" as const,
            xp: STREAK_MILESTONES.find((m) => m.days === days)?.xp ?? 0,
            claimedAt: now,
          })),
        );
        const xpMid = totalXP(newTrips, oldClaims);
        const newClaims = [...oldClaims, ...added];
        await commitClaims(newClaims);
        emitReward(xpMid, totalXP(newTrips, newClaims));
      }
      await queue((o, now) => queueClaims(queueTrips(o, [trip], now), added, now));

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
    [commitTrips, commitClaims, emitReward, queue],
  );

  const updateTrip = useCallback(
    async (id: string, updates: Partial<Omit<Trip, "id">>) => {
      const next = sortTripsNewestFirst(
        state.current.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
      await commitTrips(next);
      const changed = next.find((t) => t.id === id);
      if (changed) await queue((o, now) => queueTrips(o, [changed], now));
    },
    [commitTrips, queue],
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      const removed = state.current.trips.filter((t) => t.id === id);
      await commitTrips(state.current.trips.filter((t) => t.id !== id));
      await queue((o, now) => queueTripDeletes(o, removed, now));
    },
    [commitTrips, queue],
  );

  const mergeTrips = useCallback(
    async (incoming: Trip[]) => {
      const existing = state.current.trips;
      const ids = new Set(existing.map((t) => t.id));
      const fresh = incoming.filter((t) => !ids.has(t.id));
      if (fresh.length > 0) {
        await commitTrips(sortTripsNewestFirst([...fresh, ...existing]));
        await queue((o, now) => queueTrips(o, fresh, now));
      }
      return { added: fresh.length, skipped: incoming.length - fresh.length };
    },
    [commitTrips, queue],
  );

  const isClaimed = useCallback((key: string) => claims.some((c) => c.key === key), [claims]);

  const claimReward = useCallback(
    async (key: string, kind: RewardKind, xp: number) => {
      const { trips: t, claims: oldClaims } = state.current;
      if (oldClaims.some((c) => c.key === key)) return;
      const claim: RewardClaim = { key, kind, xp, claimedAt: new Date().toISOString() };
      const newClaims = [...oldClaims, claim];
      const before = totalXP(t, oldClaims);
      await commitClaims(newClaims);
      emitReward(before, totalXP(t, newClaims));
      await queue((o, now) => queueClaims(o, [claim], now));
    },
    [commitClaims, emitReward, queue],
  );

  const updateProfile = useCallback(
    async (changes: Partial<Profile>) => {
      const current = state.current.profile;
      const next: Profile = {
        ...current,
        ...changes,
        ticket: { ...current.ticket, ...changes.ticket },
      };
      await commitProfile(next);
      await queue((o, now) => queueProfile(o, next, now));
    },
    [commitProfile, queue],
  );

  const deleteAllTrips = useCallback(async () => {
    const { trips: oldTrips, claims: oldClaims } = state.current;
    await commitAll({ trips: [], claims: [] });
    await clearLocalRewardFlags();
    await queue((o, now) => queueClaimDeletes(queueTripDeletes(o, oldTrips, now), oldClaims, now));
  }, [commitAll, queue]);

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
      syncStatus,
      syncNow,
      pendingMerge: pendingMerge ? { tripCount: pendingMerge.tripCount } : null,
      resolveMerge,
      logOut,
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
    syncStatus,
    syncNow,
    pendingMerge,
    resolveMerge,
    logOut,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
