import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Trip } from "@/types/trip";
import { loadTrips, saveTrips } from "./tripStorage";

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

  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
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

export interface ImportResult {
  added: number;
  skipped: number;
  total: number;
}

/** Let the user pick a JSON file, parse trips, merge with existing (skip duplicates by ID). */
export async function importTrips(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "text/json", "*/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { added: 0, skipped: 0, total: 0 };
  }

  const fileUri = result.assets[0].uri;
  const raw = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const parsed = JSON.parse(raw);
  const incomingTrips = parseTripsFromPayload(parsed);

  if (incomingTrips.length === 0) {
    return { added: 0, skipped: 0, total: 0 };
  }

  // Merge: skip trips whose ID already exists locally
  const existingTrips = await loadTrips();
  const existingIds = new Set(existingTrips.map((t) => t.id));

  const newTrips: Trip[] = [];
  let skipped = 0;

  for (const trip of incomingTrips) {
    if (existingIds.has(trip.id)) {
      skipped++;
    } else {
      newTrips.push(trip);
    }
  }

  if (newTrips.length > 0) {
    const merged = [...newTrips, ...existingTrips];
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await saveTrips(merged);
  }

  return {
    added: newTrips.length,
    skipped,
    total: incomingTrips.length,
  };
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
    throw new Error("Invalid file format: expected a trips array");
  }

  return rawTrips
    .map((raw: any) => validateTrip(raw))
    .filter((t): t is Trip => t !== null);
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
