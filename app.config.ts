import { ExpoConfig, ConfigContext } from "expo/config";

// Palette.blue.dark: the app background, also used for splash and icon backgrounds.
const BACKGROUND = "#00334f";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KlimaChallenge",
  // The slug is tied to the EAS project (extra.eas.projectId); changing it breaks EAS builds.
  slug: "travelapp",
  scheme: "klimachallenge",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  // The UI is designed dark-only.
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.itslucky.travelapp",
  },
  android: {
    package: "com.itslucky.travelapp",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: BACKGROUND,
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: BACKGROUND,
      },
    ],
    "@react-native-community/datetimepicker",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "e77e74b3-2c64-4361-b479-df2a41050827",
    },
  },
});
