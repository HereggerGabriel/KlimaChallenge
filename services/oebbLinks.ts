// Links into ÖBB's public websites. We only open their pages with parameters;
// nothing is fetched or scraped by the app.

/**
 * ÖBB ticket shop. ÖBB offers pre-filled route links only to partners on
 * request, and the shop sits behind a bot check, so this opens the plain shop.
 */
export const OEBB_SHOP_URL = "https://shop.oebbtickets.at/de/ticket";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * ÖBB journey planner (Scotty) with origin, destination and time filled in. Its
 * results link each connection to the ticket shop with the route pre-filled
 * ("Ticket und Preise"), which shows the official price including Verbund
 * tickets. Station names that ÖBB spells differently show a short selection list.
 * Scotty's classic version is marked as deprecated; if it disappears, switch
 * callers to OEBB_SHOP_URL.
 */
export function oebbJourneyUrl(origin: string, destination: string, when: Date): string {
  const params = [
    `S=${encodeURIComponent(origin.trim())}`,
    `Z=${encodeURIComponent(destination.trim())}`,
    `date=${pad(when.getDate())}.${pad(when.getMonth() + 1)}.${when.getFullYear()}`,
    `time=${pad(when.getHours())}:${pad(when.getMinutes())}`,
    "start=1",
  ];
  return `https://fahrplan.oebb.at/bin/query.exe/dn?${params.join("&")}`;
}
