const BASE_URL = "https://oebb.macistry.com/api";

export interface OebbStation {
  id: string;
  name: string;
  type: string;
  location?: { latitude: number; longitude: number };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function estimateDistanceKm(origin: string, destination: string): Promise<number> {
  const [from, to] = await Promise.all([searchStation(origin), searchStation(destination)]);
  if (!from.location || !to.location) throw new Error("Station coordinates unavailable");
  const straight = haversineKm(
    from.location.latitude, from.location.longitude,
    to.location.latitude, to.location.longitude
  );
  return Math.round(straight * 1.25 * 10) / 10;
}

export interface OebbLeg {
  origin: { name: string };
  destination: { name: string };
  departure: string;
  arrival: string;
  line?: { name: string; product?: string };
  distance?: number;
}

export interface OebbTicket {
  name: string;
  price?: { amount: number; currency: string };
}

export interface OebbJourney {
  legs: OebbLeg[];
  tickets?: OebbTicket[];
  price?: { amount: number; currency: string };
}

export async function searchStation(name: string): Promise<OebbStation> {
  const params = new URLSearchParams({ query: name, results: "5" });
  const response = await fetch(`${BASE_URL}/locations?${params}`);
  if (!response.ok) throw new Error(`Station search failed: ${response.status}`);
  const data: OebbStation[] = await response.json();
  const stations = data.filter((r) => r.type === "stop");
  if (stations.length === 0) throw new Error(`No station found for: ${name}`);
  return stations[0];
}

export interface ConnectionSearchResult {
  journeys: OebbJourney[];
  fromStation: OebbStation;
  toStation: OebbStation;
}

export async function searchConnections(
  origin: string,
  destination: string,
  departure: Date = new Date(),
  results: number = 5
): Promise<ConnectionSearchResult> {
  const fromStation = await searchStation(origin);
  const toStation = await searchStation(destination);

  const params = new URLSearchParams({
    from: fromStation.id,
    to: toStation.id,
    departure: departure.toISOString(),
    results: String(results),
    stopovers: "false",
    tickets: "true",
    polylines: "false",
    language: "en",
  });

  const response = await fetch(`${BASE_URL}/journeys?${params}`);
  if (!response.ok) throw new Error(`Journey search failed: ${response.status}`);
  const data: { journeys: OebbJourney[] } = await response.json();
  return { journeys: data.journeys, fromStation, toStation };
}

export function mapTransportType(journey: OebbJourney): string {
  const leg = journey.legs.find((l) => l.line);
  if (!leg?.line) return "Train";
  const product = leg.line.product?.toLowerCase() ?? "";
  if (product === "subway") return "Subway";
  if (product === "tram") return "Tram";
  if (product === "bus") return "Bus";
  return "Train";
}

export interface JourneySummary {
  dep: Date;
  arr: Date;
  durationMin: number;
  transfers: number;
  trainNames: string[];
  price: { amount: number; currency: string } | undefined;
  depLabel: string;
  arrLabel: string;
  distanceKm: number;
}

export function summariseJourney(
  journey: OebbJourney,
  fallbackCoords?: { from: OebbStation; to: OebbStation }
): JourneySummary {
  const legs = journey.legs;
  const dep = new Date(legs[0].departure);
  const arr = new Date(legs[legs.length - 1].arrival);
  const durationMin = Math.round((arr.getTime() - dep.getTime()) / 60000);
  const transfers = legs.length - 1;
  const trainNames = legs.filter((l) => l.line).map((l) => l.line!.name);
  const ticketPrice = journey.tickets?.find((t) => t.price?.amount !== undefined)?.price;
  const price = journey.price ?? ticketPrice;
  const fmt = (d: Date) =>
    d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
  const totalMeters = legs.reduce((sum, l) => sum + (l.distance ?? 0), 0);
  let distanceKm = Math.round((totalMeters / 1000) * 10) / 10;
  if (distanceKm === 0 && fallbackCoords?.from.location && fallbackCoords?.to.location) {
    const { from, to } = fallbackCoords;
    const straight = haversineKm(
      from.location!.latitude, from.location!.longitude,
      to.location!.latitude, to.location!.longitude
    );
    distanceKm = Math.round(straight * 1.25 * 10) / 10;
  }
  return { dep, arr, durationMin, transfers, trainNames, price, depLabel: fmt(dep), arrLabel: fmt(arr), distanceKm };
}
