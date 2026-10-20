import "react-native-url-polyfill/auto";
import { Slot } from "expo-router";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Dev-only: the Expo dev client keeps the screen awake while developing and
// fails with this error when the app is backgrounded. Harmless, and it never
// happens in release builds.
LogBox.ignoreLogs(["Unable to activate keep awake"]);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
