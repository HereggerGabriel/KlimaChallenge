import React from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Palette } from "@/constants/Colors";
import { useAppData } from "@/store/AppData";

/**
 * Small cloud icon, shown only while the backup is failing. Tapping it explains
 * what's going on and offers to try again. The app keeps working either way.
 */
export function SyncStatusBadge() {
  const { syncStatus, syncNow } = useAppData();
  if (!syncStatus.failed) return null;

  const explain = () => {
    const { pending } = syncStatus;
    Alert.alert(
      "Backup paused",
      (pending > 0
        ? `${pending} change${pending === 1 ? " is" : "s are"} saved on this phone but not backed up yet.`
        : "Your account's trips haven't been downloaded to this phone yet.") +
        " This usually means there's no internet connection. The app tries again by itself.",
      [
        { text: "OK", style: "cancel" },
        {
          text: "Try again",
          onPress: async () => {
            const result = await syncNow();
            if (result.failed) Alert.alert("Still no connection", "We'll keep trying.");
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={explain}
      style={styles.badge}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Backup paused. Tap for details."
    >
      <MaterialIcons name="cloud-off" size={18} color={Palette.red.light} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Palette.red.light,
  },
});
