import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Palette } from "@/constants/Colors";

async function getInitialRoute(): Promise<"/onboarding" | "/(tabs)"> {
  try {
    const auth = await AsyncStorage.getItem("isAuthenticated");
    return auth === "true" ? "/(tabs)" : "/onboarding";
  } catch {
    return "/onboarding";
  }
}

export default function SplashScreen() {
  const logoScale = useSharedValue(0.72);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 650 });
    logoOpacity.value = withTiming(1, { duration: 650 });
    glowOpacity.value = withDelay(200, withTiming(1, { duration: 700 }));
    textOpacity.value = withDelay(450, withTiming(1, { duration: 550 }));

    const timer = setTimeout(async () => {
      const route = await getInitialRoute();
      router.replace(route);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Glow behind logo */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Logo circle */}
      <Animated.View style={[styles.logoCircle, logoStyle]}>
        <Text style={styles.logoEmoji}>🚊</Text>
      </Animated.View>

      {/* App name + tagline */}
      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={styles.appName}>TravelApp</Text>
        <Text style={styles.tagline}>Track. Save. Beat Break-Even.</Text>
      </Animated.View>

      {/* Bottom version hint */}
      <Animated.View style={[styles.versionBlock, textStyle]}>
        <Text style={styles.version}>KlimaChallenge</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.blue.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Palette.green.mid,
    opacity: 0.18,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Palette.green.dark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: Palette.green.mid,
    shadowColor: Palette.green.mid,
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  logoEmoji: {
    fontSize: 48,
  },
  textBlock: {
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  appName: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  tagline: {
    color: Palette.blue.light,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  versionBlock: {
    position: "absolute",
    bottom: 48,
  },
  version: {
    color: Palette.green.mid,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
});
