import React from "react";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import { OEBB_SHOP_URL } from "@/services/fareEstimate";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * ÖBB journey planner (Scotty) with origin, destination and time filled in. Its
 * results link each connection to the ticket shop with the route pre-filled
 * ("Ticket und Preise"), which shows the official price including Verbund
 * tickets. Station names that ÖBB spells differently show a short selection list.
 * Scotty's classic version is marked as deprecated; if it disappears, switch
 * this to OEBB_SHOP_URL.
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

/**
 * Lets the user look up the official price for their route at ÖBB and type it
 * in once; the app then remembers it for that route.
 */
export function CheckPriceLink({
  origin,
  destination,
  date,
}: {
  origin: string;
  destination: string;
  date?: Date;
}) {
  if (!origin.trim() || !destination.trim()) return null;

  const open = () =>
    Linking.openURL(oebbJourneyUrl(origin, destination, date ?? new Date())).catch(() =>
      Linking.openURL(OEBB_SHOP_URL).catch(() => {}),
    );

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={open}
      accessibilityRole="link"
      accessibilityHint="Opens the ÖBB timetable with this route. Tap Ticket und Preise for the price."
    >
      <MaterialIcons name="open-in-new" size={14} color={Palette.green.mid} />
      <View style={styles.textBlock}>
        <ThemedText style={styles.text}>Check price at ÖBB</ThemedText>
        <ThemedText style={styles.subtext}>
          Opens your route in the ÖBB timetable · tap “Ticket und Preise”
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  textBlock: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    lineHeight: 16,
    color: Palette.green.mid,
    fontWeight: "600",
  },
  subtext: {
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(255,255,255,0.45)",
  },
});
