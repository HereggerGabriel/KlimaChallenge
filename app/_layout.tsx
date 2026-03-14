import "react-native-url-polyfill/auto";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Import your global CSS file
import "../global.css";

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Slot />
		</GestureHandlerRootView>
	);
}
