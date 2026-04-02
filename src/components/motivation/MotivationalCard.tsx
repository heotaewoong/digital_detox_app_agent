import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/utils/theme';

interface MotivationalCardProps {
  message: string;
  dream?: string;
  onDismiss?: () => void;
}

export default function MotivationalCard({
  message,
  dream,
  onDismiss,
}: MotivationalCardProps) {
  return (
    <LinearGradient
      colors={[colors.primaryStart, colors.primaryEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, shadows.glow]}
    >
      <View style={styles.glassCard}>
        {/* Motivational Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Dream Reminder */}
        {dream ? (
          <View style={styles.dreamContainer}>
            <Text style={styles.dreamLabel}>나의 꿈</Text>
            <Text style={styles.dreamText}>{dream}</Text>
          </View>
        ) : null}

        {/* Dismiss Button */}
        {onDismiss ? (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>확인했어요</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: spacing.lg,
  },
  message: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dreamContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dreamLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  dreamText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  dismissText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
