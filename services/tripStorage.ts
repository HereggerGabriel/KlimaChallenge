import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trip } from "@/types/trip";

export const STORAGE_KEY = "@travelapp_trips";

/** Generate a unique trip ID (UUID v4). Single source of truth for ID generation. */
export const generateTripId = (): string => crypto.randomUUID();

export const loadTrips = async (): Promise<Trip[]> => {
  try {
    const storedTrips = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedTrips) {
      const parsedTrips = JSON.parse(storedTrips);
      return parsedTrips.map((trip: any) => ({
        ...trip,
        date: new Date(trip.date),
        distance: parseFloat(trip.distance) || 0,
        cost: parseFloat(trip.cost) || 0,
      }));
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
