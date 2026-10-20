import React, { useState, useMemo } from "react";
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  useAnimatedStyle,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import { router } from "expo-router";
import { FinancialOverview } from "@/components/ui/FinancialOverview";
import { QuickAddTripModal } from "@/components/ui/QuickAddTripModal";
import { TripDetailModal } from "@/components/ui/TripDetailModal";
import UserLevelCard from "@/components/ui/UserLevelCard";
import { MainQuestOverlay } from "@/components/ui/MainQuestOverlay";
import { Trip } from "@/types/trip";
import { styles } from "@/styles/userScreen";
import { TRANSPORT_COLOR, transportIcon } from "@/constants/transport";
import { groupTripsByDate, recentPlaces } from "@/utils/tripGrouping";
import { useAppData } from "@/store/AppData";
import { shortRoute, shortStationName } from "@/services/stations";

const TRIPS_PREVIEW = 5;

type FavoriteTrip = {
  origin: string;
  destination: string;
  transportType: string;
  distance: number;
  cost: number;
  count: number;
};

type PrefillData = {
  origin: string;
  destination: string;
  transportType: string;
  cost: string;
  distance: string;
  description: string;
};

const MIN_FAVORITE_COUNT = 2;

function computeFavorites(trips: Trip[]): FavoriteTrip[] {
  const map = new Map<string, FavoriteTrip>();
  for (const trip of trips) {
    const key = `${trip.origin}|${trip.destination}|${trip.transportType}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, {
        origin: trip.origin,
        destination: trip.destination,
        transportType: trip.transportType,
        distance: trip.distance,
        cost: trip.cost,
        count: 1,
      });
    }
  }
  // A route only counts as a favorite once it was taken at least twice.
  return [...map.values()]
    .filter((f) => f.count >= MIN_FAVORITE_COUNT)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

const HOLD_DURATION = 1000;

function FavoriteCard({ fav, onAdd }: { fav: FavoriteTrip; onAdd: () => void }) {
  const progress = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%` as any,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const gesture = Gesture.LongPress()
    .minDuration(HOLD_DURATION)
    .runOnJS(true)
    .onBegin(() => {
      progress.value = withTiming(1, { duration: HOLD_DURATION });
    })
    .onStart(() => {
      progress.value = 0;
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 220 }),
      );
      onAdd();
    })
    .onFinalize((_e, success) => {
      if (!success) {
        progress.value = 0;
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.favoriteCard}>
        <Animated.View style={[styles.fillOverlay, fillStyle]} />
        <Animated.View style={[styles.flashOverlay, flashStyle]} />

        <View style={styles.favoriteCardTop}>
          {/* Origin and destination on separate lines so half-width cards don't truncate. */}
          <View style={styles.favoriteRouteBlock}>
            <ThemedText style={styles.favoriteRoute} numberOfLines={1}>
              {shortStationName(fav.origin)}
            </ThemedText>
            <ThemedText style={styles.favoriteRoute} numberOfLines={1}>
              → {shortStationName(fav.destination)}
            </ThemedText>
          </View>
          <View style={styles.favoriteBadge}>
            <ThemedText style={styles.favoriteBadgeText}>{fav.count}×</ThemedText>
          </View>
        </View>
        <View style={styles.favoriteCardBottom}>
          <MaterialIcons
            name={transportIcon(fav.transportType)}
            size={14}
            color={Palette.blue.light}
          />
          <ThemedText style={styles.favoriteTransport}>{fav.transportType}</ThemedText>
          <ThemedText style={styles.favoriteDistance}>{fav.distance} km</ThemedText>
        </View>
      </View>
    </GestureDetector>
  );
}

export default function UserScreen() {
  const {
    isLoaded,
    trips,
    profile,
    level,
    levelXP,
    levelXPNeeded,
    streak,
    ticketProgress,
    mainQuestEvent,
    dismissMainQuestEvent,
    addTrip,
    updateTrip,
    deleteTrip,
  } = useAppData();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [prefillData, setPrefillData] = useState<PrefillData | undefined>(undefined);
  // Store the ID so the detail view always shows the latest version of the trip.
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  const favorites = useMemo(() => computeFavorites(trips), [trips]);
  const previewGroups = useMemo(() => groupTripsByDate(trips.slice(0, TRIPS_PREVIEW)), [trips]);
  const places = useMemo(() => recentPlaces(trips), [trips]);

  const handleLogAgain = (trip: Trip) => {
    setSelectedTripId(null);
    setPrefillData({
      origin: trip.origin,
      destination: trip.destination,
      transportType: trip.transportType,
      cost: trip.cost.toString(),
      distance: trip.distance.toString(),
      description: trip.description ?? "",
    });
    setShowQuickAdd(true);
  };

  const handleFavoritePress = (fav: FavoriteTrip) =>
    addTrip({
      date: new Date(),
      origin: fav.origin,
      destination: fav.destination,
      transportType: fav.transportType,
      cost: fav.cost,
      distance: fav.distance,
      description: "",
    });

  const handleQuickAddSubmit = async (tripData: {
    date: Date;
    origin: string;
    destination: string;
    transportType: string;
    cost: number;
    description?: string;
    distance: number;
  }) => {
    setShowQuickAdd(false);
    setPrefillData(undefined);
    await addTrip({ ...tripData, description: tripData.description || "" });
  };

  const formatTime = (date: Date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString("en-AT", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.green.mid} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={styles.headerTitle}>
              My Climate Journey
            </ThemedText>
            <ThemedText style={styles.subtitle}>Track your impact and savings</ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile")} activeOpacity={0.8}>
            <View style={styles.avatarCircle}>
              <ThemedText style={styles.avatarInitial}>
                {profile.name.trim() ? profile.name.trim()[0].toUpperCase() : "?"}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        <UserLevelCard
          level={level}
          currentXP={levelXP}
          xpToNextLevel={levelXPNeeded}
          streak={streak}
          onQuestsPress={() => router.push("/quests")}
        />

        <FinancialOverview
          totalTrips={ticketProgress.trips.length}
          totalDistance={ticketProgress.trips.reduce((sum, t) => sum + t.distance, 0)}
          totalCost={ticketProgress.valueUsed}
          klimaTicketCost={ticketProgress.cost}
          onStatsPress={() => router.push("/stats")}
        />

        {/* Favorites */}
        {favorites.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="star" size={16} color={Palette.green.mid} />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Favorites
              </ThemedText>
            </View>
            <View style={styles.favoritesGrid}>
              {favorites.map((fav) => (
                <FavoriteCard
                  key={`${fav.origin}|${fav.destination}|${fav.transportType}`}
                  fav={fav}
                  onAdd={() => handleFavoritePress(fav)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Recent Trips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="schedule" size={16} color={Palette.blue.light} />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Recent Trips
              </ThemedText>
            </View>
            {/* The empty state has its own Add Trip button. */}
            {trips.length > 0 && (
              <TouchableOpacity style={styles.addButton} onPress={() => setShowQuickAdd(true)}>
                <MaterialIcons name="add-circle" size={20} color="#fff" />
                <ThemedText style={styles.addButtonText}>Add Trip</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {trips.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="directions-bus" size={36} color="rgba(255,255,255,0.18)" />
              <ThemedText style={styles.emptyStateTitle}>No trips yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtitle}>
                Add your first trip to start tracking your climate impact
              </ThemedText>
              <TouchableOpacity style={styles.emptyStateCTA} onPress={() => setShowQuickAdd(true)}>
                <MaterialIcons name="add-circle" size={18} color="#fff" />
                <ThemedText style={styles.emptyStateCTAText}>Add Trip</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {previewGroups.map((group) => (
            <View key={group.label}>
              <ThemedText style={styles.dateGroupHeader}>{group.label}</ThemedText>
              {group.trips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => setSelectedTripId(trip.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.tripCard}>
                    <View
                      style={[
                        styles.tripAccentBar,
                        {
                          backgroundColor: TRANSPORT_COLOR[trip.transportType] ?? Palette.blue.mid,
                        },
                      ]}
                    />
                    <View style={styles.tripCardContent}>
                      <View style={styles.tripHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <ThemedText style={styles.tripTitle} numberOfLines={1}>
                            {shortRoute(trip.origin, trip.destination)}
                          </ThemedText>
                          <ThemedText style={styles.tripDate}>
                            {trip.transportType} · {formatTime(trip.date)}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.tripCost}>€{trip.cost.toFixed(2)}</ThemedText>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {trips.length > TRIPS_PREVIEW && (
            <TouchableOpacity style={styles.showAllButton} onPress={() => router.push("/trips")}>
              <ThemedText style={styles.showAllText}>See all {trips.length} trips</ThemedText>
              <MaterialIcons name="chevron-right" size={14} color={Palette.blue.light} />
            </TouchableOpacity>
          )}
        </View>

        <QuickAddTripModal
          visible={showQuickAdd}
          onClose={() => {
            setShowQuickAdd(false);
            setPrefillData(undefined);
          }}
          onSubmit={handleQuickAddSubmit}
          recentPlaces={places}
          prefill={prefillData}
        />
        <TripDetailModal
          visible={selectedTrip !== null}
          trip={selectedTrip}
          onClose={() => setSelectedTripId(null)}
          onDelete={deleteTrip}
          onEdit={updateTrip}
          onLogAgain={handleLogAgain}
          recentPlaces={places}
        />
      </ScrollView>
      <MainQuestOverlay
        visible={mainQuestEvent !== null}
        totalCost={mainQuestEvent?.valueUsed ?? 0}
        klimaTicketCost={mainQuestEvent?.cost ?? 0}
        onGoToClaim={() => {
          dismissMainQuestEvent();
          router.push("/quests");
        }}
      />
    </View>
  );
}
