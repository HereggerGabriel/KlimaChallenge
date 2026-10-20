import React from "react";
import { Linking, StyleSheet, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import { OEBB_SHOP_URL } from "@/services/fareEstimate";

/**
 * Opens the ÖBB ticket shop so the user can look up the official price for
 * their route (including Verbund tickets) and type it in once; the app then
 * remembers it for that route.
 */
export function CheckPriceLink({ origin, destination }: { origin: string; destination: string }) {
  if (!origin.trim() || !destination.trim()) return null;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => Linking.openURL(OEBB_SHOP_URL).catch(() => {})}
      accessibilityRole="link"
      accessibilityHint={`Opens the ÖBB ticket shop. Search for ${origin} to ${destination}.`}
    >
      <MaterialIcons name="open-in-new" size={14} color={Palette.green.mid} />
      <ThemedText style={styles.text} numberOfLines={2}>
        Check price at ÖBB: search {origin.trim()} → {destination.trim()}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: Palette.green.mid,
    fontWeight: "600",
  },
});
