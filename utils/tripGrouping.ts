import { Trip } from "@/types/trip";

export type TripGroup = { label: string; trips: Trip[] };

export function formatDateLabel(date: Date): string {
	const d = date instanceof Date ? date : new Date(date);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (d.toDateString() === today.toDateString()) return "Today";
	if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
	return d.toLocaleDateString("en-AT", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function groupTripsByDate(trips: Trip[]): TripGroup[] {
	const groups: TripGroup[] = [];
	const seen = new Map<string, TripGroup>();
	for (const trip of trips) {
		const d = trip.date instanceof Date ? trip.date : new Date(trip.date);
		const label = formatDateLabel(d);
		if (!seen.has(label)) {
			const group: TripGroup = { label, trips: [] };
			groups.push(group);
			seen.set(label, group);
		}
		seen.get(label)!.trips.push(trip);
	}
	return groups;
}
