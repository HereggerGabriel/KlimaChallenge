import React, { useState, useEffect } from "react";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { FinancialOverview } from "@/components/ui/FinancialOverview";
import UserLevelCard from "@/components/ui/UserLevelCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadTrips } from "@/services/tripStorage";
import { Trip } from "@/types/trip";
import {
  calculateLevel,
  calculateXPForNextLevel,
  calculateCurrentLevelXP,
} from "@/utils/levelSystem";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Palette } from "@/constants/Colors";

const KLIMA_TICKET_COST = 1297.8;

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [xp, setXP] = useState(0);

  useEffect(() => {
    loadTrips().then(setTrips);
    AsyncStorage.getItem("userXP").then((val) => setXP(val ? parseInt(val, 10) : 0));
  }, []);

  const level = calculateLevel(xp);
  const xpToNext = calculateXPForNextLevel(level);
  const currentLevelXP = calculateCurrentLevelXP(xp, level);
  const totalTrips = trips.length;
  const totalDistance = trips.reduce((s, t) => s + t.distance, 0);
  const totalCost = trips.reduce((s, t) => s + t.cost, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <ThemedText style={styles.greeting}>Good day 👋</ThemedText>
        <ThemedText style={styles.subGreeting}>Here's your KlimaChallenge</ThemedText>
      </View>

      {/* Level card */}
      <UserLevelCard level={level} currentXP={currentLevelXP} xpToNextLevel={xpToNext} />

      {/* Financial overview */}
      <FinancialOverview
        totalTrips={totalTrips}
        totalDistance={totalDistance}
        totalCost={totalCost}
        klimaTicketCost={KLIMA_TICKET_COST}
      />

      {/* Quick actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/user")}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.actionIcon}>🚊</ThemedText>
          <ThemedText style={styles.actionLabel}>My Trips</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/new-trip")}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.actionIcon}>＋</ThemedText>
          <ThemedText style={styles.actionLabel}>Log Trip</ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  greetingRow: {
    gap: 4,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "700",
    color: Palette.blue.dark,
  },
  subGreeting: {
    fontSize: 14,
    color: Palette.blue.mid,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Palette.blue.dark,
  },
});
