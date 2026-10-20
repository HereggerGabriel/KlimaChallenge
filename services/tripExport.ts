import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Trip } from "@/types/trip";
import { localDateKey } from "@/utils/dateKeys";

// ── Export format ──────────────────────────────────────────────────────────────

interface ExportPayload {
  version: 1;
  exportedAt: string;
  trips: Trip[];
}

/** Export all trips as a JSON file and open the native share sheet. */
export async function exportTrips(trips: Trip[]): Promise<void> {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    trips,
  };

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }

  const json = JSON.stringify(payload, null, 2);
  const date = localDateKey();
  const fileName = `klimachallenge_trips_${date}.json`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(filePath, {
    mimeType: "application/json",
    dialogTitle: "Export Trips",
    UTI: "public.json",
  });
}

// ── Import ─────────────────────────────────────────────────────────────────────

/**
 * Let the user pick an exported JSON file and return its valid trips, or null
 * if the picker was closed. Merging into the app's data is the store's job
 * (mergeTrips), so imported trips count for XP and stats right away.
 * Throws with a user-facing message for unreadable files.
 */
export async function pickTripsFile(): Promise<Trip[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "text/json", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;

  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This file isn't a KlimaChallenge export (not valid JSON).");
  }
  const trips = parseTripsFromPayload(parsed);
  if (trips.length === 0) throw new Error("No valid trips found in this file.");
  return trips;
}

// ── Parsing helpers ────────────────────────────────────────────────────────────

const VALID_TRANSPORT_TYPES = new Set(["Bus", "Train", "Tram", "Subway"]);

function parseTripsFromPayload(parsed: unknown): Trip[] {
  // Support both wrapped format { version, trips } and raw array
  let rawTrips: unknown[];
  if (Array.isArray(parsed)) {
    rawTrips = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    "trips" in parsed &&
    Array.isArray((parsed as any).trips)
  ) {
    rawTrips = (parsed as any).trips;
  } else {
    throw new Error("This file isn't a KlimaChallenge export (no trips list).");
  }

  return rawTrips.map((raw: any) => validateTrip(raw)).filter((t): t is Trip => t !== null);
}

function validateTrip(raw: any): Trip | null {
  if (!raw || typeof raw !== "object") return null;

  const id = typeof raw.id === "string" ? raw.id : null;
  const date = raw.date ? new Date(raw.date) : null;
  const origin = typeof raw.origin === "string" ? raw.origin.trim() : null;
  const destination = typeof raw.destination === "string" ? raw.destination.trim() : null;
  const transportType = typeof raw.transportType === "string" ? raw.transportType : null;
  const cost = typeof raw.cost === "number" ? raw.cost : parseFloat(raw.cost);
  const distance = typeof raw.distance === "number" ? raw.distance : parseFloat(raw.distance);
  const description = typeof raw.description === "string" ? raw.description : "";

  if (
    !id ||
    !date ||
    isNaN(date.getTime()) ||
    !origin ||
    !destination ||
    !transportType ||
    !VALID_TRANSPORT_TYPES.has(transportType) ||
    isNaN(cost) ||
    isNaN(distance)
  ) {
    return null;
  }

  return { id, date, origin, destination, transportType, cost, distance, description };
}
