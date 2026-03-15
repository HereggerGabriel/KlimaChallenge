import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Palette } from '@/constants/Colors';
import { getLevelTitle } from '@/utils/levelSystem';

interface UserLevelCardProps {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  onQuestsPress?: () => void;
}

export default function UserLevelCard({ level, currentXP, xpToNextLevel, onQuestsPress }: UserLevelCardProps) {
  const progress = Math.min((currentXP / xpToNextLevel) * 100, 100);
  const title = getLevelTitle(level);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(progress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  return (
    <LinearGradient
      colors={[Palette.blue.mid, Palette.blue.dark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <ThemedText style={styles.levelText}>Level {level}</ThemedText>
        <ThemedText style={styles.titleText}>{title}</ThemedText>
      </View>

      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.xpText}>
          {currentXP} / {xpToNextLevel} XP
        </ThemedText>
        <ThemedText style={styles.percentageText}>
          {Math.round(progress)}%
        </ThemedText>
      </View>

      {onQuestsPress && (
        <TouchableOpacity style={styles.questsButton} onPress={onQuestsPress} activeOpacity={0.75}>
          <MaterialIcons name="assignment" size={14} color="rgba(255,255,255,0.6)" />
          <ThemedText style={styles.questsButtonText}>Quests & Achievements</ThemedText>
          <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Palette.green.mid,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xpText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  percentageText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  questsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  questsButtonText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
});
