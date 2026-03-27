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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { useMonitorStore } from '@/store/useMonitorStore';
import { MotivationGenerator } from '@/services/ai/MotivationGenerator';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/utils/theme';

const { width, height } = Dimensions.get('window');

type InterventionType = 'nudge' | 'reminder' | 'delay' | 'redirect' | 'block';

const COOLDOWN_MAP: Record<InterventionType, number> = {
  nudge: 0,
  reminder: 15,
  delay: 30,
  redirect: 30,
  block: 60,
};

const TITLE_MAP: Record<InterventionType, string> = {
  nudge: '잠깐, 확인해볼까요?',
  reminder: '목표를 떠올려보세요',
  delay: '잠시 멈추고 생각해보세요',
  redirect: '더 나은 활동을 해볼까요?',
  block: '유해 콘텐츠가 감지되었습니다',
};

const SUBTITLE_MAP: Record<InterventionType, string> = {
  nudge: '이 콘텐츠가 목표에 도움이 되는지 생각해보세요',
  reminder: '당신의 꿈과 목표를 기억하세요',
  delay: '잠시 후에 다시 결정할 수 있습니다',
  redirect: '대안 활동을 시도해보는 건 어떨까요?',
  block: 'ContentGuardian이 유해한 콘텐츠를 차단했습니다',
};

const ICON_MAP: Record<InterventionType, keyof typeof Ionicons.glyphMap> = {
  nudge: 'information-circle',
  reminder: 'bulb',
  delay: 'time',
  redirect: 'swap-horizontal',
  block: 'shield-checkmark',
};

const GRADIENT_MAP: Record<InterventionType, [string, string, string]> = {
  nudge: ['#1A2980', '#26D0CE', '#1A2980'],
  reminder: ['#2D1B69', '#6C5CE7', '#1A1145'],
  delay: ['#2D1B69', '#E17055', '#1A1145'],
  redirect: ['#1A1145', '#00B894', '#0D1B2A'],
  block: ['#2D1B69', '#1A1145', '#0D1B2A'],
};

export default function InterventionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    interventionType?: string;
    cooldownSeconds?: string;
    message?: string;
    suggestAlternative?: string;
    isStressDetected?: string;
  }>();

  const profile = useUserStore((s) => s.profile);
  const recordInterventionResult = useMonitorStore((s) => s.recordInterventionResult);

  const interventionType = (params.interventionType as InterventionType) || 'block';
  const cooldownSeconds = params.cooldownSeconds
    ? parseInt(params.cooldownSeconds, 10)
    : COOLDOWN_MAP[interventionType];
  const customMessage = params.message || null;
  const suggestAlternative = params.suggestAlternative || null;
  const isStressDetected = params.isStressDetected === 'true';

  const [countdown, setCountdown] = useState(cooldownSeconds);
  const [autoDismissed, setAutoDismissed] = useState(false);
  const [motivationText] = useState(() => MotivationGenerator.getQuickMotivation());
  const [dreamReminder] = useState(() =>
    MotivationGenerator.getDreamReminder(profile?.dreams ?? []),
  );

  const shieldScale = useState(() => new Animated.Value(0))[0];
  const contentOpacity = useState(() => new Animated.Value(0))[0];
  const bannerTranslateY = useState(() => new Animated.Value(-100))[0];

  // Animation based on intervention type
  useEffect(() => {
    if (interventionType === 'nudge') {
      // Slide in from top for nudge
      Animated.parallel([
        Animated.spring(bannerTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Standard animation for other types
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
    }
  }, [shieldScale, contentOpacity, bannerTranslateY, interventionType]);

  // Auto-dismiss for nudge after 5 seconds
  useEffect(() => {
    if (interventionType === 'nudge') {
      const timer = setTimeout(() => {
        setAutoDismissed(true);
        recordInterventionResult('nudge', 'auto_dismissed');
        router.back();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [interventionType, router, recordInterventionResult]);

  // Countdown timer
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
    recordInterventionResult(interventionType, 'dismissed');
    router.back();
  }, [isButtonActive, router, interventionType, recordInterventionResult]);

  const handleGoToDashboard = useCallback(() => {
    recordInterventionResult(interventionType, 'went_to_dashboard');
    router.replace('/(tabs)/dashboard');
  }, [router, interventionType, recordInterventionResult]);

  const handleAlternativeAction = useCallback(() => {
    recordInterventionResult(interventionType, 'chose_alternative');
    router.replace('/(tabs)/dashboard');
  }, [router, interventionType, recordInterventionResult]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- NUDGE: Small banner at top ---
  if (interventionType === 'nudge') {
    return (
      <LinearGradient
        colors={GRADIENT_MAP.nudge}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.nudgeBanner,
            { transform: [{ translateY: bannerTranslateY }], opacity: contentOpacity },
          ]}
        >
          <View style={styles.nudgeContent}>
            <Ionicons name="information-circle" size={28} color="#00D2FF" />
            <View style={styles.nudgeTextContainer}>
              <Text style={styles.nudgeTitle}>{TITLE_MAP.nudge}</Text>
              <Text style={styles.nudgeMessage}>
                {customMessage || SUBTITLE_MAP.nudge}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.nudgeDismiss}
            onPress={() => {
              recordInterventionResult('nudge', 'manual_dismissed');
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.nudgeCenter}>
          <Text style={styles.nudgeAutoText}>5초 후 자동으로 닫힙니다</Text>
        </View>
      </LinearGradient>
    );
  }

  // --- REMINDER: Medium card ---
  if (interventionType === 'reminder') {
    return (
      <LinearGradient
        colors={GRADIENT_MAP.reminder}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[styles.reminderContainer, { transform: [{ scale: shieldScale }] }]}
        >
          <LinearGradient
            colors={['#6C5CE7', '#A855F7']}
            style={styles.reminderIconCircle}
          >
            <Ionicons name="bulb" size={40} color={colors.textPrimary} />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <Text style={styles.title}>{TITLE_MAP.reminder}</Text>
          <Text style={styles.subtitle}>
            {customMessage || SUBTITLE_MAP.reminder}
          </Text>

          {/* Goal Reminder Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={20} color={colors.accent} />
              <Text style={styles.cardHeaderText}>나의 꿈</Text>
            </View>
            <Text style={styles.dreamText}>{dreamReminder}</Text>
          </View>

          {isStressDetected && (
            <View style={styles.stressCard}>
              <Ionicons name="heart" size={18} color="#E17055" />
              <Text style={styles.stressText}>
                스트레스가 감지되어 더 강한 보호를 제공합니다
              </Text>
            </View>
          )}

          {/* Countdown */}
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

  // --- DELAY / REDIRECT: Full screen with alternative activity ---
  if (interventionType === 'delay' || interventionType === 'redirect') {
    return (
      <LinearGradient
        colors={GRADIENT_MAP[interventionType]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[styles.shieldContainer, { transform: [{ scale: shieldScale }] }]}
        >
          <LinearGradient
            colors={interventionType === 'redirect' ? ['#00B894', '#00CEC9'] : ['#E17055', '#D63031']}
            style={styles.shieldCircle}
          >
            <Ionicons name={ICON_MAP[interventionType]} size={64} color={colors.textPrimary} />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <Text style={styles.title}>{TITLE_MAP[interventionType]}</Text>
          <Text style={styles.subtitle}>
            {customMessage || SUBTITLE_MAP[interventionType]}
          </Text>

          {isStressDetected && (
            <View style={styles.stressCard}>
              <Ionicons name="heart" size={18} color="#E17055" />
              <Text style={styles.stressText}>
                스트레스가 감지되어 더 강한 보호를 제공합니다
              </Text>
            </View>
          )}

          {/* Alternative Activity Suggestion */}
          {suggestAlternative && (
            <View style={styles.alternativeCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="leaf" size={20} color="#00B894" />
                <Text style={styles.cardHeaderText}>대안 활동 추천</Text>
              </View>
              <Text style={styles.alternativeText}>{suggestAlternative}</Text>
              <TouchableOpacity
                style={styles.alternativeButton}
                onPress={handleAlternativeAction}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#00B894', '#00CEC9']}
                  style={styles.alternativeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.alternativeButtonText}>대안 활동 시작하기</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Dream Reminder Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={20} color={colors.accent} />
              <Text style={styles.cardHeaderText}>나의 꿈</Text>
            </View>
            <Text style={styles.dreamText}>{dreamReminder}</Text>
          </View>

          {/* Countdown */}
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

  // --- BLOCK: Full screen with 60s cooldown, motivational content, dream reminder ---
  return (
    <LinearGradient
      colors={GRADIENT_MAP.block}
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
        <Text style={styles.title}>{TITLE_MAP.block}</Text>
        <Text style={styles.subtitle}>
          {customMessage || SUBTITLE_MAP.block}
        </Text>

        {isStressDetected && (
          <View style={styles.stressCard}>
            <Ionicons name="heart" size={18} color="#E17055" />
            <Text style={styles.stressText}>
              스트레스가 감지되어 더 강한 보호를 제공합니다
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

        {/* Dream Reminder Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={20} color={colors.accent} />
            <Text style={styles.cardHeaderText}>나의 꿈</Text>
          </View>
          <Text style={styles.dreamText}>{dreamReminder}</Text>
        </View>

        {/* Alternative Activity Suggestion */}
        {suggestAlternative && (
          <View style={styles.alternativeCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="leaf" size={20} color="#00B894" />
              <Text style={styles.cardHeaderText}>대안 활동 추천</Text>
            </View>
            <Text style={styles.alternativeText}>{suggestAlternative}</Text>
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={handleAlternativeAction}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#00B894', '#00CEC9']}
                style={styles.alternativeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.alternativeButtonText}>대안 활동 시작하기</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  // --- Nudge styles ---
  nudgeBanner: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  nudgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  nudgeTextContainer: {
    flex: 1,
  },
  nudgeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  nudgeMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  nudgeDismiss: {
    marginLeft: spacing.sm,
  },
  nudgeCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeAutoText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 120,
  },
  // --- Reminder styles ---
  reminderContainer: {
    marginBottom: spacing.xl,
  },
  reminderIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  // --- Shared styles ---
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
  // --- Stress detection card ---
  stressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225,112,85,0.15)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(225,112,85,0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  stressText: {
    fontSize: fontSize.sm,
    color: '#E17055',
    flex: 1,
    lineHeight: 20,
  },
  // --- Card styles ---
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
  // --- Alternative activity styles ---
  alternativeCard: {
    width: '100%',
    backgroundColor: 'rgba(0,184,148,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,184,148,0.25)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  alternativeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: '#00B894',
    textAlign: 'center',
    marginVertical: spacing.md,
    lineHeight: 28,
  },
  alternativeButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  alternativeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  alternativeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  // --- Timer styles ---
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
  // --- Button styles ---
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
