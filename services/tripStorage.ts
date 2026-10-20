import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trip } from "@/types/trip";

export const STORAGE_KEY = "@travelapp_trips";

/**
 * Generate a unique trip ID (UUID v4). Single source of truth for ID generation.
 * Hermes (React Native's JS engine) has no global `crypto`, so fall back to a
 * Math.random-based v4 UUID. That is not cryptographically secure, but IDs only
 * need to be unique, and 122 random bits make collisions practically impossible.
 */
export const generateTripId = (): string => {
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof webCrypto?.randomUUID === "function") return webCrypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

/** Newest first, the order every trip list in the app expects. Returns a new array. */
export const sortTripsNewestFirst = (trips: Trip[]): Trip[] =>
  [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const loadTrips = async (): Promise<Trip[]> => {
  try {
    const storedTrips = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedTrips) {
      const parsedTrips = JSON.parse(storedTrips);
      return sortTripsNewestFirst(
        parsedTrips.map((trip: any) => ({
          ...trip,
          date: new Date(trip.date),
          distance: parseFloat(trip.distance) || 0,
          cost: parseFloat(trip.cost) || 0,
        })),
      );
    }
    return [];
  } catch (error) {
    console.error("Error loading trips:", error);
    return [];
  }
};

export const saveTrips = async (trips: Trip[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (error) {
    console.error("Error saving trips:", error);
  }
};
