import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import { TRANSPORT_COLOR, transportIcon } from "@/constants/transport";
import { TripRouteFields } from "@/components/ui/TripRouteFields";
import { useTripAutofill } from "@/hooks/useTripAutofill";
import { formatDateLabel } from "@/utils/tripGrouping";

type PrefillData = {
  origin: string;
  destination: string;
  transportType: string;
  cost: string;
  distance: string;
  description: string;
};

type QuickAddTripModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (trip: {
    date: Date;
    origin: string;
    destination: string;
    transportType: string;
    cost: number;
    description?: string;
    distance: number;
  }) => void;
  recentPlaces?: string[];
  prefill?: PrefillData;
};

const TRANSPORT_TYPES = ["Train", "Bus", "Tram", "Subway"];

const COST_HINT = {
  oebb: "Estimated ÖBB standard fare (2nd class) · edit if needed",
  remembered: "Your price from last time",
  local: "Typical city fare · edit if needed",
} as const;

export function QuickAddTripModal({
  visible,
  onClose,
  onSubmit,
  recentPlaces = [],
  prefill,
}: QuickAddTripModalProps) {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [transportType, setTransportType] = useState("");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState("");
  const [distance, setDistance] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const autofill = useTripAutofill({
    origin,
    destination,
    transportType,
    cost,
    setCost,
    distance,
    setDistance,
  });

  // "Log again": take over the previous trip's values as they are.
  useEffect(() => {
    if (visible && prefill) {
      setDate(new Date());
      setOrigin(prefill.origin);
      setDestination(prefill.destination);
      setTransportType(prefill.transportType);
      setCost(prefill.cost);
      setDistance(prefill.distance);
      setDescription(prefill.description);
      autofill.initialize(prefill);
    }
    // Only react to the modal opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const canSubmit = Boolean(
    origin.trim() && destination.trim() && transportType && cost && distance,
  );

  const resetForm = () => {
    setDate(new Date());
    setOrigin("");
    setDestination("");
    setTransportType("");
    setCost("");
    setDescription("");
    setDistance("");
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await autofill.rememberIfTyped();
    onSubmit({
      date,
      origin: origin.trim(),
      destination: destination.trim(),
      transportType,
      cost: parseFloat(cost.replace(",", ".")),
      description: description.trim() || undefined,
      distance: parseFloat(distance.replace(",", ".")),
    });
    resetForm();
    onClose();
  };

  const timeLabel = date.toLocaleTimeString("en-AT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.modalScrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <ThemedText type="subtitle">Add Trip</ThemedText>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
                <MaterialIcons name="cancel" size={24} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <TripRouteFields
              origin={origin}
              onOriginChange={setOrigin}
              destination={destination}
              onDestinationChange={setDestination}
              recentPlaces={recentPlaces}
            />

            {/* Transport type: one tap */}
            <ThemedText style={styles.fieldLabel}>Transport</ThemedText>
            <View style={styles.chipRow}>
              {TRANSPORT_TYPES.map((type) => {
                const selected = transportType === type;
                const color = TRANSPORT_COLOR[type] ?? Palette.blue.mid;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      selected && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => setTransportType(type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <MaterialIcons
                      name={transportIcon(type)}
                      size={18}
                      color={selected ? "#fff" : "rgba(255,255,255,0.6)"}
                    />
                    <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ticket value + distance side by side */}
            <View style={styles.valueRow}>
              <View style={styles.valueColumn}>
                <ThemedText style={styles.fieldLabel}>Ticket value</ThemedText>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.affix}>€</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={cost}
                    onChangeText={autofill.onCostTyped}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>
              </View>
              <View style={styles.valueColumn}>
                <ThemedText style={styles.fieldLabel}>Distance</ThemedText>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { marginLeft: 0 }]}
                    value={distance}
                    onChangeText={autofill.onDistanceTyped}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <ThemedText style={styles.affix}>km</ThemedText>
                </View>
              </View>
            </View>
            {(autofill.costSource || autofill.distanceFromNetwork) && (
              <View style={styles.hintBox}>
                {autofill.costSource && (
                  <ThemedText style={styles.hintText}>
                    € · {COST_HINT[autofill.costSource]}
                  </ThemedText>
                )}
                {autofill.distanceFromNetwork && (
                  <ThemedText style={styles.hintText}>
                    km · Rail distance from the ÖBB timetable
                  </ThemedText>
                )}
              </View>
            )}

            {/* When: defaults to now */}
            <ThemedText style={styles.fieldLabel}>When</ThemedText>
            <View style={styles.valueRow}>
              <TouchableOpacity
                style={[styles.pickerButton, styles.valueColumn]}
                onPress={() => {
                  setShowTimePicker(false);
                  setShowDatePicker((v) => !v);
                }}
              >
                <MaterialIcons name="calendar-today" size={18} color="rgba(255,255,255,0.5)" />
                <ThemedText style={styles.pickerButtonText}>{formatDateLabel(date)}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerButton, styles.valueColumn]}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker((v) => !v);
                }}
              >
                <MaterialIcons name="access-time" size={18} color="rgba(255,255,255,0.5)" />
                <ThemedText style={styles.pickerButtonText}>{timeLabel}</ThemedText>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <>
                <DateTimePicker
                  value={date}
                  mode="date"
                  maximumDate={new Date()}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selected) => {
                    if (Platform.OS === "android") setShowDatePicker(false);
                    if (selected) {
                      const d = new Date(selected);
                      d.setHours(date.getHours(), date.getMinutes(), 0, 0);
                      setDate(d);
                    }
                  }}
                  textColor="#fff"
                  themeVariant="dark"
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.pickerDoneButton}
                  >
                    <ThemedText style={styles.pickerDoneText}>Done</ThemedText>
                  </TouchableOpacity>
                )}
              </>
            )}
            {showTimePicker && (
              <>
                <DateTimePicker
                  value={date}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  is24Hour={true}
                  onChange={(_, selected) => {
                    if (Platform.OS === "android") setShowTimePicker(false);
                    if (selected) setDate(selected);
                  }}
                  textColor="#fff"
                  themeVariant="dark"
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={styles.pickerDoneButton}
                  >
                    <ThemedText style={styles.pickerDoneText}>Done</ThemedText>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Note */}
            <View style={[styles.inputContainer, { marginTop: 10 }]}>
              <MaterialIcons name="chat-bubble-outline" size={18} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Note (optional)"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <ThemedText style={styles.submitButtonText}>Add Trip</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Palette.blue.dark,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
    marginTop: 12,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chipText: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
  valueRow: {
    flexDirection: "row",
    gap: 10,
  },
  valueColumn: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  input: { flex: 1, marginLeft: 8, fontSize: 15, color: "#fff" },
  affix: { fontSize: 15, color: "rgba(255,255,255,0.5)", paddingHorizontal: 2 },
  hintBox: {
    marginTop: 6,
    gap: 2,
  },
  hintText: {
    fontSize: 12,
    color: Palette.blue.light,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  pickerButtonText: { marginLeft: 8, fontSize: 15, color: "#fff" },
  pickerDoneButton: {
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pickerDoneText: {
    color: Palette.green.mid,
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: Palette.green.mid,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonDisabled: { backgroundColor: "rgba(255,255,255,0.15)" },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
