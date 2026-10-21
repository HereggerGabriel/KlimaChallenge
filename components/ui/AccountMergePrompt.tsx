import { useEffect } from "react";
import { Alert } from "react-native";
import { useAppData } from "@/store/AppData";

/**
 * Asks once after logging in to an existing account while this phone still has
 * trips (usually from using the app without an account). App-wide, so it also
 * comes back after a restart if it was never answered.
 */
export function AccountMergePrompt() {
  const { pendingMerge, resolveMerge } = useAppData();
  const count = pendingMerge?.tripCount ?? 0;

  useEffect(() => {
    if (count === 0) return;
    const one = count === 1;
    const trips = one ? "the trip" : `the ${count} trips`;
    Alert.alert(
      one
        ? "Add the trip from this phone to your account?"
        : `Add the ${count} trips from this phone to your account?`,
      `Yes: ${one ? "it's" : "they're"} added to the trips already in your account.\nNo: only your account's trips are kept, and ${trips} from this phone ${one ? "is" : "are"} removed.`,
      [
        { text: "No", style: "destructive", onPress: () => resolveMerge(false) },
        { text: "Yes, add them", onPress: () => resolveMerge(true) },
      ],
      { cancelable: false },
    );
  }, [count, resolveMerge]);

  return null;
}
