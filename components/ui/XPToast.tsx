import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Palette } from "@/constants/Colors";

interface XPToastProps {
  xp: number | null;
  onDone: () => void;
}

export function XPToast({ xp, onDone }: XPToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (xp === null) return;

    // Reset
    opacity.value = 0;
    translateY.value = 0;
    scale.value = 0.5;

    // Spring scale in
    scale.value = withSpring(1, { damping: 11, stiffness: 220 });

    // Fade in → hold → fade out
    opacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );

    // Float up after hold
    translateY.value = withSequence(
      withTiming(0, { duration: 750 }),
      withTiming(-52, { duration: 400 }),
    );
  }, [xp]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]} pointerEvents="none">
      <Text style={styles.text}>+{xp ?? 0} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    top: 210,
    backgroundColor: Palette.green.dark,
    borderWidth: 1.5,
    borderColor: Palette.green.mid,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: Palette.green.mid,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    zIndex: 100,
  },
  text: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
