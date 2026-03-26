import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/utils/theme';

interface MonitorStatusProps {
  isActive: boolean;
  isSimulation: boolean;
  totalDetections: number;
  todayDetections: number;
}

export default function MonitorStatus({
  isActive,
  isSimulation,
  totalDetections,
  todayDetections,
}: MonitorStatusProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) {
      pulseAnim.setValue(1);
      return;
    }

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1600);

    return () => clearInterval(interval);
  }, [isActive, pulseAnim]);

  return (
    <LinearGradient
      colors={
        isActive
          ? [colors.primaryStart, colors.primaryEnd]
          : [colors.surface, colors.surfaceLight]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadows.lg]}
    >
      {/* Status Header */}
      <View style={styles.statusRow}>
        <View style={styles.statusIndicator}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: isActive ? colors.accentGreen : colors.textMuted,
                opacity: isActive ? pulseAnim : 1,
              },
            ]}
          />
          <Text style={styles.statusText}>
            {isActive ? '모니터링 활성' : '모니터링 비활성'}
          </Text>
        </View>
        {isSimulation && (
          <View style={styles.simulationBadge}>
            <Text style={styles.simulationText}>시뮬레이션</Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalDetections}</Text>
          <Text style={styles.statLabel}>전체 탐지</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{todayDetections}</Text>
          <Text style={styles.statLabel}>오늘 탐지</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  simulationBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: colors.accentYellow,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  simulationText: {
    color: colors.accentYellow,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
