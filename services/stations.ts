// Offline station search and rail distances.
// Data: assets/data/network.json, built by scripts/data/build-stations.mjs from
// ÖBB Open Data "GTFS Fahrplan 2026" (CC BY 4.0).

import network from "@/assets/data/network.json";

export type Station = {
  index: number;
  name: string;
  lat: number;
  lon: number;
};

type NetworkFile = {
  stations: { n: string; la: number; lo: number }[];
  edges: [number, number, number][]; // [stationA, stationB, distance in 100 m]
};

const data = network as NetworkFile;

export const STATIONS: Station[] = data.stations.map((s, index) => ({
  index,
  name: s.n,
  lat: s.la,
  lon: s.lo,
}));

// Straight-line distance is scaled by this factor when two stations aren't
// connected in the rail network (e.g. foreign stations, private branch lines).
const DETOUR_FACTOR = 1.25;

// ── Name normalisation (shared by search and matching) ─────────────────────

/**
 * Lowercase, accent-free form of a station name with common abbreviations
 * expanded, so "Villach Hbf", "villach hauptbahnhof" and "Villach HBF" match.
 */
export function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(gr\)|\(sg\)/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bhbf\b\.?/g, "hauptbahnhof")
    .replace(/\bwestbf\b\.?/g, "westbahnhof")
    .replace(/\bostbf\b\.?/g, "ostbahnhof")
    .replace(/\bbf\b\.?/g, "bahnhof")
    .replace(/\ba\.\s*d\.\s*/g, "an der ")
    .replace(/\bst\.\s*/g, "st ")
    .replace(/[/.,()-]/g, " ")
    .replace(/\b(bahnhof|bahnhst|bhf|haltestelle|hst)\b$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED = STATIONS.map((s) => normalizeStationName(s.name));
const BY_NORMALIZED = new Map<string, Station>();
STATIONS.forEach((s, i) => {
  if (!BY_NORMALIZED.has(NORMALIZED[i])) BY_NORMALIZED.set(NORMALIZED[i], s);
});

/** The station matching a typed or stored name, if any ("Villach HBF" finds "Villach Hauptbahnhof"). */
export function findStation(name: string): Station | undefined {
  const key = normalizeStationName(name);
  if (!key) return undefined;
  // A bare city name ("Graz") means its main station.
  return BY_NORMALIZED.get(key) ?? BY_NORMALIZED.get(`${key} hauptbahnhof`);
}

/**
 * Stations matching a query, best first: exact name, then names starting with
 * the query, then names where every query word starts a word. Main stations
 * ("Hauptbahnhof") win ties, so "wien" suggests Wien Hauptbahnhof first.
 */
export function searchStations(query: string, limit = 8): Station[] {
  const q = normalizeStationName(query);
  if (q.length < 2) return [];
  const words = q.split(" ");

  const scored: { station: Station; score: number }[] = [];
  STATIONS.forEach((station, i) => {
    const n = NORMALIZED[i];
    let score: number;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else {
      const nameWords = n.split(" ");
      const allWordsMatch = words.every((w) => nameWords.some((nw) => nw.startsWith(w)));
      if (!allWordsMatch) return;
      score = 2;
    }
    if (n.includes("hauptbahnhof")) score -= 0.5;
    scored.push({ station, score });
  });

  return scored
    .sort((a, b) => a.score - b.score || a.station.name.localeCompare(b.station.name, "de"))
    .slice(0, limit)
    .map((s) => s.station);
}

// ── Distances ──────────────────────────────────────────────────────────────

function haversineKm(a: Station, b: Station): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

let adjacency: [number, number][][] | null = null;
function getAdjacency(): [number, number][][] {
  if (!adjacency) {
    adjacency = STATIONS.map(() => []);
    for (const [a, b, km10] of data.edges) {
      adjacency[a].push([b, km10]);
      adjacency[b].push([a, km10]);
    }
  }
  return adjacency;
}

const distanceCache = new Map<number, Float64Array>();

/** Shortest rail distance from one station to all others (Dijkstra), in units of 100 m. */
function distancesFrom(source: number): Float64Array {
  const cached = distanceCache.get(source);
  if (cached) return cached;

  const adj = getAdjacency();
  const dist = new Float64Array(STATIONS.length).fill(Infinity);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push(0, source);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue; // stale entry
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        heap.push(dist[v], v);
      }
    }
  }
  distanceCache.set(source, dist);
  return dist;
}

/** Minimal binary min-heap of [priority, node] pairs for Dijkstra. */
class MinHeap {
  private items: [number, number][] = [];

  get size(): number {
    return this.items.length;
  }

  push(priority: number, node: number): void {
    const items = this.items;
    items.push([priority, node]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent][0] <= items[i][0]) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop(): [number, number] {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < items.length && items[l][0] < items[smallest][0]) smallest = l;
        if (r < items.length && items[r][0] < items[smallest][0]) smallest = r;
        if (smallest === i) break;
        [items[smallest], items[i]] = [items[i], items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

/**
 * Rail distance in km between two stations, rounded to 0.1 km. Falls back to
 * straight-line distance x detour factor when they aren't connected by rail.
 */
export function railDistanceKm(from: Station, to: Station): number {
  if (from.index === to.index) return 0;
  const d = distancesFrom(from.index)[to.index];
  const km = Number.isFinite(d) ? d / 10 : haversineKm(from, to) * DETOUR_FACTOR;
  return Math.round(km * 10) / 10;
}

/** Distance between two typed names if both are known stations, else null. */
export function estimateDistanceKm(origin: string, destination: string): number | null {
  const a = findStation(origin);
  const b = findStation(destination);
  return a && b ? railDistanceKm(a, b) : null;
}
