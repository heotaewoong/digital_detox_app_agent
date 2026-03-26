import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { MotivationGenerator } from '@/services/ai/MotivationGenerator';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/utils/theme';

const { width, height } = Dimensions.get('window');
const COOLDOWN_SECONDS = 30;

export default function InterventionScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);

  const [countdown, setCountdown] = useState(COOLDOWN_SECONDS);
  const [motivationText] = useState(() => MotivationGenerator.getQuickMotivation());
  const [dreamReminder] = useState(() =>
    MotivationGenerator.getDreamReminder(profile?.dreams ?? []),
  );

  const shieldScale = useState(() => new Animated.Value(0))[0];
  const contentOpacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.sequence([
      Animated.spring(shieldScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shieldScale, contentOpacity]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const isButtonActive = countdown === 0;

  const handleGoBack = useCallback(() => {
    if (!isButtonActive) return;
    router.back();
  }, [isButtonActive, router]);

  const handleGoToDashboard = useCallback(() => {
    router.replace('/(tabs)/dashboard');
  }, [router]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient
      colors={['#2D1B69', '#1A1145', '#0D1B2A']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Shield Icon */}
      <Animated.View
        style={[styles.shieldContainer, { transform: [{ scale: shieldScale }] }]}
      >
        <LinearGradient
          colors={[colors.accentRed, '#C0392B']}
          style={styles.shieldCircle}
        >
          <Ionicons name="shield-checkmark" size={64} color={colors.textPrimary} />
        </LinearGradient>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {/* Title */}
        <Text style={styles.title}>유해 콘텐츠가 감지되었습니다</Text>
        <Text style={styles.subtitle}>
          ContentGuardian이 유해한 콘텐츠를 차단했습니다
        </Text>

        {/* Motivation Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color={colors.accentYellow} />
            <Text style={styles.cardHeaderText}>AI 동기부여 메시지</Text>
          </View>
          <Text style={styles.motivationText}>{motivationText}</Text>
        </View>

        {/* Dream Reminder Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={20} color={colors.accent} />
            <Text style={styles.cardHeaderText}>나의 꿈</Text>
          </View>
          <Text style={styles.dreamText}>{dreamReminder}</Text>
        </View>

        {/* Countdown Timer */}
        <View style={styles.timerContainer}>
          {!isButtonActive ? (
            <>
              <Ionicons name="time-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.timerText}>
                {formatCountdown(countdown)} 후에 돌아갈 수 있습니다
              </Text>
            </>
          ) : (
            <Text style={styles.timerReadyText}>이제 돌아갈 수 있습니다</Text>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.backButton, !isButtonActive && styles.backButtonDisabled]}
            onPress={handleGoBack}
            disabled={!isButtonActive}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isButtonActive ? colors.textPrimary : colors.textMuted}
            />
            <Text
              style={[
                styles.backButtonText,
                !isButtonActive && styles.backButtonTextDisabled,
              ]}
            >
              돌아가기
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={handleGoToDashboard}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.primaryStart, colors.primaryEnd]}
              style={styles.dashboardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="grid" size={20} color={colors.textPrimary} />
              <Text style={styles.dashboardButtonText}>대시보드로 이동</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  shieldContainer: {
    marginBottom: spacing.xl,
  },
  shieldCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accentRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 15,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  motivationText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  dreamText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.accent,
    lineHeight: 24,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  timerText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  timerReadyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.accentGreen,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  backButtonDisabled: {
    opacity: 0.4,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  backButtonTextDisabled: {
    color: colors.textMuted,
  },
  dashboardButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  dashboardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dashboardButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
});
