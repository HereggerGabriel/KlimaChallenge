import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Pressable, TextInput } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import { searchStations } from "@/services/stations";

const MAX_SUGGESTIONS = 6;
const MAX_RECENT = 3;

type TripRouteFieldsProps = {
  origin: string;
  onOriginChange: (v: string) => void;
  destination: string;
  onDestinationChange: (v: string) => void;
  /** Places from the user's own trips, most used first. */
  recentPlaces?: string[];
};

type Suggestion = { name: string; kind: "recent" | "station" };

/** Recent places matching the text first, then stations from the bundled ÖBB list. */
function buildSuggestions(text: string, recentPlaces: string[]): Suggestion[] {
  const query = text.trim().toLowerCase();
  if (query.length < 2) return [];
  const recent = recentPlaces
    .filter((p) => p.toLowerCase().includes(query) && p !== text)
    .slice(0, MAX_RECENT)
    .map((name) => ({ name, kind: "recent" as const }));
  const taken = new Set(recent.map((s) => s.name.toLowerCase()));
  const stations = searchStations(text, MAX_SUGGESTIONS)
    .filter((s) => s.name !== text && !taken.has(s.name.toLowerCase()))
    .map((s) => ({ name: s.name, kind: "station" as const }));
  return [...recent, ...stations].slice(0, MAX_SUGGESTIONS);
}

function PlaceInput({
  label,
  value,
  onChange,
  placeholder,
  recentPlaces,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  recentPlaces: string[];
}) {
  // Hide suggestions after picking one, until the user types again.
  const [picked, setPicked] = useState(false);
  const suggestions = useMemo(
    () => (picked ? [] : buildSuggestions(value, recentPlaces)),
    [picked, value, recentPlaces],
  );

  return (
    <>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(v) => {
            onChange(v);
            setPicked(false);
          }}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCorrect={false}
        />
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((s) => (
            <Pressable
              key={`${s.kind}:${s.name}`}
              style={styles.suggestionItem}
              onPress={() => {
                onChange(s.name);
                setPicked(true);
              }}
            >
              <MaterialIcons
                name={s.kind === "recent" ? "history" : "train"}
                size={14}
                color="rgba(255,255,255,0.4)"
              />
              <ThemedText style={styles.suggestionText}>{s.name}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

export function TripRouteFields({
  origin,
  onOriginChange,
  destination,
  onDestinationChange,
  recentPlaces = [],
}: TripRouteFieldsProps) {
  const handleSwap = () => {
    onOriginChange(destination);
    onDestinationChange(origin);
  };

  return (
    <View>
      <PlaceInput
        label="Origin"
        value={origin}
        onChange={onOriginChange}
        placeholder="Station or place"
        recentPlaces={recentPlaces}
      />

      <TouchableOpacity
        style={styles.swapButton}
        onPress={handleSwap}
        accessibilityLabel="Swap origin and destination"
      >
        <MaterialIcons name="swap-vert" size={20} color="#fff" />
      </TouchableOpacity>

      <PlaceInput
        label="Destination"
        value={destination}
        onChange={onDestinationChange}
        placeholder="Station or place"
        recentPlaces={recentPlaces}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  suggestionList: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  suggestionText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  swapButton: {
    alignSelf: "center",
    padding: 6,
    marginTop: 8,
    marginBottom: -4,
    borderRadius: 20,
    backgroundColor: Palette.green.mid,
    zIndex: 1,
  },
});
