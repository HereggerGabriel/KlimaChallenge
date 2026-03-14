import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getTripById } from '@/services/tripStorage';
import { Trip } from '@/types/trip';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (id) {
        const found = await getTripById(id);
        setTrip(found);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!trip) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Trip not found.</ThemedText>
      </ThemedView>
    );
  }

  const date = trip.date instanceof Date ? trip.date : new Date(trip.date);

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {trip.origin} → {trip.destination}
        </ThemedText>
        <ThemedText style={styles.dateText}>
          {date.toLocaleDateString('en-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {'  '}
          {date.toLocaleTimeString('en-AT', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Trip Details</ThemedText>
        <ThemedView style={styles.card}>
          <View style={styles.row}>
            <IconSymbol name="bus" size={20} color="#007AFF" />
            <ThemedText style={styles.rowLabel}>Transport</ThemedText>
            <ThemedText style={styles.rowValue}>{trip.transportType}</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <IconSymbol name="ruler" size={20} color="#007AFF" />
            <ThemedText style={styles.rowLabel}>Distance</ThemedText>
            <ThemedText style={styles.rowValue}>{trip.distance} km</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <IconSymbol name="eurosign.circle.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.rowLabel}>Equivalent cost</ThemedText>
            <ThemedText style={[styles.rowValue, styles.costValue]}>€{trip.cost.toFixed(2)}</ThemedText>
          </View>
          {trip.description ? (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <IconSymbol name="text.bubble" size={20} color="#007AFF" />
                <ThemedText style={styles.rowLabel}>Note</ThemedText>
                <ThemedText style={[styles.rowValue, styles.descriptionValue]}>{trip.description}</ThemedText>
              </View>
            </>
          ) : null}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 15,
    opacity: 0.6,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    opacity: 0.7,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  costValue: {
    color: '#007AFF',
  },
  descriptionValue: {
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
});
