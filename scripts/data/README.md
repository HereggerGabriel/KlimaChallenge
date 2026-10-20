# Data pipeline: stations, rail distances, fare model

The app ships two small data files in `assets/data/`, generated from ÖBB Open Data.
Raw downloads live in `data-raw/` (gitignored).

## Sources (both CC BY 4.0, attribution shown in the app)
- **GTFS Fahrplan 2026** (ÖBB-Personenverkehr AG), valid 14 Dec 2025 – 12 Dec 2026:
  https://data.oebb.at/de/datensaetze~soll-fahrplan-gtfs~
- **Relationspreise** (standard-ticket prices per station pair), valid from 14 Dec 2025:
  https://data.oebb.at/de/datensaetze~preise-relationen-tarifbestimmungen~
  The PDFs used: `v.pdf`, `ka_kl.pdf`, `wa_we.pdf` (origins starting with V, KA–KL, WA–WE).

## Steps
1. `npm run data:stations`: `build-stations.mjs` reads `data-raw/gtfs/` (stops, trips,
   stop_times, routes) and writes `assets/data/network.json`:
   1,117 stations with coordinates plus 1,641 rail edges weighted with track distance
   (`stop_times.shape_dist_traveled`). Platforms without a parent station are grouped by
   stop-ID prefix. The app computes rail km with Dijkstra on this graph.
2. `npm run data:prices`: `extract-prices.mjs` extracts from the PDFs the price for a
   standard ticket, 2nd class, online/app, bought on the day of travel ("ST VP 000"),
   into `data-raw/prices/*.csv` (~150,000 rows, about 10 minutes).
3. `npm run data:fares`: `build-fare-model.mjs` matches price-table names to stations,
   computes the rail distance of every priced pair, and stores the median price per
   distance bin in `assets/data/fare-model.json`. The app interpolates between bins.

## Accuracy (Oct 2026 build)
57,645 priced station pairs with a known rail distance. Deviation of the estimate from
the real ÖBB price: median 4.9%, 75th percentile 8.9%, 90th percentile 23.4%.
Larger deviations come mostly from routes whose priced path differs from the shortest
rail path. Users can always correct the price; corrections are remembered per route.

## Limitations
- **Verbund fares are not included.** Trips entirely inside a transport association
  (e.g. Villach–Klagenfurt inside the Carinthian Verbund) are sold at the association's
  zone fare, which is often higher than the ÖBB standard fare (example: EUR 10.50 Verbund
  ticket in the ÖBB app vs. EUR 8.60 ÖBB online standard fare, Oct 2026). The ÖBB tables
  state that Verbund tariffs are excluded. The estimate is therefore a lower bound for
  regional trips; the app says so in its hint, links to the ÖBB shop, and remembers the
  price the user enters per route.
- Bus, tram and subway fares are not modelled (regional zone tariffs); the app suggests a
  typical city fare instead.
- Prices rise by about 3.5% on 13 Dec 2026; regenerate with the new Relationspreise then.
