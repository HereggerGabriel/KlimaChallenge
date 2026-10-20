import React, { useState, useMemo } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import { router } from "expo-router";
import { Trip } from "@/types/trip";
import { TRANSPORT_COLOR } from "@/constants/transport";
import { TripDetailModal } from "@/components/ui/TripDetailModal";
import { groupTripsByDate, recentPlaces } from "@/utils/tripGrouping";
import { useAppData } from "@/store/AppData";
import * as Haptics from "expo-haptics";
import { shortRoute } from "@/services/stations";
import { formatKm } from "@/utils/format";

const FILTERS = ["All", "Bus", "Train", "Tram", "Subway"] as const;
type Filter = (typeof FILTERS)[number];

const DELETE_THRESHOLD = -80;

function SwipeableTripCard({
  trip,
  onPress,
  onDelete,
}: {
  trip: Trip;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: Palette.blue.dark,
  }));

  const deleteOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / Math.abs(DELETE_THRESHOLD)),
  }));

  const timeStr = (() => {
    const d = trip.date instanceof Date ? trip.date : new Date(trip.date);
    return d.toLocaleTimeString("en-AT", { hour: "2-digit", minute: "2-digit", hour12: false });
  })();

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < DELETE_THRESHOLD) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        translateX.value = withTiming(-500, { duration: 200 });
        setTimeout(() => onDelete(), 200);
      } else {
        translateX.value = withSpring(0);
      }
    });

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.deleteBackground, deleteOpacity]}>
        <MaterialIcons name="delete-outline" size={22} color="#fff" />
        <ThemedText style={styles.deleteLabel}>Delete</ThemedText>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={cardStyle}>
          <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
            <View style={styles.tripCard}>
              <View
                style={[
                  styles.tripAccentBar,
                  { backgroundColor: TRANSPORT_COLOR[trip.transportType] ?? Palette.blue.mid },
                ]}
              />
              <View style={styles.tripCardContent}>
                <View style={styles.tripRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ThemedText style={styles.tripTitle} numberOfLines={1}>
                      {shortRoute(trip.origin, trip.destination)}
                    </ThemedText>
                    <ThemedText style={styles.tripMeta}>
                      {trip.transportType} · {formatKm(trip.distance)} km · {timeStr}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.tripCost}>€{trip.cost.toFixed(2)}</ThemedText>
                </View>
                {trip.description ? (
                  <ThemedText style={styles.tripDescription} numberOfLines={1}>
                    {trip.description}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function TripsScreen() {
  const { isLoaded, trips, updateTrip, deleteTrip } = useAppData();
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  const places = useMemo(() => recentPlaces(trips), [trips]);

  const filteredGroups = useMemo(() => {
    const filtered = filter === "All" ? trips : trips.filter((t) => t.transportType === filter);
    return groupTripsByDate(filtered);
  }, [trips, filter]);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.green.mid} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>All Trips</ThemedText>
        <ThemedText style={styles.headerCount}>
          {trips.length} {trips.length === 1 ? "trip" : "trips"}
        </ThemedText>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <ThemedText
              style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}
            >
              {f}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Trip list */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="directions-bus" size={40} color="rgba(255,255,255,0.15)" />
            <ThemedText style={styles.emptyTitle}>
              {filter === "All" ? "No trips yet" : `No ${filter} trips`}
            </ThemedText>
          </View>
        ) : (
          filteredGroups.map((group) => (
            <View key={group.label}>
              <ThemedText style={styles.dateHeader}>{group.label}</ThemedText>
              {group.trips.map((trip) => (
                <SwipeableTripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => setSelectedTripId(trip.id)}
                  onDelete={() => deleteTrip(trip.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <TripDetailModal
        visible={selectedTrip !== null}
        trip={selectedTrip}
        onClose={() => setSelectedTripId(null)}
        onDelete={deleteTrip}
        onEdit={updateTrip}
        recentPlaces={places}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.blue.dark,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Palette.blue.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerCount: {
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "500",
  },
  filterRow: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  filterRowContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  filterChipActive: {
    backgroundColor: Palette.green.mid,
    borderColor: Palette.green.mid,
  },
  filterChipText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 48,
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  swipeContainer: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  deleteBackground: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Palette.red.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 20,
    gap: 6,
  },
  deleteLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tripCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tripAccentBar: {
    width: 4,
  },
  tripCardContent: {
    flex: 1,
    padding: 14,
  },
  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tripTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 3,
  },
  tripMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  tripCost: {
    fontSize: 17,
    fontWeight: "700",
    color: Palette.green.mid,
  },
  tripDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 72,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "500",
  },
});
