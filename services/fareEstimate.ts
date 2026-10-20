// Ticket value suggestions: what a trip would cost without the KlimaTicket.
//
// - Train: distance-based model derived from ÖBB "Relationspreise" (standard
//   ticket, 2nd class, online, bought on the day of travel; ÖBB Open Data,
//   CC BY 4.0), see scripts/data/build-fare-model.mjs.
// - Bus/Tram/Subway: typical single fare in Austrian cities (Wien: EUR 3.20 since
//   Jan 2026). Regional fares vary, so the user can correct it.
// - Whatever the user enters is remembered per route and wins next time.

import AsyncStorage from "@react-native-async-storage/async-storage";
import fareModel from "@/assets/data/fare-model.json";
import { normalizeStationName } from "@/services/stations";

type FareModel = { source: string; validFrom: string; bins: [number, number][] };
const BINS = (fareModel as FareModel).bins;

export const FARE_MODEL_SOURCE = (fareModel as FareModel).source;

const LOCAL_FARES: Record<string, number> = {
  Bus: 3.0,
  Tram: 3.0,
  Subway: 3.2,
};

const REMEMBERED_KEY = "@rememberedRoutePrices";

/**
 * ÖBB ticket shop, for users who want to look up the official price (it also
 * sells regional Verbund tickets). ÖBB offers pre-filled route links only to
 * partners on request, so this opens the plain shop.
 */
export const OEBB_SHOP_URL = "https://shop.oebbtickets.at/de/ticket";

/** Hint shown under an estimated price, by where the suggestion came from. */
export const FARE_HINT = {
  oebb: "ÖBB standard fare · regional Verbund tickets often cost more, edit if needed",
  remembered: "Your price from last time",
  local: "Typical city fare · edit if needed",
} as const;

/** Estimated standard train fare in EUR for a rail distance, rounded to 10 cents. */
export function estimateTrainFare(km: number): number {
  if (!(km > 0)) return 0;
  let price: number;
  if (km <= BINS[0][0]) {
    price = BINS[0][1];
  } else {
    const i = BINS.findIndex(([k]) => km <= k);
    if (i > 0) {
      const [k0, p0] = BINS[i - 1];
      const [k1, p1] = BINS[i];
      price = p0 + ((p1 - p0) * (km - k0)) / (k1 - k0);
    } else {
      // Beyond the last bin: continue the last segment's slope.
      const [kA, pA] = BINS[BINS.length - 2];
      const [kB, pB] = BINS[BINS.length - 1];
      price = pB + ((pB - pA) / (kB - kA)) * (km - kB);
    }
  }
  return Math.round(price * 10) / 10;
}

/** Same key for both directions: A→B and B→A cost the same. */
export function routeKey(origin: string, destination: string, transportType: string): string {
  const [a, b] = [normalizeStationName(origin), normalizeStationName(destination)].sort();
  return `${a}|${b}|${transportType}`;
}

async function loadRemembered(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(REMEMBERED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Remember the price the user confirmed for this route (both directions). */
export async function rememberRoutePrice(
  origin: string,
  destination: string,
  transportType: string,
  price: number,
): Promise<void> {
  if (!origin.trim() || !destination.trim() || !(price > 0)) return;
  const all = await loadRemembered();
  all[routeKey(origin, destination, transportType)] = price;
  await AsyncStorage.setItem(REMEMBERED_KEY, JSON.stringify(all));
}

export type FareSuggestion = {
  price: number;
  /** Where the number comes from, for a small hint under the price field. */
  source: "remembered" | "oebb" | "local";
  /** The generic estimate, also provided when a remembered price wins, so the user can compare. */
  estimate?: { price: number; source: "oebb" | "local" };
};

/** The generic estimate without the user's remembered prices. */
function genericEstimate(
  transportType: string,
  distanceKm: number | null,
): FareSuggestion["estimate"] | undefined {
  if (transportType === "Train") {
    return distanceKm && distanceKm > 0
      ? { price: estimateTrainFare(distanceKm), source: "oebb" }
      : undefined;
  }
  const local = LOCAL_FARES[transportType];
  return local ? { price: local, source: "local" } : undefined;
}

/**
 * Suggested ticket value for a trip: the user's remembered price for this route
 * first, then the ÖBB-based estimate for trains (needs a distance), then the
 * typical local fare for bus/tram/subway. Null if nothing sensible is known.
 */
export async function suggestFare(
  origin: string,
  destination: string,
  transportType: string,
  distanceKm: number | null,
): Promise<FareSuggestion | null> {
  if (!transportType) return null;
  const estimate = genericEstimate(transportType, distanceKm);
  if (origin.trim() && destination.trim()) {
    const remembered = (await loadRemembered())[routeKey(origin, destination, transportType)];
    if (remembered > 0) return { price: remembered, source: "remembered", estimate };
  }
  return estimate ? { price: estimate.price, source: estimate.source } : null;
}
