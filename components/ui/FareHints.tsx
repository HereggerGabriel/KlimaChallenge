import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import { CheckPriceLink } from "@/components/ui/CheckPriceLink";
import { FARE_HINT, FareSuggestion } from "@/services/fareEstimate";

type Props = {
  costSource: FareSuggestion["source"] | null;
  estimateAlternative: FareSuggestion["estimate"] | null;
  onUseEstimate: () => void;
  distanceFromNetwork: boolean;
  origin: string;
  destination: string;
  date?: Date;
};

const ESTIMATE_LABEL = { oebb: "ÖBB estimate", local: "Typical fare" } as const;

/**
 * Explains where the suggested ticket value and distance come from, offers the
 * generic estimate when a remembered price was used, and links to ÖBB to check
 * the real price. Shared by the add-trip and edit-trip forms.
 */
export function FareHints({
  costSource,
  estimateAlternative,
  onUseEstimate,
  distanceFromNetwork,
  origin,
  destination,
  date,
}: Props) {
  return (
    <View style={styles.box}>
      {costSource && <ThemedText style={styles.hint}>€ · {FARE_HINT[costSource]}</ThemedText>}
      {estimateAlternative && (
        <TouchableOpacity onPress={onUseEstimate} accessibilityRole="button">
          <ThemedText style={styles.hint}>
            {ESTIMATE_LABEL[estimateAlternative.source]}: €{estimateAlternative.price.toFixed(2)} ·{" "}
            <ThemedText style={styles.action}>Use</ThemedText>
          </ThemedText>
        </TouchableOpacity>
      )}
      {distanceFromNetwork && (
        <ThemedText style={styles.hint}>km · Rail distance from the ÖBB timetable</ThemedText>
      )}
      <CheckPriceLink origin={origin} destination={destination} date={date} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 6,
    gap: 2,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: Palette.blue.light,
  },
  action: {
    fontSize: 12,
    color: Palette.green.mid,
    fontWeight: "700",
  },
});
