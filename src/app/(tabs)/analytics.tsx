import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/utils/theme';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = 160;
const CIRCLE_STROKE = 12;

type Period = 'weekly' | 'monthly' | 'quarterly';

const PERIOD_LABELS: Record<Period, string> = {
  weekly: '주간',
  monthly: '월간',
  quarterly: '분기',
};

// ── Simulation Data ──────────────────────────────────────────────────────────

const SIMULATION: Record<Period, {
  score: number;
  trend: string;
  trendPositive: boolean;
  patterns: { text: string; type: 'positive' | 'warning' | 'info' }[];
  weekdayUsage: { day: string; minutes: number }[];
  insights: string[];
  riskDay: string;
}> = {
  weekly: {
    score: 73,
    trend: '지난 주 대비 +12% 개선',
    trendPositive: true,
    patterns: [
      { text: '게임 시간 30% 감소', type: 'positive' },
      { text: '주말 SNS 사용 주의', type: 'warning' },
      { text: '평일 집중 시간 2시간 증가', type: 'positive' },
      { text: '쇼핑 앱 야간 사용 감지', type: 'warning' },
    ],
    weekdayUsage: [
      { day: '월', minutes: 95 },
      { day: '화', minutes: 78 },
      { day: '수', minutes: 82 },
      { day: '목', minutes: 70 },
      { day: '금', minutes: 145 },
      { day: '토', minutes: 190 },
      { day: '일', minutes: 165 },
    ],
    insights: [
      '이번 주 평균 스크린타임이 지난 주 대비 18분 줄었어요. 특히 화~목요일에 집중력이 좋았습니다.',
      '금요일 저녁 9시~11시 사이 유해 콘텐츠 노출 위험이 가장 높았어요. 이 시간에 대체 활동을 계획해보세요.',
      '게임 카테고리 사용이 꾸준히 줄고 있어요. 목표 달성까지 약 2주 남았습니다.',
    ],
    riskDay: '금요일에 과사용 위험이 높습니다',
  },
  monthly: {
    score: 68,
    trend: '지난 달 대비 +8% 개선',
    trendPositive: true,
    patterns: [
      { text: '월간 스크린타임 15% 감소', type: 'positive' },
      { text: 'SNS 사용 패턴 개선 중', type: 'info' },
      { text: '시험 기간 게임 사용 급증', type: 'warning' },
      { text: '운동 습관과 디지털 사용 반비례 패턴', type: 'info' },
    ],
    weekdayUsage: [
      { day: '월', minutes: 105 },
      { day: '화', minutes: 88 },
      { day: '수', minutes: 92 },
      { day: '목', minutes: 85 },
      { day: '금', minutes: 155 },
      { day: '토', minutes: 200 },
      { day: '일', minutes: 178 },
    ],
    insights: [
      '이번 달 총 절약 시간은 12시간 30분이에요. 이 시간으로 책 2권을 읽을 수 있어요.',
      '스트레스를 받는 날 디지털 사용량이 평균 40% 증가하는 패턴이 발견되었어요. 감정 관리와 연계하면 효과적이에요.',
      '단순 차단 앱과 다르게, 당신의 목표("개발자 되기")와 연계된 활동 시간이 주 3시간 증가했어요.',
    ],
    riskDay: '주말과 시험 기간에 과사용 위험이 높습니다',
  },
  quarterly: {
    score: 62,
    trend: '지난 분기 대비 +22% 개선',
    trendPositive: true,
    patterns: [
      { text: '전반적 디지털 웰니스 크게 향상', type: 'positive' },
      { text: '유해 콘텐츠 노출 60% 감소', type: 'positive' },
      { text: '목표 달성률 78% 기록', type: 'positive' },
      { text: '방학 기간 관리 필요', type: 'warning' },
    ],
    weekdayUsage: [
      { day: '월', minutes: 110 },
      { day: '화', minutes: 95 },
      { day: '수', minutes: 100 },
      { day: '목', minutes: 90 },
      { day: '금', minutes: 160 },
      { day: '토', minutes: 210 },
      { day: '일', minutes: 185 },
    ],
    insights: [
      '3개월간 총 45시간을 절약했어요. 이 시간에 온라인 강의 수료, 사이드 프로젝트 시작 등 의미 있는 활동이 가능했어요.',
      '감정 체크인 데이터와 비교하면, "좋아요" 감정일 때 생산적 앱 사용이 70% 더 높았어요.',
      '단순 차단이 아닌 목표 기반 관리 덕분에 리바운드 없이 꾸준히 개선되고 있어요. 상위 15% 사용자 수준이에요.',
    ],
    riskDay: '방학 시작 첫 주에 과사용 위험이 가장 높습니다',
  },
};

// ── Score Color ───────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score < 40) return colors.accentRed;
  if (score < 70) return colors.accentYellow;
  return colors.accentGreen;
}

function getPatternIcon(type: 'positive' | 'warning' | 'info'): string {
  if (type === 'positive') return '\u{1F389}';
  if (type === 'warning') return '\u{26A0}\u{FE0F}';
  return '\u{1F4A1}';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('weekly');
  const data = SIMULATION[period];
  const scoreColor = getScoreColor(data.score);
  const maxMinutes = Math.max(...data.weekdayUsage.map((d) => d.minutes));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>습관 분석</Text>
        <View style={styles.periodSelector}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodTabText,
                  period === p && styles.periodTabTextActive,
                ]}
              >
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Digital Wellness Score ── */}
      <View style={styles.scoreCard}>
        <Text style={styles.sectionTitle}>Digital Wellness Score</Text>
        <View style={styles.scoreCircleContainer}>
          {/* Background ring */}
          <View
            style={[
              styles.scoreCircle,
              { borderColor: 'rgba(255,255,255,0.08)' },
            ]}
          >
            {/* Foreground ring overlay – simplified as filled arc via border */}
            <View
              style={[
                styles.scoreCircleInner,
                { borderColor: scoreColor, borderTopColor: scoreColor, borderRightColor: scoreColor },
              ]}
            />
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {data.score}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
        </View>

        {/* Trend */}
        <View style={styles.trendRow}>
          <Ionicons
            name={data.trendPositive ? 'trending-up' : 'trending-down'}
            size={18}
            color={data.trendPositive ? colors.accentGreen : colors.accentRed}
          />
          <Text
            style={[
              styles.trendText,
              { color: data.trendPositive ? colors.accentGreen : colors.accentRed },
            ]}
          >
            {data.trend}
          </Text>
        </View>
      </View>

      {/* ── Habit Patterns ── */}
      <Text style={styles.sectionTitle}>감지된 습관 패턴</Text>
      <View style={styles.patternList}>
        {data.patterns.map((pattern, idx) => (
          <View key={idx} style={styles.patternCard}>
            <Text style={styles.patternIcon}>{getPatternIcon(pattern.type)}</Text>
            <Text style={styles.patternText}>{pattern.text}</Text>
          </View>
        ))}
      </View>

      {/* ── Weekly Heatmap ── */}
      <Text style={styles.sectionTitle}>요일별 평균 사용량</Text>
      <View style={styles.heatmapCard}>
        <View style={styles.heatmapBars}>
          {data.weekdayUsage.map((item) => {
            const ratio = item.minutes / maxMinutes;
            const barColor =
              item.minutes > 150
                ? colors.accentRed
                : item.minutes > 100
                ? colors.accentYellow
                : colors.accentGreen;
            return (
              <View key={item.day} style={styles.heatmapBarCol}>
                <Text style={styles.heatmapMinutes}>{item.minutes}분</Text>
                <View style={styles.heatmapBarTrack}>
                  <LinearGradient
                    colors={[barColor, barColor + 'AA']}
                    style={[styles.heatmapBarFill, { height: `${ratio * 100}%` }]}
                  />
                </View>
                <Text style={styles.heatmapDay}>{item.day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Risk Day Prediction ── */}
      <View style={styles.riskCard}>
        <View style={styles.riskHeader}>
          <Ionicons name="warning" size={20} color={colors.accentOrange} />
          <Text style={styles.riskTitle}>과사용 위험 예측</Text>
        </View>
        <Text style={styles.riskText}>{data.riskDay}</Text>
      </View>

      {/* ── AI Insights ── */}
      <Text style={styles.sectionTitle}>AI 인사이트</Text>
      {data.insights.map((insight, idx) => (
        <View key={idx} style={styles.insightCard}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      ))}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // Header
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  periodTabActive: {
    backgroundColor: colors.primary,
  },
  periodTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  periodTabTextActive: {
    color: colors.textPrimary,
  },

  // Score
  scoreCard: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scoreCircleContainer: {
    marginVertical: spacing.md,
  },
  scoreCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: CIRCLE_STROKE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleInner: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: CIRCLE_STROKE,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: -4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  trendText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // Patterns
  patternList: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    padding: 14,
    gap: 12,
  },
  patternIcon: {
    fontSize: 20,
  },
  patternText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },

  // Heatmap
  heatmapCard: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  heatmapBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  heatmapBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  heatmapMinutes: {
    fontSize: 10,
    color: colors.textMuted,
  },
  heatmapBarTrack: {
    width: 24,
    height: '65%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heatmapBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  heatmapDay: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },

  // Risk
  riskCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  riskTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accentOrange,
  },
  riskText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Insights
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 12,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Common
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  bottomSpacer: {
    height: 100,
  },
});
