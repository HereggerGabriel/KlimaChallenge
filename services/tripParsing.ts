// Validation of imported trip files. Kept free of Expo/device modules so it
// can be unit-tested; tripExport.ts does the file picking and reading.

import { Trip } from "@/types/trip";

const VALID_TRANSPORT_TYPES = new Set(["Bus", "Train", "Tram", "Subway"]);

/**
 * Valid trips from a parsed export file. Accepts the export format
 * { version, trips: [...] } and a plain array. Invalid entries are skipped;
 * a file without a trips list throws with a user-facing message.
 */
export function parseTripsPayload(parsed: unknown): Trip[] {
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
