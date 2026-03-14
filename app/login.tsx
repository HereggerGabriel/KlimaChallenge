import React from "react";
import { View, StyleSheet, ImageBackground, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import LoginForm from "@/components/ui/LoginForm";
import { Palette } from "@/constants/Colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("@/assets/images/loginbg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="light" />

      {/* Dark overlay so text/form remain readable over the map */}
      <LinearGradient
        colors={["rgba(0,20,40,0.35)", "rgba(0,20,40,0.72)", Palette.blue.dark]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Logo + brand — upper third */}
      <View style={[styles.brandBlock, { paddingTop: insets.top + 40 }]}>
        <View style={styles.logoCircle}>
          <ThemedText style={styles.logoEmoji}>🚊</ThemedText>
        </View>
        <ThemedText style={styles.appName}>TravelApp</ThemedText>
        <ThemedText style={styles.tagline}>KLIMACHALLENGE</ThemedText>
      </View>

      {/* Form — lower two-thirds */}
      <View style={[styles.formArea, { paddingBottom: insets.bottom + 32 }]}>
        <LoginForm />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.blue.dark,
  },
  brandBlock: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Palette.green.dark,
    borderWidth: 2,
    borderColor: Palette.green.mid,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: Palette.green.mid,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 32,
  },
  appName: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    color: Palette.green.light,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "600",
  },
  formArea: {
    paddingHorizontal: 28,
  },
});
