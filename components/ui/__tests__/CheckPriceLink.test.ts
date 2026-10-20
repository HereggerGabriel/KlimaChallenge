import { oebbJourneyUrl } from "@/components/ui/CheckPriceLink";

describe("oebbJourneyUrl", () => {
  it("fills origin, destination, date and time, URL-encoded", () => {
    const url = oebbJourneyUrl(
      " Villach Hauptbahnhof ",
      "Velden/Wörthersee",
      new Date(2026, 9, 21, 7, 5),
    );
    expect(url).toBe(
      "https://fahrplan.oebb.at/bin/query.exe/dn?" +
        "S=Villach%20Hauptbahnhof&Z=Velden%2FW%C3%B6rthersee&date=21.10.2026&time=07:05&start=1",
    );
  });
});
