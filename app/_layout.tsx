import "react-native-url-polyfill/auto";
import { Slot } from "expo-router";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppDataProvider } from "@/store/AppData";
import { RewardFeedback } from "@/components/ui/RewardFeedback";

// Dev-only: the Expo dev client keeps the screen awake while developing and
// fails with this error when the app is backgrounded. Harmless, and it never
// happens in release builds.
LogBox.ignoreLogs(["Unable to activate keep awake"]);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppDataProvider>
        <Slot />
        {/* "+XP" toast and level-up overlay on top of every screen */}
        <RewardFeedback />
      </AppDataProvider>
    </GestureHandlerRootView>
  );
}
