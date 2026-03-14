/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export const Palette = {
	blue: {
		light: "#84c5dd",
		mid: "#0b6c8a",
		dark: "#00334f",
	},
	green: {
		light: "#9dcda2",
		mid: "#3fb28f",
		dark: "#418880",
	},
	red: {
		light: "#eb6c4c",
		mid: "#e95b20",
		dark: "#e63c35",
	},
	white: "#fff",
	black: "#000",
};

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
	light: {
		text: "#11181C",
		background: "#fff",
		tint: tintColorLight,
		icon: "#687076",
		tabIconDefault: "#687076",
		tabIconSelected: tintColorLight,
	},
	dark: {
		text: "#ECEDEE",
		background: "#151718",
		tint: tintColorDark,
		icon: "#9BA1A6",
		tabIconDefault: "#9BA1A6",
		tabIconSelected: tintColorDark,
	},
};
