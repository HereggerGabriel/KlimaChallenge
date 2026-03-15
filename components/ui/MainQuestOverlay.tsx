import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ThemedText';
import { Palette } from '@/constants/Colors';
import { MAIN_QUEST_XP } from '@/utils/questSystem';

const { width } = Dimensions.get('window');

interface MainQuestOverlayProps {
  visible: boolean;
  totalCost: number;
  klimaTicketCost: number;
  onGoToClaim: () => void;
}

// ── Floating star decoration ────────────────────────────────────────────────

function FloatingStar({
  left,
  top,
  size,
  delay,
  color,
}: {
  left: number;
  top: number;
  size: number;
  delay: number;
  color: string;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 120 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-18, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left,
    top,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <MaterialIcons name="star" size={size} color={color} />
    </Animated.View>
  );
}

// ── Main overlay ────────────────────────────────────────────────────────────

export function MainQuestOverlay({
  visible,
  totalCost,
  klimaTicketCost,
  onGoToClaim,
}: MainQuestOverlayProps) {
  const bgOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.75);
  const cardTranslateY = useSharedValue(60);
  const cardOpacity = useSharedValue(0);
  const trophyScale = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      bgOpacity.value = withTiming(0, { duration: 300 });
      cardOpacity.value = withTiming(0, { duration: 250 });
      return;
    }

    // Reset
    bgOpacity.value = 0;
    cardScale.value = 0.75;
    cardTranslateY.value = 60;
    cardOpacity.value = 0;
    trophyScale.value = 0;
    badgeScale.value = 0;

    // Backdrop
    bgOpacity.value = withTiming(0.92, { duration: 350 });

    // Card spring in
    cardOpacity.value = withTiming(1, { duration: 300 });
    cardScale.value = withSpring(1, { damping: 14, stiffness: 160 });
    cardTranslateY.value = withSpring(0, { damping: 14, stiffness: 160 });

    // Trophy pop
    trophyScale.value = withDelay(250, withSpring(1, { damping: 8, stiffness: 200 }));

    // XP badge pop
    badgeScale.value = withDelay(450, withSpring(1, { damping: 10, stiffness: 220 }));
  }, [visible]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }, { translateY: cardTranslateY.value }],
  }));
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (!visible && bgOpacity.value === 0) return null;

  const pct = Math.min((totalCost / klimaTicketCost) * 100, 100);

  return (
    <Animated.View style={[styles.backdrop, bgStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Floating stars */}
      <FloatingStar left={width * 0.08} top={120} size={22} delay={400} color={Palette.red.light} />
      <FloatingStar left={width * 0.78} top={100} size={18} delay={600} color={Palette.green.light} />
      <FloatingStar left={width * 0.15} top={280} size={14} delay={700} color={Palette.blue.light} />
      <FloatingStar left={width * 0.72} top={260} size={20} delay={500} color={Palette.red.light} />
      <FloatingStar left={width * 0.85} top={370} size={14} delay={800} color={Palette.green.mid} />
      <FloatingStar left={width * 0.04} top={400} size={16} delay={550} color={Palette.green.light} />

      <Animated.View style={[styles.card, cardStyle]}>
        {/* Badge */}
        <View style={styles.questBadge}>
          <ThemedText style={styles.questBadgeText}>MAIN QUEST</ThemedText>
        </View>

        {/* Trophy */}
        <Animated.View style={[styles.trophyWrap, trophyStyle]}>
          <MaterialIcons name="emoji-events" size={72} color={Palette.red.light} />
        </Animated.View>

        <ThemedText style={styles.title}>KlimaTicket{'\n'}Paid Off!</ThemedText>
        <ThemedText style={styles.subtitle}>
          Your logged trips have covered the full cost of your climate pass.
        </ThemedText>

        {/* Progress stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <ThemedText style={styles.statValue}>€{totalCost.toFixed(0)}</ThemedText>
            <ThemedText style={styles.statLabel}>Trips logged</ThemedText>
          </View>
          <MaterialIcons name="check-circle" size={22} color={Palette.green.mid} style={{ marginTop: 4 }} />
          <View style={styles.statBlock}>
            <ThemedText style={styles.statValue}>€{klimaTicketCost.toFixed(0)}</ThemedText>
            <ThemedText style={styles.statLabel}>KlimaTicket cost</ThemedText>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>

        {/* XP badge */}
        <Animated.View style={[styles.xpBadge, badgeStyle]}>
          <MaterialIcons name="bolt" size={18} color="#fff" />
          <ThemedText style={styles.xpBadgeText}>+{MAIN_QUEST_XP} XP</ThemedText>
        </Animated.View>

        {/* CTA */}
        <TouchableOpacity style={styles.claimButton} onPress={onGoToClaim} activeOpacity={0.85}>
          <MaterialIcons name="emoji-events" size={18} color="#fff" />
          <ThemedText style={styles.claimButtonText}>Claim Reward</ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 10, 20, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  card: {
    width: width * 0.86,
    backgroundColor: Palette.blue.mid,
    borderWidth: 2,
    borderColor: Palette.red.light,
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: Palette.red.light,
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
  },
  questBadge: {
    backgroundColor: Palette.red.light + '33',
    borderWidth: 1,
    borderColor: Palette.red.light + '66',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  questBadgeText: {
    color: Palette.red.light,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  trophyWrap: {
    marginVertical: 4,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'center',
  },
  statBlock: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Palette.green.mid,
    borderRadius: 3,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.green.mid,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  xpBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.red.light,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
    shadowColor: Palette.red.light,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
