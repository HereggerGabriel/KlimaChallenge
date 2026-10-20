// Break-even per ticket validity period. A KlimaTicket is valid for a year (or a
// month for the 1-month ticket) from its start date and renews automatically,
// so progress is measured within the period that contains "now".

import { Trip } from "@/types/trip";
import { localDateKey, parseLocalDateKey } from "@/utils/dateKeys";

export interface TicketProfile {
  label: string;
  cost: number;
  period: "year" | "month";
  /** First day of validity as YYYY-MM-DD (local), or null if unknown. */
  startDate: string | null;
}

export const DEFAULT_TICKET: TicketProfile = {
  label: "KlimaTicket Ö Classic",
  cost: 1400,
  period: "year",
  startDate: null,
};

function addPeriods(start: Date, period: TicketProfile["period"], n: number): Date {
  const d = new Date(start);
  if (period === "year") d.setFullYear(d.getFullYear() + n);
  else d.setMonth(d.getMonth() + n);
  return d;
}

/** The validity period containing `now`, or null without a start date. */
export function currentTicketPeriod(
  profile: TicketProfile,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (!profile.startDate) return null;
  const first = parseLocalDateKey(profile.startDate);
  if (now < first) return { start: first, end: addPeriods(first, profile.period, 1) };
  let n = 0;
  while (addPeriods(first, profile.period, n + 1) <= now) n++;
  return {
    start: addPeriods(first, profile.period, n),
    end: addPeriods(first, profile.period, n + 1),
  };
}

/** Stable key of the current period, e.g. "2026-03-01", or "all" without a start date. */
export function ticketPeriodKey(profile: TicketProfile, now: Date = new Date()): string {
  const p = currentTicketPeriod(profile, now);
  return p ? localDateKey(p.start) : "all";
}

export interface TicketProgress {
  period: { start: Date; end: Date } | null;
  /** Trips counted toward this period (all trips without a start date). */
  trips: Trip[];
  /** Sum of the trips' ticket values. */
  valueUsed: number;
  cost: number;
  /** Still needed to break even, never negative. */
  remaining: number;
  /** valueUsed - cost: negative until break-even, the real saving after. */
  netSavings: number;
  /** 0–100 */
  percent: number;
  /** Days until the period ends, null without a start date. */
  daysLeft: number | null;
}

export function computeTicketProgress(
  trips: Trip[],
  profile: TicketProfile,
  now: Date = new Date(),
): TicketProgress {
  const period = currentTicketPeriod(profile, now);
  const inPeriod = period
    ? trips.filter((t) => {
        const d = t.date instanceof Date ? t.date : new Date(t.date);
        return d >= period.start && d < period.end;
      })
    : trips;
  const valueUsed = inPeriod.reduce((sum, t) => sum + t.cost, 0);
  const cost = profile.cost;
  return {
    period,
    trips: inPeriod,
    valueUsed,
    cost,
    remaining: Math.max(0, cost - valueUsed),
    netSavings: valueUsed - cost,
    percent: cost > 0 ? Math.min(100, (valueUsed / cost) * 100) : 0,
    daysLeft: period ? Math.ceil((period.end.getTime() - now.getTime()) / 86_400_000) : null,
  };
}

/** "Ticket year since 1 Mar 2026 · 132 days left", or null without a start date. */
export function describeTicketPeriod(
  progress: TicketProgress,
  period: TicketProfile["period"],
): string | null {
  if (!progress.period) return null;
  const since = progress.period.start.toLocaleDateString("en-AT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const unit = period === "month" ? "Ticket month" : "Ticket year";
  const left = progress.daysLeft ?? 0;
  return `${unit} since ${since} · ${left} day${left === 1 ? "" : "s"} left`;
}
