import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { MotivationGenerator } from '@/services/ai/MotivationGenerator';
import { AdaptiveInterventionEngine } from '@/services/ai/AdaptiveInterventionEngine';
import { MoodAnalyzer } from '@/services/ai/MoodAnalyzer';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/utils/theme';

const { width, height } = Dimensions.get('window');

export default function InterventionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; riskScore?: string }>();
  const profile = useUserStore((s) => s.profile);

  // Get adaptive intervention strategy based on current context
  const moodState = MoodAnalyzer.getCurrentMoodState();
  const [strategy] = useState(() => {
    const category = params.category ?? 'social_media';
    const riskScore = params.riskScore ? Number(params.riskScore) : 70;
    const contextAnalysis = {
      originalRiskScore: riskScore,
      adjustedRiskScore: riskScore,
      contextFactors: [category],
      recommendedAction: (riskScore >= 80 ? 'hard_block' : riskScore >= 65 ? 'soft_block' : riskScore >= 50 ? 'warn' : 'log') as any,
      reasoning: `카테고리: ${category}, 위험도: ${riskScore}`,
    };
    const goals = profile?.goals?.map((g) => g.title) ?? [];
    return AdaptiveInterventionEngine.selectStrategy(moodState, contextAnalysis, goals);
  });

  const COOLDOWN_SECONDS = strategy.cooldownSeconds;
  const [countdown, setCountdown] = useState(COOLDOWN_SECONDS);
  const [motivationText] = useState(() => MotivationGenerator.getQuickMotivation());
  const [dreamReminder] = useState(() =>
    MotivationGenerator.getDreamReminder(profile?.dreams ?? []),
  );
  const startTimeRef = useRef(Date.now());

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
  // Hard-block type never allows going back
  const canGoBack = strategy.type !== 'block';

  const recordResult = useCallback((complied: boolean) => {
    AdaptiveInterventionEngine.recordInterventionResult(
      strategy.type,
      complied ? 'complied' : 'dismissed',
    );
  }, [strategy.type]);

  const handleGoBack = useCallback(() => {
    if (!isButtonActive || !canGoBack) return;
    recordResult(true);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [isButtonActive, canGoBack, recordResult, router]);

  const handleGoToDashboard = useCallback(() => {
    recordResult(false);
    router.replace('/(tabs)/dashboard');
  }, [recordResult, router]);

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
        <Text style={styles.title}>{strategy.message}</Text>
        <Text style={styles.subtitle}>
          {strategy.type === 'block'
            ? '⛔ 강력 차단 모드 — 이 콘텐츠는 허용되지 않습니다'
            : strategy.type === 'delay'
            ? '🛑 콘텐츠가 차단되었습니다. 잠시 멈춰보세요'
            : 'ContentGuardian이 유해한 콘텐츠를 감지했습니다'}
        </Text>

        {/* Adaptive Strategy Badge */}
        <View style={[styles.strategyBadge, {
          backgroundColor: strategy.intensity >= 5 ? 'rgba(239,68,68,0.15)' :
                           strategy.intensity >= 4 ? 'rgba(251,191,36,0.15)' :
                           'rgba(139,92,246,0.15)',
          borderColor: strategy.intensity >= 5 ? 'rgba(239,68,68,0.4)' :
                       strategy.intensity >= 4 ? 'rgba(251,191,36,0.4)' :
                       'rgba(139,92,246,0.4)',
        }]}>
          <Text style={styles.strategyBadgeText}>
            🧠 AI 개입 강도: {strategy.intensity >= 5 ? '🔴 긴급' :
                             strategy.intensity >= 4 ? '🟠 높음' :
                             strategy.intensity >= 3 ? '🟡 보통' : '🟢 낮음'}
          </Text>
        </View>

        {/* Alternative Activity (if suggested) */}
        {strategy.suggestAlternative && (
          <View style={[styles.card, { borderColor: 'rgba(16,185,129,0.3)' }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="leaf" size={20} color="#10B981" />
              <Text style={styles.cardHeaderText}>대신 이렇게 해보세요</Text>
            </View>
            <Text style={[styles.motivationText, { color: '#10B981' }]}>
              {strategy.suggestAlternative}
            </Text>
          </View>
        )}

        {/* Motivation Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color={colors.accentYellow} />
            <Text style={styles.cardHeaderText}>AI 동기부여 메시지</Text>
          </View>
          <Text style={styles.motivationText}>{motivationText}</Text>
        </View>

        {/* Dream Reminder Card (show only if dreamReminder flag is on) */}
        {strategy.showDreamReminder && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={20} color={colors.accent} />
              <Text style={styles.cardHeaderText}>나의 꿈</Text>
            </View>
            <Text style={styles.dreamText}>{dreamReminder}</Text>
          </View>
        )}

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
          {canGoBack && (
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
                {strategy.actionLabel}
              </Text>
            </TouchableOpacity>
          )}

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

          {/* 동기부여 영상 버튼 */}
          <TouchableOpacity
            style={styles.motivationButton}
            onPress={() => router.push('/motivation-video' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="play-circle" size={18} color="#A855F7" />
            <Text style={styles.motivationButtonText}>🎯 목표 동기부여 영상 보기</Text>
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
  motivationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    marginTop: 8,
  },
  motivationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A855F7',
  },
  strategyBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  strategyBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E0E0FF',
  },
});
