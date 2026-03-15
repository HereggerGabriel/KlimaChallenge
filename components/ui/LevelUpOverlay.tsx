import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { Palette } from "@/constants/Colors";
import { getLevelTitle } from "@/utils/levelSystem";

interface LevelUpOverlayProps {
  visible: boolean;
  newLevel: number;
  onDone: () => void;
}

export function LevelUpOverlay({ visible, newLevel, onDone }: LevelUpOverlayProps) {
  const bgOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    // Reset
    bgOpacity.value = 0;
    cardScale.value = 0.6;
    cardOpacity.value = 0;

    // Phase 1: fade in bg + spring card in
    bgOpacity.value = withTiming(0.88, { duration: 300 });
    cardOpacity.value = withTiming(1, { duration: 250 });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 180 });

    // Phase 2: hold 2s then fade out everything
    bgOpacity.value = withSequence(
      withTiming(0.88, { duration: 300 }),
      withTiming(0.88, { duration: 2000 }),
      withTiming(0, { duration: 500 }),
    );
    cardOpacity.value = withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(1, { duration: 2050 }),
      withTiming(0, { duration: 450 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    cardScale.value = withSequence(
      withSpring(1, { damping: 12, stiffness: 180 }),
      withDelay(2300, withTiming(0.85, { duration: 450 })),
    );
  }, [visible]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  if (!visible && bgOpacity.value === 0) return null;

  return (
    <Animated.View style={[styles.backdrop, bgStyle]} pointerEvents="none">
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.levelUpLabel}>LEVEL UP</Text>
        <Text style={styles.levelNumber}>{newLevel}</Text>
        <View style={styles.divider} />
        <Text style={styles.titleText}>{getLevelTitle(newLevel)}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 15, 30, 1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  card: {
    backgroundColor: Palette.blue.mid,
    borderWidth: 2,
    borderColor: Palette.green.mid,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 56,
    alignItems: "center",
    shadowColor: Palette.green.mid,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  levelUpLabel: {
    color: Palette.green.mid,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 12,
  },
  levelNumber: {
    color: "#fff",
    fontSize: 72,
    fontWeight: "900",
    lineHeight: 80,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: Palette.green.mid,
    borderRadius: 1,
    marginVertical: 16,
    opacity: 0.6,
  },
  titleText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
