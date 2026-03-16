import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ThemedText';
import { Palette } from '@/constants/Colors';
import { loadTrips } from '@/services/tripStorage';
import { Trip } from '@/types/trip';
import {
  calculateLevel,
  calculateCurrentLevelXP,
  calculateXPForNextLevel,
  addXP,
} from '@/utils/levelSystem';
import {
  DAILY_QUEST_POOL,
  WEEKLY_QUEST_POOL,
  MILESTONE_QUESTS,
  Quest,
  getClaimKey,
  pickRandomQuests,
  timeUntilMidnight,
  daysUntilMonday,
  QUESTS_PER_ROTATION,
  MAIN_QUEST_ID,
  MAIN_QUEST_XP,
} from '@/utils/questSystem';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  Achievement,
  computeStreak,
  computeSavedVsCar,
} from '@/utils/achievementSystem';
import { XPToast } from '@/components/ui/XPToast';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';

const CLAIMED_QUESTS_KEY = '@claimedQuests';
const CLAIMED_ACHIEVEMENTS_KEY = '@claimedAchievements';
const DAILY_SELECTION_KEY = '@dailyQuestSelection';
const WEEKLY_SELECTION_KEY = '@weeklyQuestSelection';

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStartKey(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split('T')[0];
}

async function loadOrRefreshSelection(
  storageKey: string,
  periodKey: string,
  pool: Quest[],
): Promise<Quest[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const { period, ids } = JSON.parse(raw) as { period: string; ids: string[] };
      if (period === periodKey) {
        const quests = ids.map((id) => pool.find((q) => q.id === id)).filter(Boolean) as Quest[];
        if (quests.length === QUESTS_PER_ROTATION) return quests;
      }
    }
  } catch { /* ignore */ }
  // Generate fresh random selection
  const selected = pickRandomQuests(pool, QUESTS_PER_ROTATION);
  await AsyncStorage.setItem(storageKey, JSON.stringify({ period: periodKey, ids: selected.map((q) => q.id) }));
  return selected;
}

type Tab = 'quests' | 'achievements';

// ── Main quest featured card ─────────────────────────────────────────────────

function MainQuestFeaturedCard({
  totalCost,
  klimaTicketCost,
  claimed,
  onClaim,
}: {
  totalCost: number;
  klimaTicketCost: number;
  claimed: boolean;
  onClaim: () => void;
}) {
  const pct = Math.min((totalCost / klimaTicketCost) * 100, 100);
  const complete = totalCost >= klimaTicketCost;

  return (
    <View style={styles.mainQuestCard}>
      <View style={styles.mainQuestBadgeRow}>
        <View style={styles.mainQuestBadge}>
          <ThemedText style={styles.mainQuestBadgeText}>MAIN QUEST</ThemedText>
        </View>
        <View style={[styles.xpBadge, { backgroundColor: Palette.red.light + '33' }]}>
          <ThemedText style={[styles.xpBadgeText, { color: Palette.red.light }]}>
            +{MAIN_QUEST_XP} XP
          </ThemedText>
        </View>
      </View>

      <View style={styles.mainQuestBody}>
        <MaterialIcons name="emoji-events" size={36} color={Palette.red.light} />
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.mainQuestTitle}>KlimaTicket Break-Even</ThemedText>
          <ThemedText style={styles.mainQuestDesc}>
            Log trips worth the full cost of your climate pass
          </ThemedText>
        </View>
      </View>

      <View style={styles.mainQuestStats}>
        <ThemedText style={styles.mainQuestStatValue}>
          €{totalCost.toFixed(0)}
          <ThemedText style={styles.mainQuestStatOf}> / €{klimaTicketCost.toFixed(0)}</ThemedText>
        </ThemedText>
      </View>

      <View style={styles.mainQuestProgressBar}>
        <View style={[styles.mainQuestProgressFill, { width: `${pct}%` as any }]} />
      </View>

      <View style={styles.mainQuestFooter}>
        <ThemedText style={styles.mainQuestPct}>{pct.toFixed(0)}% covered</ThemedText>
        {claimed ? (
          <View style={styles.mainQuestClaimed}>
            <MaterialIcons name="check-circle" size={16} color={Palette.green.mid} />
            <ThemedText style={styles.mainQuestClaimedText}>Claimed</ThemedText>
          </View>
        ) : complete ? (
          <TouchableOpacity style={styles.mainQuestClaimButton} onPress={onClaim} activeOpacity={0.85}>
            <MaterialIcons name="bolt" size={15} color="#fff" />
            <ThemedText style={styles.mainQuestClaimText}>CLAIM {MAIN_QUEST_XP} XP</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ── Quest card ──────────────────────────────────────────────────────────────

function QuestCard({
  quest,
  trips,
  claimed,
  onClaim,
}: {
  quest: Quest;
  trips: Trip[];
  claimed: boolean;
  onClaim: (quest: Quest) => void;
}) {
  const { current, target } = quest.computeProgress(trips);
  const completed = current >= target;
  const progress = Math.min(current / target, 1);

  const typeColor =
    quest.type === 'daily'
      ? Palette.blue.light
      : quest.type === 'weekly'
        ? Palette.green.mid
        : Palette.red.light;

  return (
    <View style={[styles.questCard, claimed && styles.questCardClaimed]}>
      <View style={[styles.questIconWrap, { backgroundColor: typeColor + '22' }]}>
        <MaterialIcons
          name={quest.icon as any}
          size={22}
          color={claimed ? 'rgba(255,255,255,0.3)' : typeColor}
        />
      </View>

      <View style={styles.questBody}>
        <View style={styles.questTitleRow}>
          <ThemedText style={[styles.questTitle, claimed && styles.questTitleClaimed]}>
            {quest.title}
          </ThemedText>
          <View style={[styles.xpBadge, { backgroundColor: typeColor + '33' }]}>
            <ThemedText style={[styles.xpBadgeText, { color: typeColor }]}>
              +{quest.xpReward} XP
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.questDesc}>{quest.description}</ThemedText>

        <View style={styles.questProgressRow}>
          <View style={styles.questProgressBar}>
            <View
              style={[
                styles.questProgressFill,
                { width: `${progress * 100}%` as any, backgroundColor: typeColor },
              ]}
            />
          </View>
          <ThemedText style={styles.questProgressText}>
            {current}/{target}
          </ThemedText>
        </View>
      </View>

      <View style={styles.questAction}>
        {claimed ? (
          <MaterialIcons name="check-circle" size={26} color={Palette.green.mid} />
        ) : completed ? (
          <TouchableOpacity style={styles.claimButton} onPress={() => onClaim(quest)}>
            <ThemedText style={styles.claimButtonText}>CLAIM</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ── Achievement card ────────────────────────────────────────────────────────

function AchievementCard({
  achievement,
  trips,
  streak,
  savedVsCar,
  claimed,
  onClaim,
}: {
  achievement: Achievement;
  trips: Trip[];
  streak: number;
  savedVsCar: number;
  claimed: boolean;
  onClaim: (a: Achievement) => void;
}) {
  const { current, target } = achievement.computeProgress(trips, streak, savedVsCar);
  const completed = current >= target;
  const progress = Math.min(current / target, 1);
  const locked = !completed && !claimed;

  const catColor =
    achievement.category === 'distance'
      ? Palette.blue.light
      : achievement.category === 'transport'
        ? Palette.blue.mid
        : achievement.category === 'streak'
          ? Palette.red.light
          : achievement.category === 'savings'
            ? Palette.green.mid
            : Palette.green.light;

  return (
    <View style={[styles.achCard, claimed && styles.achCardClaimed]}>
      {/* Icon */}
      <View style={[styles.achIconWrap, { backgroundColor: catColor + '22', opacity: locked ? 0.5 : 1 }]}>
        <MaterialIcons
          name={achievement.icon as any}
          size={28}
          color={locked ? 'rgba(255,255,255,0.3)' : catColor}
        />
        {locked && (
          <View style={styles.lockOverlay}>
            <MaterialIcons name="lock" size={12} color="rgba(255,255,255,0.5)" />
          </View>
        )}
      </View>

      {/* Title */}
      <ThemedText style={[styles.achTitle, locked && styles.achTitleLocked]} numberOfLines={1}>
        {achievement.title}
      </ThemedText>

      {/* Description */}
      <ThemedText style={styles.achDesc} numberOfLines={2}>
        {achievement.description}
      </ThemedText>

      {/* Progress bar */}
      <View style={styles.achProgressBar}>
        <View
          style={[
            styles.achProgressFill,
            { width: `${progress * 100}%` as any, backgroundColor: catColor },
          ]}
        />
      </View>
      <ThemedText style={styles.achProgressText}>
        {current}/{target}
      </ThemedText>

      {/* XP badge + claim */}
      <View style={styles.achFooter}>
        <View style={[styles.xpBadge, { backgroundColor: catColor + '33' }]}>
          <ThemedText style={[styles.xpBadgeText, { color: catColor }]}>
            +{achievement.xpReward} XP
          </ThemedText>
        </View>
        {claimed ? (
          <MaterialIcons name="check-circle" size={18} color={Palette.green.mid} />
        ) : completed ? (
          <TouchableOpacity style={styles.claimButtonSmall} onPress={() => onClaim(achievement)}>
            <ThemedText style={styles.claimButtonText}>CLAIM</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  label,
  subtitle,
  count,
}: {
  label: string;
  subtitle?: string;
  count?: { claimed: number; total: number };
}) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionLabel}>{label}</ThemedText>
      {subtitle ? <ThemedText style={styles.sectionSubtitle}>{subtitle}</ThemedText> : null}
      {count !== undefined && (
        <ThemedText style={[styles.sectionSubtitle, styles.sectionCount]}>
          <ThemedText style={{ color: count.claimed > 0 ? Palette.green.mid : 'rgba(255,255,255,0.3)' }}>
            {count.claimed}
          </ThemedText>
          <ThemedText style={{ color: 'rgba(255,255,255,0.3)' }}>/{count.total}</ThemedText>
        </ThemedText>
      )}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function QuestsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>(tab === 'achievements' ? 'achievements' : 'quests');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [claimedKeys, setClaimedKeys] = useState<Set<string>>(new Set());
  const [claimedAchievements, setClaimedAchievements] = useState<Set<string>>(new Set());
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ level: number } | null>(null);
  const [klimaTicketCost, setKlimaTicketCost] = useState(1400);
  const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<Quest[]>([]);

  useEffect(() => {
    const init = async () => {
      const [loaded, storedXP, rawClaimed, rawAch, daily, weekly, storedTicketCost] = await Promise.all([
        loadTrips(),
        AsyncStorage.getItem('userXP'),
        AsyncStorage.getItem(CLAIMED_QUESTS_KEY),
        AsyncStorage.getItem(CLAIMED_ACHIEVEMENTS_KEY),
        loadOrRefreshSelection(DAILY_SELECTION_KEY, getTodayKey(), DAILY_QUEST_POOL),
        loadOrRefreshSelection(WEEKLY_SELECTION_KEY, getWeekStartKey(), WEEKLY_QUEST_POOL),
        AsyncStorage.getItem('klimaTicketCost'),
      ]);

      setTrips(loaded);
      const xp = storedXP ? parseInt(storedXP) : 0;
      setUserXP(isNaN(xp) ? 0 : xp);
      setUserLevel(calculateLevel(isNaN(xp) ? 0 : xp));
      setDailyQuests(daily);
      setWeeklyQuests(weekly);
      if (storedTicketCost) {
        const parsed = parseFloat(storedTicketCost);
        if (!isNaN(parsed) && parsed > 0) setKlimaTicketCost(parsed);
      }

      if (rawClaimed) {
        try { setClaimedKeys(new Set(JSON.parse(rawClaimed))); } catch { /* ignore */ }
      }
      if (rawAch) {
        try { setClaimedAchievements(new Set(JSON.parse(rawAch))); } catch { /* ignore */ }
      }

      setIsLoading(false);
    };
    init();
  }, []);

  const awardXP = useCallback(async (amount: number) => {
    const newXP = addXP(userXP, amount);
    const newLevel = calculateLevel(newXP);
    await AsyncStorage.setItem('userXP', newXP.toString());
    setUserXP(newXP);
    setXpGained(amount);
    if (newLevel > userLevel) setLevelUpData({ level: newLevel });
    setUserLevel(newLevel);
  }, [userXP, userLevel]);

  const handleClaimQuest = useCallback(async (quest: Quest) => {
    const key = getClaimKey(quest);
    if (claimedKeys.has(key)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = new Set(claimedKeys).add(key);
    setClaimedKeys(next);
    await AsyncStorage.setItem(CLAIMED_QUESTS_KEY, JSON.stringify([...next]));
    await awardXP(quest.xpReward);
  }, [claimedKeys, awardXP]);

  const handleClaimAchievement = useCallback(async (achievement: Achievement) => {
    if (claimedAchievements.has(achievement.id)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = new Set(claimedAchievements).add(achievement.id);
    setClaimedAchievements(next);
    await AsyncStorage.setItem(CLAIMED_ACHIEVEMENTS_KEY, JSON.stringify([...next]));
    await awardXP(achievement.xpReward);
  }, [claimedAchievements, awardXP]);

  const handleClaimMainQuest = useCallback(async () => {
    if (claimedKeys.has(MAIN_QUEST_ID)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = new Set(claimedKeys).add(MAIN_QUEST_ID);
    setClaimedKeys(next);
    await AsyncStorage.setItem(CLAIMED_QUESTS_KEY, JSON.stringify([...next]));
    await awardXP(MAIN_QUEST_XP);
  }, [claimedKeys, awardXP]);

  const totalCost = trips.reduce((sum, t) => sum + t.cost, 0);
  const mainQuestComplete = totalCost >= klimaTicketCost;
  const mainQuestClaimed = claimedKeys.has(MAIN_QUEST_ID);

  const streak = computeStreak(trips);
  const savedVsCar = computeSavedVsCar(trips);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color={Palette.green.mid} style={{ flex: 1 }} />
      </View>
    );
  }

  const currentLevelXP = calculateCurrentLevelXP(userXP, userLevel);
  const xpToNext = calculateXPForNextLevel(userLevel);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="chevron-left" size={30} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Quests & Achievements</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* XP summary */}
        <View style={styles.xpSummary}>
          <ThemedText style={styles.xpSummaryLevel}>Level {userLevel}</ThemedText>
          <ThemedText style={styles.xpSummaryXP}>
            {currentLevelXP} / {xpToNext} XP
          </ThemedText>
        </View>

        {/* Segmented control */}
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segButton, activeTab === 'quests' && styles.segButtonActive]}
            onPress={() => setActiveTab('quests')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="assignment"
              size={16}
              color={activeTab === 'quests' ? '#fff' : 'rgba(255,255,255,0.45)'}
            />
            <ThemedText
              style={[styles.segLabel, activeTab === 'quests' && styles.segLabelActive]}
            >
              Quests
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segButton, activeTab === 'achievements' && styles.segButtonActive]}
            onPress={() => setActiveTab('achievements')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="emoji-events"
              size={16}
              color={activeTab === 'achievements' ? '#fff' : 'rgba(255,255,255,0.45)'}
            />
            <ThemedText
              style={[styles.segLabel, activeTab === 'achievements' && styles.segLabelActive]}
            >
              Achievements
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* ── Quests tab ── */}
        {activeTab === 'quests' && (
          <View>
            {trips.length === 0 && (
              <View style={styles.emptyBanner}>
                <MaterialIcons name="directions-transit" size={20} color={Palette.blue.light} />
                <ThemedText style={styles.emptyBannerText}>
                  Log your first trip to start making quest progress
                </ThemedText>
              </View>
            )}
            <MainQuestFeaturedCard
              totalCost={totalCost}
              klimaTicketCost={klimaTicketCost}
              claimed={mainQuestClaimed}
              onClaim={handleClaimMainQuest}
            />

            <SectionHeader
              label="Daily"
              subtitle={`${QUESTS_PER_ROTATION} of ${DAILY_QUEST_POOL.length} · Resets in ${timeUntilMidnight()}`}
              count={{
                claimed: dailyQuests.filter((q) => claimedKeys.has(getClaimKey(q))).length,
                total: QUESTS_PER_ROTATION,
              }}
            />
            {dailyQuests.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                trips={trips}
                claimed={claimedKeys.has(getClaimKey(q))}
                onClaim={handleClaimQuest}
              />
            ))}

            <SectionHeader
              label="Weekly"
              subtitle={`${QUESTS_PER_ROTATION} of ${WEEKLY_QUEST_POOL.length} · Resets in ${daysUntilMonday()}`}
              count={{
                claimed: weeklyQuests.filter((q) => claimedKeys.has(getClaimKey(q))).length,
                total: QUESTS_PER_ROTATION,
              }}
            />
            {weeklyQuests.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                trips={trips}
                claimed={claimedKeys.has(getClaimKey(q))}
                onClaim={handleClaimQuest}
              />
            ))}

            <SectionHeader
              label="Milestones"
              subtitle="One-time rewards"
              count={{
                claimed: MILESTONE_QUESTS.filter((q) => claimedKeys.has(getClaimKey(q))).length,
                total: MILESTONE_QUESTS.length,
              }}
            />
            {MILESTONE_QUESTS.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                trips={trips}
                claimed={claimedKeys.has(getClaimKey(q))}
                onClaim={handleClaimQuest}
              />
            ))}
          </View>
        )}

        {/* ── Achievements tab ── */}
        {activeTab === 'achievements' && (
          <View>
            {/* Total summary */}
            <View style={styles.achTotalRow}>
              <ThemedText style={styles.achTotalLabel}>Total</ThemedText>
              <ThemedText style={styles.achTotalValue}>
                <ThemedText style={{ color: claimedAchievements.size > 0 ? Palette.green.mid : 'rgba(255,255,255,0.55)' }}>
                  {claimedAchievements.size}
                </ThemedText>
                <ThemedText style={{ color: 'rgba(255,255,255,0.3)' }}>/{ACHIEVEMENTS.length}</ThemedText>
              </ThemedText>
            </View>

            {ACHIEVEMENT_CATEGORIES.map(({ key, label }) => {
              const items = ACHIEVEMENTS.filter((a) => a.category === key);
              const claimedCount = items.filter((a) => claimedAchievements.has(a.id)).length;
              return (
                <View key={key}>
                  <SectionHeader label={label} count={{ claimed: claimedCount, total: items.length }} />
                  <View style={styles.achGrid}>
                    {items.map((a) => (
                      <AchievementCard
                        key={a.id}
                        achievement={a}
                        trips={trips}
                        streak={streak}
                        savedVsCar={savedVsCar}
                        claimed={claimedAchievements.has(a.id)}
                        onClaim={handleClaimAchievement}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <XPToast xp={xpGained} onDone={() => setXpGained(null)} />
      <LevelUpOverlay
        visible={levelUpData !== null}
        newLevel={levelUpData?.level ?? 1}
        onDone={() => setLevelUpData(null)}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.blue.dark,
  },
  scrollContent: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // XP summary
  xpSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  xpSummaryLevel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  xpSummaryXP: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
  },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
  },
  segButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segButtonActive: {
    backgroundColor: Palette.green.mid,
  },
  segLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  segLabelActive: {
    color: '#fff',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  sectionCount: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
  },

  // Achievement total row
  achTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  achTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  achTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Quest card
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  questCardClaimed: {
    opacity: 0.5,
  },
  questIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questBody: {
    flex: 1,
    gap: 4,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  questTitleClaimed: {
    color: 'rgba(255,255,255,0.4)',
  },
  questDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  questProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  questProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  questProgressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    minWidth: 28,
    textAlign: 'right',
  },
  questAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },

  // XP badge (shared)
  xpBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Claim buttons
  claimButton: {
    backgroundColor: Palette.green.mid,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  claimButtonSmall: {
    backgroundColor: Palette.green.mid,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Achievement grid
  achGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  achCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  achCardClaimed: {
    borderColor: Palette.green.mid + '55',
    backgroundColor: 'rgba(63,178,143,0.07)',
  },
  achIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Palette.blue.dark,
    borderRadius: 8,
    padding: 2,
  },
  achTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  achTitleLocked: {
    color: 'rgba(255,255,255,0.35)',
  },
  achDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 15,
  },
  achProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  achProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  achProgressText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
  },
  achFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },

  // Empty banner
  emptyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.blue.mid + '22',
    borderWidth: 1,
    borderColor: Palette.blue.light + '33',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  emptyBannerText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
  },

  // Main quest featured card
  mainQuestCard: {
    backgroundColor: Palette.blue.mid,
    borderWidth: 1.5,
    borderColor: Palette.red.light + '66',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    gap: 12,
    shadowColor: Palette.red.light,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  mainQuestBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainQuestBadge: {
    backgroundColor: Palette.red.light + '22',
    borderWidth: 1,
    borderColor: Palette.red.light + '55',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mainQuestBadgeText: {
    color: Palette.red.light,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  mainQuestBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mainQuestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  mainQuestDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    lineHeight: 17,
  },
  mainQuestStats: {
    alignItems: 'flex-start',
  },
  mainQuestStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  mainQuestStatOf: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  mainQuestProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  mainQuestProgressFill: {
    height: '100%',
    backgroundColor: Palette.red.light,
    borderRadius: 3,
  },
  mainQuestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainQuestPct: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  mainQuestClaimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.red.light,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mainQuestClaimText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainQuestClaimed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mainQuestClaimedText: {
    fontSize: 12,
    color: Palette.green.mid,
    fontWeight: '700',
  },
});
