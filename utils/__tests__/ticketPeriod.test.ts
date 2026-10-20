import {
  computeTicketProgress,
  describeTicketPeriod,
  currentTicketPeriod,
  ticketPeriodKey,
  TicketProfile,
} from "@/utils/ticketPeriod";
import { Trip } from "@/types/trip";

const ticket = (
  startDate: string | null,
  period: TicketProfile["period"] = "year",
): TicketProfile => ({
  label: "KlimaTicket Ö Classic",
  cost: 1000,
  period,
  startDate,
});

const trip = (date: Date, cost: number): Trip => ({
  id: date.toISOString() + cost,
  date,
  origin: "A",
  destination: "B",
  transportType: "Train",
  cost,
  distance: 10,
  description: "",
});

describe("currentTicketPeriod", () => {
  it("is null without a start date", () => {
    expect(currentTicketPeriod(ticket(null))).toBeNull();
  });

  it("finds the yearly period containing now, across renewals", () => {
    const p = currentTicketPeriod(ticket("2025-03-01"), new Date(2026, 9, 20))!;
    expect(p.start).toEqual(new Date(2026, 2, 1));
    expect(p.end).toEqual(new Date(2027, 2, 1));
  });

  it("handles monthly tickets", () => {
    const p = currentTicketPeriod(ticket("2026-10-05", "month"), new Date(2026, 9, 20))!;
    expect(p.start).toEqual(new Date(2026, 9, 5));
    expect(p.end).toEqual(new Date(2026, 10, 5));
  });

  it("uses the first period when the ticket hasn't started yet", () => {
    const p = currentTicketPeriod(ticket("2026-12-01"), new Date(2026, 9, 20))!;
    expect(p.start).toEqual(new Date(2026, 11, 1));
  });
});

describe("ticketPeriodKey", () => {
  it("is the period start, or 'all' without a start date", () => {
    expect(ticketPeriodKey(ticket("2025-03-01"), new Date(2026, 9, 20))).toBe("2026-03-01");
    expect(ticketPeriodKey(ticket(null))).toBe("all");
  });
});

describe("computeTicketProgress", () => {
  const now = new Date(2026, 9, 20, 12);
  const trips = [
    trip(new Date(2026, 1, 28), 400), // previous period
    trip(new Date(2026, 2, 1, 8), 300), // first day of current period
    trip(new Date(2026, 9, 19), 500),
  ];

  it("counts only trips in the current period", () => {
    const p = computeTicketProgress(trips, ticket("2025-03-01"), now);
    expect(p.trips).toHaveLength(2);
    expect(p.valueUsed).toBe(800);
    expect(p.remaining).toBe(200);
    expect(p.netSavings).toBe(-200);
    expect(p.percent).toBeCloseTo(80);
    expect(p.daysLeft).toBeGreaterThan(130);
  });

  it("counts all trips without a start date", () => {
    const p = computeTicketProgress(trips, ticket(null), now);
    expect(p.valueUsed).toBe(1200);
    expect(p.remaining).toBe(0);
    expect(p.netSavings).toBe(200);
    expect(p.percent).toBe(100);
    expect(p.daysLeft).toBeNull();
  });
});

describe("describeTicketPeriod", () => {
  it("names the period and the days left", () => {
    const now = new Date(2026, 9, 20, 12);
    const p = computeTicketProgress([], ticket("2025-03-01"), now);
    const text = describeTicketPeriod(p, "year")!;
    expect(text).toMatch(/^Ticket year since 1 Mar 2026 · \d+ days left$/);
  });

  it("is null without a start date", () => {
    expect(describeTicketPeriod(computeTicketProgress([], ticket(null)), "year")).toBeNull();
  });
});
