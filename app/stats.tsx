import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ThemedText';
import { Palette } from '@/constants/Colors';
import { loadTrips } from '@/services/tripStorage';
import { Trip } from '@/types/trip';
import { TRANSPORT_COLOR, transportIcon } from '@/constants/transport';

// ── CO2 constant ─────────────────────────────────────────────────────────────
// Car: ~0.21 kg CO2/km | Austrian PT avg: ~0.05 kg CO2/km → savings: 0.16 kg/km
const CO2_FACTOR = 0.16;

// ── ISO-week helpers ──────────────────────────────────────────────────────────

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`;
}

function getLastNWeekKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    keys.push(getISOWeek(d));
  }
  return keys;
}

function weekLabel(key: string): string {
  return `W${key.split('-W')[1]}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

const BAR_MAX_HEIGHT = 110;

function WeeklyBarChart({ data }: { data: { value: number; label: string }[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={barStyles.root}>
      {data.map((item, i) => {
        const barH = item.value > 0 ? Math.max((item.value / maxValue) * BAR_MAX_HEIGHT, 8) : 4;
        return (
          <View key={i} style={barStyles.col}>
            {item.value > 0 && (
              <ThemedText style={barStyles.valueLabel}>{item.value}</ThemedText>
            )}
            <View
              style={[
                barStyles.bar,
                {
                  height: barH,
                  backgroundColor: item.value > 0 ? Palette.green.mid : 'rgba(255,255,255,0.1)',
                },
              ]}
            />
            <ThemedText style={barStyles.weekLabel}>{item.label}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const barStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: BAR_MAX_HEIGHT + 40,
    paddingTop: 20,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  valueLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  weekLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
});

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  onLongPress,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color: string;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      onLongPress={onLongPress}
      activeOpacity={onLongPress ? 0.7 : 1}
      delayLongPress={400}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      {sub ? <ThemedText style={styles.statSub}>{sub}</ThemedText> : null}
    </TouchableOpacity>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <ThemedText style={styles.sectionTitle}>{children}</ThemedText>;
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [klimaTicketCost, setKlimaTicketCost] = useState(1400);
  const [isLoading, setIsLoading] = useState(true);
  const [co2TooltipVisible, setCo2TooltipVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [loaded, storedCost] = await Promise.all([
        loadTrips(),
        AsyncStorage.getItem('klimaTicketCost'),
      ]);
      setTrips(loaded);
      if (storedCost) {
        const parsed = parseFloat(storedCost);
        if (!isNaN(parsed) && parsed > 0) setKlimaTicketCost(parsed);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color={Palette.green.mid} style={{ flex: 1 }} />
      </View>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalTrips = trips.length;
  const totalDistance = Math.round(trips.reduce((s, t) => s + t.distance, 0));
  const totalCost = trips.reduce((s, t) => s + t.cost, 0);
  const avgCost = totalTrips > 0 ? totalCost / totalTrips : 0;
  const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;
  const co2Saved = totalDistance * CO2_FACTOR;
  const klimaPct = Math.min((totalCost / klimaTicketCost) * 100, 100);

  // Weekly bar chart — last 8 weeks
  const weekKeys = getLastNWeekKeys(8);
  const weekCounts = trips.reduce<Record<string, number>>((acc, t) => {
    const k = getISOWeek(new Date(t.date));
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const weeklyBarData = weekKeys.map((k) => ({
    value: weekCounts[k] || 0,
    label: weekLabel(k),
  }));

  // Transport breakdown
  const transportCounts = trips.reduce<Record<string, number>>((acc, t) => {
    acc[t.transportType] = (acc[t.transportType] || 0) + 1;
    return acc;
  }, {});
  const transportData = Object.entries(transportCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      pct: totalTrips > 0 ? (count / totalTrips) * 100 : 0,
      color: TRANSPORT_COLOR[type] ?? Palette.blue.mid,
    }));

  // Top routes
  const routeCounts = trips.reduce<Record<string, number>>((acc, t) => {
    if (t.origin && t.destination) {
      const key = `${t.origin} → ${t.destination}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});
  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="chevron-left" size={30} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Stats & Insights</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Overview cards ── */}
        <View style={styles.cardGrid}>
          <StatCard
            icon="directions-transit"
            label="Total Trips"
            value={totalTrips.toString()}
            color={Palette.green.mid}
          />
          <StatCard
            icon="route"
            label="Total Distance"
            value={`${totalDistance} km`}
            sub={`~${avgDistance.toFixed(1)} km/trip`}
            color={Palette.blue.light}
          />
          <StatCard
            icon="eco"
            label="CO₂ Saved"
            value={`${co2Saved.toFixed(1)} kg`}
            sub="vs driving a car"
            color={Palette.green.light}
            onLongPress={() => setCo2TooltipVisible((v) => !v)}
          />
          <StatCard
            icon="euro"
            label="Avg Cost/Trip"
            value={`€${avgCost.toFixed(2)}`}
            sub={`€${totalCost.toFixed(0)} total`}
            color={Palette.red.light}
          />
        </View>

        {/* CO2 tooltip */}
        {co2TooltipVisible && (
          <View style={styles.tooltip}>
            <MaterialIcons name="info-outline" size={14} color={Palette.green.light} style={{ marginTop: 1 }} />
            <ThemedText style={styles.tooltipText}>
              Estimated savings vs car: car emits ~0.21 kg CO₂/km, Austrian public transport ~0.05 kg/km. Difference: 0.16 kg/km × {totalDistance} km = {co2Saved.toFixed(1)} kg CO₂ saved.
            </ThemedText>
          </View>
        )}

        {/* ── KlimaTicket progress ── */}
        <View style={styles.card}>
          <View style={styles.klimaHeader}>
            <View>
              <ThemedText style={styles.klimaTitle}>KlimaTicket Progress</ThemedText>
              <ThemedText style={styles.klimaSub}>
                €{totalCost.toFixed(0)} covered of €{klimaTicketCost.toFixed(0)}
              </ThemedText>
            </View>
            <ThemedText style={[styles.klimaPct, { color: klimaPct >= 100 ? Palette.green.mid : '#fff' }]}>
              {klimaPct.toFixed(0)}%
            </ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${klimaPct}%` as any,
                  backgroundColor: klimaPct >= 100 ? Palette.green.mid : Palette.blue.light,
                },
              ]}
            />
          </View>
          {klimaPct >= 100 ? (
            <ThemedText style={styles.klimaDone}>Break-even reached!</ThemedText>
          ) : (
            <ThemedText style={styles.klimaRemaining}>
              €{(klimaTicketCost - totalCost).toFixed(0)} remaining to break even
            </ThemedText>
          )}
        </View>

        {/* ── Weekly activity ── */}
        <SectionTitle>Weekly Activity</SectionTitle>
        <View style={styles.card}>
          <WeeklyBarChart data={weeklyBarData} />
          <ThemedText style={styles.chartLabel}>Trips per week (last 8 weeks)</ThemedText>
        </View>

        {/* ── Transport mix ── */}
        {transportData.length > 0 && (
          <>
            <SectionTitle>Transport Mix</SectionTitle>
            <View style={styles.card}>
              {transportData.map((item) => (
                <View key={item.type} style={styles.transportRow}>
                  <View style={styles.transportLabelWrap}>
                    <MaterialIcons name={typeIcon(item.type) as any} size={16} color={item.color} />
                    <ThemedText style={styles.transportLabel}>{item.type}</ThemedText>
                  </View>
                  <View style={styles.transportBarWrap}>
                    <View style={styles.transportBarTrack}>
                      <View
                        style={[
                          styles.transportBarFill,
                          { width: `${item.pct}%` as any, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                  </View>
                  <ThemedText style={styles.transportCount}>
                    {item.count} <ThemedText style={styles.transportPct}>({item.pct.toFixed(0)}%)</ThemedText>
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Top routes ── */}
        {topRoutes.length > 0 && (
          <>
            <SectionTitle>Top Routes</SectionTitle>
            <View style={styles.card}>
              {topRoutes.map(([route, count], i) => (
                <View key={route} style={[styles.routeRow, i < topRoutes.length - 1 && styles.routeRowBorder]}>
                  <View style={styles.routeRank}>
                    <ThemedText style={styles.routeRankText}>{i + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.routeLabel} numberOfLines={1}>{route}</ThemedText>
                  <View style={styles.routeCountWrap}>
                    <ThemedText style={styles.routeCount}>{count}×</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {totalTrips === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="insights" size={48} color="rgba(255,255,255,0.15)" />
            <ThemedText style={styles.emptyText}>Log some trips to see your stats</ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
    marginBottom: 24,
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

  // Stat cards (2×2 grid)
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  statSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },

  // CO2 tooltip
  tooltip: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Palette.green.dark + '44',
    borderWidth: 1,
    borderColor: Palette.green.light + '44',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tooltipText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },

  // Generic card
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // KlimaTicket card
  klimaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  klimaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  klimaSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  klimaPct: {
    fontSize: 26,
    fontWeight: '900',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  klimaDone: {
    fontSize: 12,
    color: Palette.green.mid,
    fontWeight: '600',
    textAlign: 'center',
  },
  klimaRemaining: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },

  // Chart
  chartLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 8,
  },

  // Transport mix
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  transportLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  transportLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  transportBarWrap: {
    flex: 1,
  },
  transportBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  transportBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  transportCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'right',
  },
  transportPct: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400',
  },

  // Top routes
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  routeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  routeRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  routeLabel: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
  },
  routeCountWrap: {
    backgroundColor: Palette.blue.mid,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
});
