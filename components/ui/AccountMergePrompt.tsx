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
    const trips = `${count} trip${count === 1 ? "" : "s"}`;
    Alert.alert(
      `Add the ${trips} from this phone to your account?`,
      `Yes: they're added to the trips already in your account.\nNo: only your account's trips are kept, and the ${trips} are removed from this phone.`,
      [
        { text: "No", style: "destructive", onPress: () => resolveMerge(false) },
        { text: "Yes, add them", onPress: () => resolveMerge(true) },
      ],
      { cancelable: false },
    );
  }, [count, resolveMerge]);

  return null;
}
