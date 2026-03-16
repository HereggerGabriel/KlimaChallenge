import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trip } from "@/types/trip";

export const STORAGE_KEY = "@travelapp_trips";

// Shared initial dummy data
const generateDate = (daysAgo: number, hour: number, minute: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
};

export const initialTrips: Trip[] = [
  { id: "1", origin: "Home", destination: "Work", date: generateDate(0, 7, 30), transportType: "Bus", cost: 2.50, distance: 5, description: "Morning commute" },
  { id: "2", origin: "Work", destination: "Gym", date: generateDate(0, 17, 30), transportType: "Train", cost: 2.50, distance: 3, description: "Evening workout" },
  { id: "3", origin: "Home", destination: "Work", date: generateDate(1, 7, 45), transportType: "Bus", cost: 2.50, distance: 5, description: "Morning commute" },
  { id: "4", origin: "Work", destination: "Shopping", date: generateDate(1, 15, 0), transportType: "Train", cost: 2.50, distance: 2, description: "Lunch break shopping" },
  { id: "5", origin: "Home", destination: "Work", date: generateDate(7, 8, 0), transportType: "Bus", cost: 2.50, distance: 5, description: "Morning commute" },
  { id: "6", origin: "Work", destination: "Doctor", date: generateDate(7, 14, 30), transportType: "Train", cost: 2.50, distance: 4, description: "Medical appointment" },
  { id: "7", origin: "Home", destination: "Work", date: generateDate(14, 7, 30), transportType: "Bus", cost: 2.50, distance: 5, description: "Morning commute" },
  { id: "8", origin: "Work", destination: "Home", date: generateDate(14, 18, 0), transportType: "Bus", cost: 2.50, distance: 5, description: "Evening commute" },
  { id: "9", origin: "Home", destination: "Work", date: generateDate(21, 8, 15), transportType: "Bus", cost: 2.50, distance: 5, description: "Morning commute" },
  { id: "10", origin: "Work", destination: "Gym", date: generateDate(21, 17, 45), transportType: "Train", cost: 2.50, distance: 3, description: "Evening workout" },
];

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
    return initialTrips;
  } catch (error) {
    console.error("Error loading trips:", error);
    return initialTrips;
  }
};

export const saveTrips = async (trips: Trip[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (error) {
    console.error("Error saving trips:", error);
  }
};
