import { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/store/useUserStore';
import { useReportStore } from '@/store/useReportStore';
import { useMonitorStore } from '@/store/useMonitorStore';
import { formatMinutes, getTimeGreeting, getRiskColor } from '@/utils/analytics';
import { CATEGORY_LABELS } from '@/utils/constants';
import { CategoryUsage, ContentCategory } from '@/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function DashboardScreen() {
  const profile = useUserStore((s) => s.profile);
  const report = useReportStore((s) => s.currentReport);
  const streak = useReportStore((s) => s.streak);
  const loadSimulationReport = useReportStore((s) => s.loadSimulationReport);
  const monitoring = useMonitorStore((s) => s.monitoring);

  useEffect(() => {
    if (!report) loadSimulationReport();
  }, []);

  const greeting = getTimeGreeting();
  const userName = profile?.name || '사용자';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.userName}>{userName}님</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>{streak}일</Text>
        </View>
      </View>

      {/* Status Card */}
      <LinearGradient
        colors={['#6C5CE7', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statusCard}
      >
        <View style={styles.statusRow}>
          <Ionicons
            name={monitoring.isActive ? 'shield-checkmark' : 'shield-outline'}
            size={28}
            color="#FFF"
          />
          <View style={styles.statusTextGroup}>
            <Text style={styles.statusTitle}>
              {monitoring.isActive ? '보호 활성화' : '보호 비활성화'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {monitoring.isSimulationMode ? '시뮬레이션 모드' : '실시간 모니터링'}
            </Text>
          </View>
        </View>
        {report && (
          <View style={styles.statusStats}>
            <View style={styles.statusStatItem}>
              <Text style={styles.statusStatNumber}>{report.blockedCount}</Text>
              <Text style={styles.statusStatLabel}>차단</Text>
            </View>
            <View style={styles.statusStatDivider} />
            <View style={styles.statusStatItem}>
              <Text style={styles.statusStatNumber}>
                {formatMinutes(report.savedMinutes)}
              </Text>
              <Text style={styles.statusStatLabel}>절약</Text>
            </View>
            <View style={styles.statusStatDivider} />
            <View style={styles.statusStatItem}>
              <Text style={styles.statusStatNumber}>{report.detections.length}</Text>
              <Text style={styles.statusStatLabel}>감지</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>오늘의 요약</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color="#00D2FF" />
          <Text style={styles.statNumber}>
            {report ? formatMinutes(report.totalScreenTime) : '-'}
          </Text>
          <Text style={styles.statLabel}>총 사용시간</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="shield" size={24} color="#10B981" />
          <Text style={styles.statNumber}>{report?.blockedCount ?? 0}</Text>
          <Text style={styles.statLabel}>차단 횟수</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#FBBF24" />
          <Text style={styles.statNumber}>{streak}일</Text>
          <Text style={styles.statLabel}>연속 달성</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="hourglass" size={24} color="#EC4899" />
          <Text style={styles.statNumber}>
            {report ? formatMinutes(report.savedMinutes) : '-'}
          </Text>
          <Text style={styles.statLabel}>절약 시간</Text>
        </View>
      </View>

      {/* Category Breakdown */}
      {report && report.categoryBreakdown.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>카테고리별 사용</Text>
          <View style={styles.categoryCard}>
            {report.categoryBreakdown
              .sort((a, b) => b.minutes - a.minutes)
              .map((cat, index) => (
                <View key={index} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: cat.color }]}
                    />
                    <Text style={styles.categoryName}>
                      {CATEGORY_LABELS[cat.category as ContentCategory] || cat.category}
                    </Text>
                  </View>
                  <View style={styles.categoryBarContainer}>
                    <View
                      style={[
                        styles.categoryBar,
                        {
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryTime}>
                    {formatMinutes(cat.minutes)}
                  </Text>
                </View>
              ))}
          </View>
        </>
      )}

      {/* AI Insight */}
      {report && (
        <>
          <Text style={styles.sectionTitle}>AI 인사이트</Text>
          <View style={styles.insightCard}>
            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            <Text style={styles.insightText}>
              {report.aiInsight ||
                `오늘 총 ${formatMinutes(report.totalScreenTime)} 사용하셨고, ` +
                `${report.blockedCount}건의 유해 콘텐츠를 차단했어요. ` +
                `${streak}일 연속 목표를 달성 중이에요! 계속 이 페이스를 유지해보세요.`}
            </Text>
          </View>
        </>
      )}

      {/* Goals Progress */}
      {profile?.goals && profile.goals.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>목표 진행상황</Text>
          {profile.goals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalPercent}>{goal.progress}%</Text>
              </View>
              <View style={styles.goalBarBg}>
                <LinearGradient
                  colors={['#6C5CE7', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.goalBarFill, { width: `${goal.progress}%` }]}
                />
              </View>
            </View>
          ))}
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 15,
    color: '#A0A0C0',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBBF24',
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusTextGroup: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statusStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
  },
  statusStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statusStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B6B8D',
  },
  categoryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    gap: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 13,
    color: '#A0A0C0',
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    width: 60,
    textAlign: 'right',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 28,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#A0A0C0',
    lineHeight: 22,
  },
  goalCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  goalBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomSpacer: {
    height: 100,
  },
});
