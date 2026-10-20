// Builds the bundled station list and rail network from the ÖBB GTFS timetable
// (ÖBB Open Data, "GTFS Fahrplan 2026", CC BY 4.0).
//
// - Stations: parent stations (location_type = 1) that have rail service, with
//   shortened display names ("Klagenfurt West Bahnhst" -> "Klagenfurt West").
// - Edges: consecutive stops of every rail trip, weighted with the track
//   distance from stop_times.shape_dist_traveled (shortest seen per pair).
//   The app runs a shortest-path search on this graph to get real rail km.
//
// Usage: node scripts/data/build-stations.mjs data-raw/gtfs
// Output: assets/data/network.json
//   { "stations": [{ "n": name, "la": lat, "lo": lon }], "edges": [[i, j, km10]] }
//   km10 = track distance in units of 100 m (km * 10, rounded).

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2] ?? "data-raw/gtfs";
const RAIL_ROUTE_TYPE = "2";

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(file) {
  const lines = fs
    .readFileSync(path.join(dir, file), "utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((l) => {
    const v = parseCsvLine(l);
    return Object.fromEntries(header.map((k, i) => [k, v[i]]));
  });
}

// Generic suffixes that add nothing for the user; "Hauptbahnhof", "Westbahnhof" etc. stay.
const SUFFIX = /\s+(Bahnhof|Bahnhst|Bhf\.?|Haltestelle|Hst\.?)$/i;

// ── Rail trips and their stop sequences ─────────────────────────────────────
const railRoutes = new Set(
  readCsv("routes.txt")
    .filter((r) => r.route_type === RAIL_ROUTE_TYPE)
    .map((r) => r.route_id),
);
const railTrips = new Set(
  readCsv("trips.txt")
    .filter((t) => railRoutes.has(t.route_id))
    .map((t) => t.trip_id),
);

const stops = readCsv("stops.txt");

// Some platforms (e.g. Bludenz, Dornbirn, Feldkirch) have no parent station in
// the feed. Group them by their stop-ID prefix ("at:48:130:0:1" -> "at:48:130")
// into a synthetic parent so those stations aren't lost.
const orphanGroupId = (id) => "P" + id.split(":").slice(0, 3).join(":");
const isOrphanPlatform = (s) => !s.parent_station && (s.location_type || "0") === "0";
const orphanGroups = new Map(); // synthetic id -> platforms
for (const s of stops) {
  if (!isOrphanPlatform(s)) continue;
  const gid = orphanGroupId(s.stop_id);
  if (!orphanGroups.has(gid)) orphanGroups.set(gid, []);
  orphanGroups.get(gid).push(s);
}
for (const [gid, platforms] of orphanGroups) {
  const avg = (k) => platforms.reduce((sum, p) => sum + Number(p[k]), 0) / platforms.length;
  stops.push({
    stop_id: gid,
    stop_name: platforms[0].stop_name,
    stop_lat: String(avg("stop_lat")),
    stop_lon: String(avg("stop_lon")),
    location_type: "1",
    parent_station: "",
  });
}

const parentOf = new Map(
  stops.map((s) => [
    s.stop_id,
    s.parent_station || (isOrphanPlatform(s) ? orphanGroupId(s.stop_id) : s.stop_id),
  ]),
);

const tripStops = new Map(); // trip_id -> [{ seq, station, dist }]
for (const r of readCsv("stop_times.txt")) {
  if (!railTrips.has(r.trip_id)) continue;
  if (!tripStops.has(r.trip_id)) tripStops.set(r.trip_id, []);
  tripStops.get(r.trip_id).push({
    seq: Number(r.stop_sequence),
    station: parentOf.get(r.stop_id) ?? r.stop_id,
    dist: Number(r.shape_dist_traveled),
  });
}

// ── Stations ────────────────────────────────────────────────────────────────
const served = new Set();
for (const list of tripStops.values()) for (const s of list) served.add(s.station);

const candidates = stops
  .filter((s) => s.location_type === "1" && served.has(s.stop_id))
  .map((s) => ({
    id: s.stop_id,
    full: s.stop_name.trim(),
    short: s.stop_name.trim().replace(SUFFIX, ""),
    la: Math.round(Number(s.stop_lat) * 1e5) / 1e5,
    lo: Math.round(Number(s.stop_lon) * 1e5) / 1e5,
  }));

// Keep the full name where shortening would make two stations look identical.
const shortCount = new Map();
for (const s of candidates) shortCount.set(s.short, (shortCount.get(s.short) ?? 0) + 1);
for (const s of candidates) s.n = shortCount.get(s.short) > 1 ? s.full : s.short;
candidates.sort((a, b) => a.n.localeCompare(b.n, "de"));

const stations = [];
const indexByName = new Map();
const indexById = new Map();
for (const s of candidates) {
  // Exact duplicate names (rare) share one entry.
  if (!indexByName.has(s.n)) {
    indexByName.set(s.n, stations.length);
    stations.push({ n: s.n, la: s.la, lo: s.lo });
  }
  indexById.set(s.id, indexByName.get(s.n));
}

// ── Edges: shortest track distance between consecutive stops ───────────────
const edgeKm10 = new Map(); // "i-j" (i < j) -> km10
for (const list of tripStops.values()) {
  list.sort((a, b) => a.seq - b.seq);
  for (let k = 1; k < list.length; k++) {
    const a = indexById.get(list[k - 1].station);
    const b = indexById.get(list[k].station);
    const meters = list[k].dist - list[k - 1].dist;
    if (a === undefined || b === undefined || a === b || !(meters > 0)) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    const km10 = Math.max(1, Math.round(meters / 100));
    if (!edgeKm10.has(key) || km10 < edgeKm10.get(key)) edgeKm10.set(key, km10);
  }
}
const edges = [...edgeKm10.entries()].map(([key, km10]) => [...key.split("-").map(Number), km10]);

const outFile = path.join("assets", "data", "network.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ stations, edges }));
console.log(
  `${stations.length} stations, ${edges.length} edges -> ${outFile} (${fs.statSync(outFile).size} bytes)`,
);
