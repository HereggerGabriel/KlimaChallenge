// Derives a distance-based fare model from ÖBB "Relationspreise" (CC BY 4.0).
//
// 1. Matches station names in the extracted price CSVs to network.json stations
//    (normalising abbreviations like "Hbf", "a.d.", "(Gr)").
// 2. Computes the rail distance of each priced pair on the network graph.
// 3. Groups pairs into distance bins and stores the median price per bin.
//    The app interpolates between bins to estimate a trip's standard price.
// 4. Reports how far the model is from the real ÖBB price (for the thesis).
//
// Usage: node scripts/data/build-fare-model.mjs
// Inputs:  assets/data/network.json, data-raw/prices/*.csv
// Output:  assets/data/fare-model.json

import fs from "node:fs";
import path from "node:path";

const { stations, edges } = JSON.parse(fs.readFileSync("assets/data/network.json", "utf8"));

// ── Name normalisation ──────────────────────────────────────────────────────
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\(gr\)|\(sg\)/g, " ") // border markers
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
    .replace(/\bi\.\s*/g, "im ")
    .replace(/\bst\.\s*/g, "st ")
    .replace(/\bn\.\s*oe\.?/g, "")
    .replace(/[/.,()-]/g, " ")
    .replace(/\b(bahnhof|bahnhst|bhf|haltestelle|hst)\b$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const byNorm = new Map();
stations.forEach((s, i) => {
  const key = normalizeName(s.n);
  if (!byNorm.has(key)) byNorm.set(key, i);
});

const FILLER = new Set(["in", "im", "am", "an", "der", "bei", "b", "ob", "und"]);
const contentWords = (key) => key.split(" ").filter((w) => !FILLER.has(w));

function matchStation(name) {
  const key = normalizeName(name);
  if (byNorm.has(key)) return byNorm.get(key);
  // A bare city name in the price table means its main station ("Graz").
  if (byNorm.has(`${key} hauptbahnhof`)) return byNorm.get(`${key} hauptbahnhof`);

  const unique = (hits) => (hits.length === 1 ? hits[0] : undefined);
  // Unique station whose normalised name starts with the key or vice versa.
  const prefixHit = unique(
    [...byNorm]
      .filter(([k]) => k.startsWith(key + " ") || key.startsWith(k + " "))
      .map(([, i]) => i),
  );
  if (prefixHit !== undefined) return prefixHit;
  // Same content words, ignoring fillers ("Feldkirchen/Kärnten" ~ "Feldkirchen in Kärnten").
  const words = contentWords(key).join(" ");
  return unique([...byNorm].filter(([k]) => contentWords(k).join(" ") === words).map(([, i]) => i));
}

// ── Graph distances ─────────────────────────────────────────────────────────
const adj = stations.map(() => []);
for (const [a, b, km10] of edges) {
  adj[a].push([b, km10]);
  adj[b].push([a, km10]);
}

function distancesFrom(source) {
  // Dijkstra with a simple binary heap.
  const dist = new Float64Array(stations.length).fill(Infinity);
  dist[source] = 0;
  const heap = [[0, source]];
  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, u] = pop();
    if (d > dist[u]) continue;
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        push([dist[v], v]);
      }
    }
  }
  return dist; // in units of 100 m
}

// ── Read prices: cheapest route per (from, to) pair ────────────────────────
const parseRow = (l) =>
  (l.match(/"((?:[^"]|"")*)"|[^,]+/g) || []).map((c) =>
    c.replace(/^"|"$/g, "").replace(/""/g, '"'),
  );

const priceDir = path.join("data-raw", "prices");
const pairPrice = new Map(); // "i-j" -> price (same day, 2nd class, online)
let rowsTotal = 0;
const unmatched = new Set();
for (const file of fs.readdirSync(priceDir).filter((f) => f.endsWith(".csv"))) {
  const lines = fs.readFileSync(path.join(priceDir, file), "utf8").split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line) continue;
    rowsTotal++;
    const [from, to, , sameDay] = parseRow(line);
    const a = matchStation(from);
    const b = matchStation(to);
    if (a === undefined) unmatched.add(from);
    if (b === undefined) unmatched.add(to);
    if (a === undefined || b === undefined || a === b) continue;
    const key = `${a}-${b}`;
    const price = Number(sameDay);
    if (!pairPrice.has(key) || price < pairPrice.get(key)) pairPrice.set(key, price);
  }
}

// ── Pairs with rail distance ────────────────────────────────────────────────
const samples = []; // [km, price]
const bySource = new Map();
for (const [key, price] of pairPrice) {
  const [a, b] = key.split("-").map(Number);
  if (!bySource.has(a)) bySource.set(a, []);
  bySource.get(a).push([b, price]);
}
for (const [a, list] of bySource) {
  const dist = distancesFrom(a);
  for (const [b, price] of list) {
    if (Number.isFinite(dist[b]) && dist[b] > 0) samples.push([dist[b] / 10, price]);
  }
}

// ── Bins: finer for short trips, coarser for long ones ──────────────────────
const binEdges = [];
for (let km = 0; km < 100; km += 5) binEdges.push(km);
for (let km = 100; km < 300; km += 10) binEdges.push(km);
for (let km = 300; km <= 800; km += 25) binEdges.push(km);

const median = (xs) => {
  const s = [...xs].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const bins = [];
for (let i = 0; i < binEdges.length; i++) {
  const lo = binEdges[i];
  const hi = binEdges[i + 1] ?? Infinity;
  const inBin = samples.filter(([km]) => km >= lo && km < hi);
  if (inBin.length < 5) continue;
  bins.push([
    Math.round(median(inBin.map(([km]) => km)) * 10) / 10,
    Math.round(median(inBin.map(([, p]) => p)) * 10) / 10,
  ]);
}
// Prices must not drop with distance: enforce a non-decreasing curve.
for (let i = 1; i < bins.length; i++) bins[i][1] = Math.max(bins[i][1], bins[i - 1][1]);

function estimate(km, table = bins) {
  if (km <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (km <= table[i][0]) {
      const [k0, p0] = table[i - 1];
      const [k1, p1] = table[i];
      return p0 + ((p1 - p0) * (km - k0)) / (k1 - k0);
    }
  }
  const [kA, pA] = table[table.length - 2];
  const [kB, pB] = table[table.length - 1];
  return pB + ((pB - pA) / (kB - kA)) * (km - kB);
}

// ── Accuracy report ─────────────────────────────────────────────────────────
const errors = samples.map(([km, p]) => Math.abs(estimate(km) - p) / p).sort((x, y) => x - y);
const pct = (q) => errors[Math.floor(q * (errors.length - 1))] * 100;

const model = {
  source:
    "ÖBB Open Data: Relationspreise (CC BY 4.0) + GTFS Fahrplan 2026 (CC BY 4.0). Standard ticket, 2nd class, online/app, bought on the day of travel.",
  validFrom: "2025-12-14",
  bins,
};
const outFile = path.join("assets", "data", "fare-model.json");
fs.writeFileSync(outFile, JSON.stringify(model));

console.log(
  `price rows: ${rowsTotal}, priced pairs matched: ${pairPrice.size}, with rail distance: ${samples.length}`,
);
console.log(`unmatched names: ${unmatched.size}`, [...unmatched].slice(0, 25).join(" | "));
console.log(`bins: ${bins.length} -> ${outFile}`);
console.log(
  `error vs real price: median ${pct(0.5).toFixed(1)}%, 75th pct ${pct(0.75).toFixed(1)}%, 90th pct ${pct(0.9).toFixed(1)}%`,
);
for (const km of [5, 10, 20, 38, 50, 100, 200, 300, 500])
  console.log(`  ${km} km -> €${estimate(km).toFixed(2)}`);
