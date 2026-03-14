import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette } from '@/constants/Colors';

interface UserLevelCardProps {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
}

const getLevelTitle = (level: number): string => {
  if (level < 5) return 'Novice Explorer';
  if (level < 10) return 'Adventure Seeker';
  if (level < 15) return 'Journey Master';
  if (level < 20) return 'Travel Expert';
  if (level < 25) return 'Globe Trotter';
  if (level < 30) return 'World Wanderer';
  return 'Legendary Voyager';
};

export default function UserLevelCard({ level, currentXP, xpToNextLevel }: UserLevelCardProps) {
  const progress = (currentXP / xpToNextLevel) * 100;
  const title = getLevelTitle(level);

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
        <View 
          style={[styles.progressFill, { width: `${progress}%` }]}
        />
      </View>
      
      <View style={styles.footer}>
        <ThemedText style={styles.xpText}>
          {currentXP} / {xpToNextLevel} XP
        </ThemedText>
        <ThemedText style={styles.percentageText}>
          {Math.round(progress)}%
        </ThemedText>
      </View>
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
}); 