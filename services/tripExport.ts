import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Trip } from "@/types/trip";
import { localDateKey } from "@/utils/dateKeys";
import { parseTripsPayload } from "./tripParsing";

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
  const trips = parseTripsPayload(parsed);
  if (trips.length === 0) throw new Error("No valid trips found in this file.");
  return trips;
}
