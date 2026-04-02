import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { useReportStore } from '@/store/useReportStore';
import { useFocusStore } from '@/store/useFocusStore';
import { formatMinutes, getTimeGreeting } from '@/utils/analytics';
import { CATEGORY_LABELS } from '@/utils/constants';
import { ContentCategory, MoodType } from '@/types';
import { ChromeExtensionBridge } from '@/services/ChromeExtensionBridge';
import MoodCheckIn from '@/components/mood/MoodCheckIn';
import { MoodAnalyzer } from '@/services/ai/MoodAnalyzer';
import { habitAnalyzer } from '@/services/ai/HabitAnalyzer';

const { width } = Dimensions.get('window');
const CARD_W = (width - 60) / 2;

export default function DashboardScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const report = useReportStore((s) => s.currentReport);
  const streak = useReportStore((s) => s.streak);
  const loadReport = useReportStore((s) => s.loadSimulationReport);
  const { coins, totalTreesGrown, todayFocusMinutes, focusStreak, loadFocusData } = useFocusStore();

  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [moodState, setMoodState] = useState(() => MoodAnalyzer.getCurrentMoodState());
  const [habitScore, setHabitScore] = useState(() => habitAnalyzer.getHabitScore([]));
  const [riskDay, setRiskDay] = useState(() => habitAnalyzer.predictRiskDay([]));

  const handleMoodSubmit = (mood: MoodType, energy: number, note?: string) => {
    MoodAnalyzer.addMoodCheckIn(mood, energy, note);
    setMoodState(MoodAnalyzer.getCurrentMoodState());
    setMoodModalVisible(false);
  };

  useEffect(() => {
    if (!report) loadReport();
    loadFocusData();
    // Refresh mood state and habit data on mount
    setMoodState(MoodAnalyzer.getCurrentMoodState());
    setHabitScore(habitAnalyzer.getHabitScore([]));
    setRiskDay(habitAnalyzer.predictRiskDay([]));
    // 키워드를 확장 프로그램과 동기화
    if (profile?.blockedKeywords) {
      ChromeExtensionBridge.syncKeywordsToExtension(profile.blockedKeywords);
    }
    // 목표 데이터도 동기화
    if (profile?.goals || profile?.dreams) {
      ChromeExtensionBridge.syncGoalsToExtension(
        profile.goals?.map(g => g.title) || [],
        profile.dreams || []
      );
    }
  }, [profile?.blockedKeywords, profile?.goals, profile?.dreams]);

  const greeting = getTimeGreeting();
  const userName = profile?.name || '사용자';
  const nav = (r: string) => router.push(r as any);

  // 확장 프로그램 실제 통계 (있으면 우선 사용)
  const extStats = ChromeExtensionBridge.getExtensionStats();
  const blockedCount = extStats?.todayBlocked ?? report?.blockedCount ?? 0;

  const QUICK_ACTIONS = [
    { route: '/(tabs)/focus', colors: ['#10B981', '#059669'] as [string, string], icon: 'leaf' as const, label: '집중' },
    { route: '/(tabs)/blocking', colors: ['#EF4444', '#DC2626'] as [string, string], icon: 'ban' as const, label: '차단' },
    { route: '/(tabs)/schedule', colors: ['#3B82F6', '#2563EB'] as [string, string], icon: 'calendar' as const, label: '스케줄' },
    { route: '/(tabs)/goals', colors: ['#F97316', '#EA580C'] as [string, string], icon: 'rocket' as const, label: '목표' },
  ];

  const MORE_FEATURES = [
    { label: '긴급 차단', emoji: '🚨', route: '/emergency', color: '#EF4444' },
    { label: '수면 모드', emoji: '🌙', route: '/sleep-mode', color: '#6366F1' },
    { label: '챌린지', emoji: '🎯', route: '/challenges', color: '#F97316' },
    { label: '앱 제한', emoji: '⏱️', route: '/app-limits', color: '#10B981' },
    { label: '화이트리스트', emoji: '✅', route: '/whitelist-mode', color: '#3B82F6' },
    { label: '파트너', emoji: '👥', route: '/partners', color: '#EC4899' },
    { label: '주간 리포트', emoji: '📊', route: '/weekly-report', color: '#8B5CF6' },
    { label: '사용 분석', emoji: '📈', route: '/analytics', color: '#00D2FF' },
    { label: '차단 통계', emoji: '🛡️', route: '/block-stats', color: '#EF4444' },
    { label: '동기부여', emoji: '🎬', route: '/motivation-video', color: '#A855F7' },
  ];

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting} 👋</Text>
          <Text style={s.userName}>{userName}님</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.coinBadge}>
            <Text style={s.coinText}>🪙 {coins}</Text>
          </View>
          <TouchableOpacity onPress={() => setMoodModalVisible(true)} style={s.moodBtn}>
            <Text style={s.moodBtnText}>
              {moodState.reportedMood === 'great' ? '😄' :
               moodState.reportedMood === 'good' ? '🙂' :
               moodState.reportedMood === 'neutral' ? '😐' :
               moodState.reportedMood === 'stressed' ? '😰' :
               moodState.reportedMood === 'anxious' ? '😟' : '😊'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav('/(tabs)/settings')}>
            <Ionicons name="settings-outline" size={24} color="#6B6B8D" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Wellness Score Card */}
      <View style={s.wellnessCard}>
        <View style={s.wellnessLeft}>
          <Text style={s.wellnessTitle}>웰니스 점수</Text>
          <View style={s.wellnessScoreRow}>
            <Text style={[s.wellnessScore, {
              color: habitScore >= 70 ? '#10B981' : habitScore >= 40 ? '#FBBF24' : '#EF4444'
            }]}>{habitScore}</Text>
            <Text style={s.wellnessScoreMax}>/100</Text>
          </View>
          <Text style={s.wellnessRiskDay}>⚠️ 주의일: {riskDay.dayOfWeek}</Text>
        </View>
        <View style={s.wellnessRight}>
          <View style={s.stressRow}>
            <Text style={s.stressLabel}>스트레스</Text>
            <View style={s.stressBarBg}>
              <View style={[s.stressBarFill, {
                width: `${moodState.inferredStress}%`,
                backgroundColor: moodState.inferredStress > 60 ? '#EF4444' :
                                 moodState.inferredStress > 30 ? '#FBBF24' : '#10B981'
              }]} />
            </View>
            <Text style={s.stressValue}>{moodState.inferredStress}%</Text>
          </View>
          <TouchableOpacity style={s.moodCheckBtn} onPress={() => setMoodModalVisible(true)}>
            <Ionicons name="happy-outline" size={14} color="#8B5CF6" />
            <Text style={s.moodCheckText}>기분 체크인</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Focus Score Card */}
      <LinearGradient colors={['#6C5CE7', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreCard}>
        <View style={s.scoreRow}>
          <View style={s.scoreCircle}>
            <Text style={s.scoreNum}>{Math.min(100, todayFocusMinutes + (report?.savedMinutes || 0))}</Text>
            <Text style={s.scoreLabel}>포커스</Text>
          </View>
          <View style={s.scoreStats}>
            <View style={s.scoreStatItem}>
              <Text style={s.scoreStatVal}>🌲 {totalTreesGrown}</Text>
              <Text style={s.scoreStatLabel}>나무</Text>
            </View>
            <View style={s.scoreStatItem}>
              <Text style={s.scoreStatVal}>🔥 {Math.max(streak, focusStreak)}</Text>
              <Text style={s.scoreStatLabel}>연속일</Text>
            </View>
            <View style={s.scoreStatItem}>
              <Text style={s.scoreStatVal}>🛡️ {blockedCount}</Text>
              <Text style={s.scoreStatLabel}>차단</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={s.quickActions}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity key={a.label} style={s.quickAction} onPress={() => nav(a.route)}>
            <LinearGradient colors={a.colors} style={s.quickActionGrad}>
              <Ionicons name={a.icon} size={22} color="#FFF" />
            </LinearGradient>
            <Text style={s.quickActionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* More Features */}
      <Text style={s.sectionTitle}>더 많은 기능</Text>
      <View style={s.featureGrid}>
        {MORE_FEATURES.map((f) => (
          <TouchableOpacity key={f.label} style={s.featureItem} onPress={() => nav(f.route)}>
            <View style={[s.featureIcon, { backgroundColor: `${f.color}20` }]}>
              <Text style={s.featureEmoji}>{f.emoji}</Text>
            </View>
            <Text style={s.featureLabel}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today Stats */}
      <Text style={s.sectionTitle}>오늘의 요약</Text>
      <View style={s.statsGrid}>
        {[
          { icon: 'time-outline' as const, color: '#00D2FF', value: report ? formatMinutes(report.totalScreenTime) : '-', label: '총 사용시간' },
          { icon: 'shield' as const, color: '#10B981', value: String(blockedCount), label: '차단 횟수' },
          { icon: 'trending-up' as const, color: '#FBBF24', value: `${streak}일`, label: '연속 달성' },
          { icon: 'hourglass' as const, color: '#EC4899', value: report ? formatMinutes(report.savedMinutes) : '-', label: '절약 시간' },
        ].map((item) => (
          <View key={item.label} style={s.statCard}>
            <Ionicons name={item.icon} size={24} color={item.color} />
            <Text style={s.statNumber}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Category Breakdown */}
      {report && report.categoryBreakdown.length > 0 && (
        <>
          <Text style={s.sectionTitle}>카테고리별 사용</Text>
          <View style={s.categoryCard}>
            {report.categoryBreakdown.sort((a, b) => b.minutes - a.minutes).map((cat, i) => (
              <View key={i} style={s.categoryRow}>
                <View style={s.categoryInfo}>
                  <View style={[s.categoryDot, { backgroundColor: cat.color }]} />
                  <Text style={s.categoryName}>{CATEGORY_LABELS[cat.category as ContentCategory] || cat.category}</Text>
                </View>
                <View style={s.categoryBarBg}>
                  <View style={[s.categoryBar, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                </View>
                <Text style={s.categoryTime}>{formatMinutes(cat.minutes)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* AI Insight */}
      {report && (
        <>
          <Text style={s.sectionTitle}>AI 인사이트</Text>
          <View style={s.insightCard}>
            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            <Text style={s.insightText}>
              {report.aiInsight || `오늘 총 ${formatMinutes(report.totalScreenTime)} 사용, ${report.blockedCount}건 차단, ${streak}일 연속 달성 중!`}
            </Text>
          </View>
        </>
      )}

      {/* Analytics & Report Links */}
      <TouchableOpacity style={s.linkCard} onPress={() => nav('/analytics')}>
        <LinearGradient colors={['rgba(99,102,241,0.15)', 'rgba(139,92,246,0.15)']} style={s.linkGrad}>
          <View style={s.linkContent}>
            <Ionicons name="analytics" size={22} color="#8B5CF6" />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>사용 분석 & AI 분류</Text>
              <Text style={s.linkSub}>사이트별 시간, YouTube 분류, 우회 방지</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B6B8D" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={s.linkCard} onPress={() => nav('/weekly-report')}>
        <LinearGradient colors={['rgba(16,185,129,0.15)', 'rgba(5,150,105,0.15)']} style={s.linkGrad}>
          <View style={s.linkContent}>
            <Ionicons name="bar-chart" size={22} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>주간 리포트 & 챌린지</Text>
              <Text style={s.linkSub}>일별 비교, 트렌드, 일일 챌린지</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B6B8D" />
        </LinearGradient>
      </TouchableOpacity>

      {/* SOS + Partner */}
      <View style={s.sosRow}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => nav('/emergency')}>
          <LinearGradient colors={['#EF4444', '#DC2626']} style={s.sosBtn}>
            <Ionicons name="warning" size={20} color="#FFF" />
            <Text style={s.sosBtnText}>긴급 SOS</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => nav('/partners')}>
          <LinearGradient colors={['#EC4899', '#DB2777']} style={s.sosBtn}>
            <Ionicons name="people" size={20} color="#FFF" />
            <Text style={s.sosBtnText}>파트너</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Goals */}
      {profile?.goals && profile.goals.length > 0 && (
        <>
          <Text style={s.sectionTitle}>목표 진행상황</Text>
          {profile.goals.map((goal) => (
            <View key={goal.id} style={s.goalCard}>
              <View style={s.goalHeader}>
                <Text style={s.goalTitle}>{goal.title}</Text>
                <Text style={s.goalPercent}>{goal.progress}%</Text>
              </View>
              <View style={s.goalBarBg}>
                <LinearGradient colors={['#6C5CE7', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[s.goalBarFill, { width: `${goal.progress}%` }]} />
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>

    <MoodCheckIn
      visible={moodModalVisible}
      onClose={() => setMoodModalVisible(false)}
      onSubmit={handleMoodSubmit}
    />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 15, color: '#A0A0C0', marginBottom: 4 },
  userName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  coinText: { fontSize: 13, fontWeight: '700', color: '#FBBF24' },
  scoreCard: { borderRadius: 20, padding: 20, marginBottom: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  scoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scoreStats: { flex: 1, gap: 8 },
  scoreStatItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreStatVal: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  scoreStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  quickAction: { flex: 1, alignItems: 'center', gap: 6 },
  quickActionGrad: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 11, color: '#A0A0C0', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  featureItem: { width: (width - 60) / 4, alignItems: 'center', gap: 6 },
  featureIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureEmoji: { fontSize: 22 },
  featureLabel: { fontSize: 10, color: '#A0A0C0', fontWeight: '500', textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { width: CARD_W, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, gap: 8 },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: '#6B6B8D' },
  categoryCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 28, gap: 14 },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', width: 90, gap: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 13, color: '#A0A0C0' },
  categoryBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  categoryBar: { height: '100%', borderRadius: 4 },
  categoryTime: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', width: 60, textAlign: 'right' },
  insightCard: { flexDirection: 'row', backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', borderRadius: 16, padding: 16, gap: 12, marginBottom: 20 },
  insightText: { flex: 1, fontSize: 14, color: '#A0A0C0', lineHeight: 22 },
  linkCard: { marginBottom: 12 },
  linkGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  linkContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  linkTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  linkSub: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },
  sosRow: { flexDirection: 'row', gap: 12, marginBottom: 28, marginTop: 8 },
  sosBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, gap: 8 },
  sosBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  goalCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, marginBottom: 10 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  goalTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  goalPercent: { fontSize: 14, fontWeight: '700', color: '#8B5CF6' },
  goalBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3 },
  moodBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  moodBtnText: { fontSize: 20 },
  wellnessCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', borderRadius: 16,
    padding: 16, marginBottom: 20, gap: 16,
  },
  wellnessLeft: { flex: 1 },
  wellnessTitle: { fontSize: 12, color: '#A0A0C0', fontWeight: '600', marginBottom: 4 },
  wellnessScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  wellnessScore: { fontSize: 36, fontWeight: '800' },
  wellnessScoreMax: { fontSize: 14, color: '#6B6B8D' },
  wellnessRiskDay: { fontSize: 11, color: '#FBBF24', marginTop: 6 },
  wellnessRight: { flex: 1.4, justifyContent: 'center', gap: 10 },
  stressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stressLabel: { fontSize: 11, color: '#A0A0C0', width: 44 },
  stressBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  stressBarFill: { height: '100%', borderRadius: 3 },
  stressValue: { fontSize: 11, color: '#A0A0C0', width: 30, textAlign: 'right' },
  moodCheckBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  moodCheckText: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },
});
