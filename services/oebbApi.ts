const BASE_URL = "https://v6.oebb.transport.rest";

export interface OebbStation {
  id: string;
  name: string;
  type: string;
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

export async function searchConnections(
  origin: string,
  destination: string,
  departure: Date = new Date(),
  results: number = 5
): Promise<OebbJourney[]> {
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
  return data.journeys;
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
}

export function summariseJourney(journey: OebbJourney): JourneySummary {
  const legs = journey.legs;
  const dep = new Date(legs[0].departure);
  const arr = new Date(legs[legs.length - 1].arrival);
  const durationMin = Math.round((arr.getTime() - dep.getTime()) / 60000);
  const transfers = legs.length - 1;
  const trainNames = legs.filter((l) => l.line).map((l) => l.line!.name);
  const ticket = journey.tickets?.find((t) => t.price?.amount !== undefined);
  const price = ticket?.price;
  const fmt = (d: Date) =>
    d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
  return { dep, arr, durationMin, transfers, trainNames, price, depLabel: fmt(dep), arrLabel: fmt(arr) };
}
