import { useCallback, useEffect, useRef, useState } from "react";
import { estimateDistanceKm } from "@/services/stations";
import { FareSuggestion, rememberRoutePrice, suggestFare } from "@/services/fareEstimate";

type Options = {
  origin: string;
  destination: string;
  transportType: string;
  cost: string;
  setCost: (v: string) => void;
  distance: string;
  setDistance: (v: string) => void;
};

type Route = { origin: string; destination: string; transportType: string };
const keyOf = (r: Route) => `${r.origin}|${r.destination}|${r.transportType}`;

/**
 * Fills distance and ticket value automatically while the user enters a route:
 * - distance from the rail network when both ends are known stations
 * - ticket value from the remembered route price, the ÖBB model or a local fare
 *
 * Rules: never overwrite what the user typed for the current route; changing
 * origin/destination re-estimates both, changing the transport type re-suggests
 * the price. Call `initialize(route)` together with filling the fields in code
 * (editing an existing trip, "Log again") so those values are kept as they are.
 */
export function useTripAutofill({
  origin,
  destination,
  transportType,
  cost,
  setCost,
  distance,
  setDistance,
}: Options) {
  const costTyped = useRef(false);
  const initializedKey = useRef<string | null>(null);
  const requestId = useRef(0);

  const [costSource, setCostSource] = useState<FareSuggestion["source"] | null>(null);
  const [distanceFromNetwork, setDistanceFromNetwork] = useState(false);

  const isInitializedRoute = () =>
    initializedKey.current !== null &&
    initializedKey.current === keyOf({ origin, destination, transportType });

  // Origin or destination changed: estimate the rail distance and drop a
  // manually typed price, which belonged to the previous route.
  useEffect(() => {
    if (isInitializedRoute()) return;
    initializedKey.current = null; // the route moved on from the initialized one
    costTyped.current = false;
    const km = estimateDistanceKm(origin, destination);
    setDistanceFromNetwork(km !== null);
    if (km !== null) setDistance(String(km));
    // Only the route drives this effect; setDistance is a stable state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination]);

  // Transport type changed: a typed price was for the other mode.
  useEffect(() => {
    if (isInitializedRoute()) return;
    initializedKey.current = null; // the route moved on from the initialized one
    costTyped.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transportType]);

  // Suggest a ticket value whenever route, transport type or distance change.
  useEffect(() => {
    if (costTyped.current) return;
    const id = ++requestId.current;
    const km = parseFloat(distance);
    suggestFare(origin, destination, transportType, Number.isFinite(km) ? km : null).then(
      (suggestion) => {
        if (id !== requestId.current || costTyped.current) return; // outdated or user typed meanwhile
        if (suggestion) {
          setCost(suggestion.price.toFixed(2));
          setCostSource(suggestion.source);
        } else {
          setCostSource(null);
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, transportType, distance]);

  /** Keep the values just filled in code for this route; autofill resumes once the route changes. */
  const initialize = useCallback((route: Route) => {
    initializedKey.current = keyOf(route);
    costTyped.current = true;
    setCostSource(null);
    setDistanceFromNetwork(false);
  }, []);

  const onCostTyped = useCallback(
    (v: string) => {
      costTyped.current = true;
      setCostSource(null);
      setCost(v);
    },
    [setCost],
  );

  const onDistanceTyped = useCallback(
    (v: string) => {
      setDistanceFromNetwork(false);
      setDistance(v);
    },
    [setDistance],
  );

  /** Remember a price the user entered for this route, so it's suggested next time. */
  const rememberIfTyped = useCallback(async () => {
    const price = parseFloat(cost);
    if (costTyped.current && price > 0) {
      await rememberRoutePrice(origin, destination, transportType, price);
    }
  }, [cost, origin, destination, transportType]);

  return {
    costSource,
    distanceFromNetwork,
    initialize,
    onCostTyped,
    onDistanceTyped,
    rememberIfTyped,
  };
}
