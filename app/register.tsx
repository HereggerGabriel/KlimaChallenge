import React from "react";
import { View, StyleSheet, ImageBackground, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RegisterForm from "@/components/ui/RegisterForm";
import { Palette } from "@/constants/Colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("@/assets/images/loginbg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="light" />

      <LinearGradient
        colors={["rgba(0,20,40,0.35)", "rgba(0,20,40,0.72)", Palette.blue.dark]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Brand block */}
      <View style={[styles.brandBlock, { paddingTop: insets.top + 40 }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🚊</Text>
        </View>
        <Text style={styles.appName}>Create Account</Text>
        <Text style={styles.tagline}>JOIN THE KLIMACHALLENGE</Text>
      </View>

      {/* Form */}
      <View style={[styles.formArea, { paddingBottom: insets.bottom + 32 }]}>
        <RegisterForm />
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
