import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { habitAnalyzer } from '@/services/ai/HabitAnalyzer';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 시뮬레이션 주간 데이터
const WEEKLY_DATA = [
  { day: '월', screenTime: 180, blocked: 5, focusMin: 45, productive: 60 },
  { day: '화', screenTime: 150, blocked: 8, focusMin: 60, productive: 70 },
  { day: '수', screenTime: 200, blocked: 3, focusMin: 30, productive: 45 },
  { day: '목', screenTime: 120, blocked: 12, focusMin: 90, productive: 80 },
  { day: '금', screenTime: 160, blocked: 6, focusMin: 50, productive: 55 },
  { day: '토', screenTime: 240, blocked: 2, focusMin: 20, productive: 30 },
  { day: '일', screenTime: 130, blocked: 9, focusMin: 75, productive: 75 },
];

const CHALLENGES = [
  { id: '1', title: '📵 1시간 폰 안보기', desc: '연속 1시간 동안 폰을 사용하지 않기', difficulty: 'easy' },
  { id: '2', title: '🌅 아침 30분 폰 프리', desc: '기상 후 30분간 폰 사용 금지', difficulty: 'easy' },
  { id: '3', title: '🎯 SNS 30분 이하', desc: '하루 SNS 사용 30분 이하로 제한', difficulty: 'medium' },
  { id: '4', title: '📚 2시간 집중 세션', desc: '2시간 연속 집중 세션 완료하기', difficulty: 'hard' },
  { id: '5', title: '🏃 운동 후 폰 사용', desc: '30분 운동 완료 후에만 폰 사용', difficulty: 'medium' },
  { id: '6', title: '🌙 밤 10시 이후 폰 금지', desc: '밤 10시 이후 모든 앱 사용 중단', difficulty: 'hard' },
  { id: '7', title: '💬 대면 대화 우선', desc: '메신저 대신 직접 대화하기', difficulty: 'easy' },
];

export default function WeeklyReportScreen() {
  const router = useRouter();
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);

  // HabitAnalyzer integration — uses simulated 30-day data
  const habitTrend = useMemo(() => habitAnalyzer.analyzeHabitTrend([], 'weekly'), []);
  const habitScore = useMemo(() => habitAnalyzer.getHabitScore([]), []);
  const habitPatterns = useMemo(() => habitAnalyzer.detectHabitPatterns([]), []);
  const weeklyInsights = useMemo(() => habitAnalyzer.generateWeeklyInsight([]), []);
  const riskDay = useMemo(() => habitAnalyzer.predictRiskDay([]), []);

  const maxScreen = Math.max(...WEEKLY_DATA.map((d) => d.screenTime));
  const avgScreen = Math.round(WEEKLY_DATA.reduce((s, d) => s + d.screenTime, 0) / 7);
  const totalBlocked = WEEKLY_DATA.reduce((s, d) => s + d.blocked, 0);
  const totalFocus = WEEKLY_DATA.reduce((s, d) => s + d.focusMin, 0);
  const avgProductive = Math.round(WEEKLY_DATA.reduce((s, d) => s + d.productive, 0) / 7);
  const bestDay = WEEKLY_DATA.reduce((best, d) => d.productive > best.productive ? d : best);
  const worstDay = WEEKLY_DATA.reduce((worst, d) => d.productive < worst.productive ? d : worst);

  const todayChallenge = CHALLENGES[new Date().getDay() % CHALLENGES.length];

  const toggleChallenge = (id: string) => {
    setCompletedChallenges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.title}>주간 리포트</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary Cards */}
        <View style={st.summaryRow}>
          <LinearGradient colors={['#6C5CE7', '#A855F7']} style={st.summaryCard}>
            <Text style={st.summaryNum}>{avgScreen}분</Text>
            <Text style={st.summaryLbl}>일평균 사용</Text>
          </LinearGradient>
          <LinearGradient colors={['#10B981', '#059669']} style={st.summaryCard}>
            <Text style={st.summaryNum}>{totalBlocked}건</Text>
            <Text style={st.summaryLbl}>주간 차단</Text>
          </LinearGradient>
          <LinearGradient colors={['#F97316', '#EA580C']} style={st.summaryCard}>
            <Text style={st.summaryNum}>{totalFocus}분</Text>
            <Text style={st.summaryLbl}>총 집중</Text>
          </LinearGradient>
        </View>

        {/* Bar Chart */}
        <Text style={st.secTitle}>일별 사용시간</Text>
        <View style={st.chartCard}>
          <View style={st.chartBars}>
            {WEEKLY_DATA.map((d) => (
              <View key={d.day} style={st.barCol}>
                <Text style={st.barVal}>{d.screenTime}</Text>
                <View style={st.barBg}>
                  <LinearGradient
                    colors={d.screenTime > avgScreen ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
                    style={[st.barFill, { height: `${(d.screenTime / maxScreen) * 100}%` }]}
                  />
                </View>
                <Text style={st.barDay}>{d.day}</Text>
              </View>
            ))}
          </View>
          <View style={st.avgLine}>
            <View style={st.avgDash} />
            <Text style={st.avgText}>평균 {avgScreen}분</Text>
          </View>
        </View>

        {/* Productivity Chart */}
        <Text style={st.secTitle}>생산성 트렌드</Text>
        <View style={st.chartCard}>
          <View style={st.chartBars}>
            {WEEKLY_DATA.map((d) => (
              <View key={d.day} style={st.barCol}>
                <Text style={st.barVal}>{d.productive}%</Text>
                <View style={st.barBg}>
                  <LinearGradient
                    colors={['#8B5CF6', '#6C5CE7']}
                    style={[st.barFill, { height: `${d.productive}%` }]}
                  />
                </View>
                <Text style={st.barDay}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Best/Worst */}
        <View style={st.bwRow}>
          <View style={[st.bwCard, { borderColor: 'rgba(16,185,129,0.3)' }]}>
            <Text style={st.bwEmoji}>🏆</Text>
            <Text style={st.bwTitle}>최고의 날</Text>
            <Text style={st.bwDay}>{bestDay.day}요일</Text>
            <Text style={st.bwStat}>생산성 {bestDay.productive}%</Text>
          </View>
          <View style={[st.bwCard, { borderColor: 'rgba(239,68,68,0.3)' }]}>
            <Text style={st.bwEmoji}>⚠️</Text>
            <Text style={st.bwTitle}>개선 필요</Text>
            <Text style={st.bwDay}>{worstDay.day}요일</Text>
            <Text style={st.bwStat}>생산성 {worstDay.productive}%</Text>
          </View>
        </View>

        {/* Habit Score Card */}
        <Text style={st.secTitle}>🧠 AI 습관 분석</Text>
        <View style={st.habitScoreCard}>
          <View style={st.habitScoreLeft}>
            <Text style={st.habitScoreLabel}>습관 점수</Text>
            <Text style={[st.habitScoreNum, {
              color: habitScore >= 70 ? '#10B981' : habitScore >= 40 ? '#FBBF24' : '#EF4444'
            }]}>{habitScore}</Text>
            <Text style={st.habitScoreMax}>/100</Text>
          </View>
          <View style={st.habitScoreRight}>
            <View style={st.habitStatRow}>
              <Text style={st.habitStatLbl}>평균 스크린타임</Text>
              <Text style={st.habitStatVal}>{habitTrend.avgScreenTime}분/일</Text>
            </View>
            <View style={st.habitStatRow}>
              <Text style={st.habitStatLbl}>평균 차단 수</Text>
              <Text style={st.habitStatVal}>{habitTrend.avgBlockedCount}건/일</Text>
            </View>
            <View style={st.habitStatRow}>
              <Text style={st.habitStatLbl}>개선율</Text>
              <Text style={[st.habitStatVal, { color: habitTrend.improvementRate >= 0 ? '#10B981' : '#EF4444' }]}>
                {habitTrend.improvementRate >= 0 ? '▲' : '▼'} {Math.abs(habitTrend.improvementRate)}%
              </Text>
            </View>
            <View style={st.habitStatRow}>
              <Text style={st.habitStatLbl}>위험 요일</Text>
              <Text style={[st.habitStatVal, { color: '#FBBF24' }]}>{riskDay.dayOfWeek}</Text>
            </View>
          </View>
        </View>

        {/* Habit Patterns */}
        {habitPatterns.length > 0 && (
          <>
            <Text style={st.secTitle}>📊 행동 패턴</Text>
            {habitPatterns.slice(0, 3).map((p, i) => (
              <View key={i} style={[st.patternCard, {
                borderColor: p.type === 'improvement' ? 'rgba(16,185,129,0.3)' :
                             p.type === 'regression' ? 'rgba(239,68,68,0.3)' :
                             p.type === 'spike' ? 'rgba(239,68,68,0.4)' :
                             'rgba(139,92,246,0.3)',
              }]}>
                <Text style={st.patternText}>{p.description}</Text>
                <Text style={[st.patternConf, { color: p.confidence >= 0.8 ? '#10B981' : '#FBBF24' }]}>
                  신뢰도 {Math.round(p.confidence * 100)}%
                </Text>
              </View>
            ))}
          </>
        )}

        {/* AI Weekly Insights */}
        <Text style={st.secTitle}>💡 AI 주간 인사이트</Text>
        {weeklyInsights.map((insight, i) => (
          <View key={i} style={st.aiCard}>
            <Ionicons name="sparkles" size={16} color="#8B5CF6" style={{ marginTop: 2 }} />
            <Text style={st.aiText}>{insight}</Text>
          </View>
        ))}

        {/* Daily Challenge */}
        <Text style={st.secTitle}>오늘의 챌린지 🎯</Text>
        <TouchableOpacity
          style={[st.challengeMain, completedChallenges.includes(todayChallenge.id) && st.challengeDone]}
          onPress={() => toggleChallenge(todayChallenge.id)}
        >
          <Text style={st.challengeEmoji}>{todayChallenge.title.split(' ')[0]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.challengeTitle}>{todayChallenge.title.substring(2).trim()}</Text>
            <Text style={st.challengeDesc}>{todayChallenge.desc}</Text>
          </View>
          <Ionicons
            name={completedChallenges.includes(todayChallenge.id) ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={completedChallenges.includes(todayChallenge.id) ? '#10B981' : '#6B6B8D'}
          />
        </TouchableOpacity>

        {/* More Challenges */}
        <Text style={st.secTitle}>더 많은 챌린지</Text>
        {CHALLENGES.filter((c) => c.id !== todayChallenge.id).map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[st.challengeItem, completedChallenges.includes(c.id) && st.challengeDone]}
            onPress={() => toggleChallenge(c.id)}
          >
            <Text style={st.challengeSmEmoji}>{c.title.split(' ')[0]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.challengeSmTitle}>{c.title.substring(2).trim()}</Text>
              <Text style={st.challengeSmDesc}>{c.desc}</Text>
            </View>
            <View style={[st.diffBadge, {
              backgroundColor: c.difficulty === 'easy' ? 'rgba(16,185,129,0.15)' : c.difficulty === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
            }]}>
              <Text style={[st.diffText, {
                color: c.difficulty === 'easy' ? '#10B981' : c.difficulty === 'medium' ? '#FBBF24' : '#EF4444',
              }]}>{c.difficulty === 'easy' ? '쉬움' : c.difficulty === 'medium' ? '보통' : '어려움'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={st.spacer} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryNum: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  summaryLbl: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  chartCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barCol: { alignItems: 'center', flex: 1 },
  barVal: { fontSize: 10, color: '#6B6B8D', marginBottom: 4 },
  barBg: { width: 24, height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barDay: { fontSize: 12, color: '#A0A0C0', marginTop: 6, fontWeight: '600' },
  avgLine: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  avgDash: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  avgText: { fontSize: 11, color: '#6B6B8D' },
  bwRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  bwCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  bwEmoji: { fontSize: 28, marginBottom: 8 },
  bwTitle: { fontSize: 13, color: '#A0A0C0', fontWeight: '600' },
  bwDay: { fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 4 },
  bwStat: { fontSize: 12, color: '#6B6B8D', marginTop: 4 },
  aiCard: { flexDirection: 'row', backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', borderRadius: 16, padding: 16, gap: 12, marginBottom: 20 },
  aiText: { flex: 1, fontSize: 14, color: '#A0A0C0', lineHeight: 22 },
  challengeMain: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, borderWidth: 2, borderColor: 'rgba(139,92,246,0.3)' },
  challengeDone: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.08)' },
  challengeEmoji: { fontSize: 32 },
  challengeTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  challengeDesc: { fontSize: 13, color: '#6B6B8D', marginTop: 4 },
  challengeItem: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  challengeSmEmoji: { fontSize: 24 },
  challengeSmTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  challengeSmDesc: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },
  diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { fontSize: 11, fontWeight: '600' },
  spacer: { height: 100 },
  // Habit Analyzer styles
  habitScoreCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', borderRadius: 16,
    padding: 18, marginBottom: 20, gap: 16,
  },
  habitScoreLeft: { alignItems: 'center', justifyContent: 'center', width: 80 },
  habitScoreLabel: { fontSize: 11, color: '#A0A0C0', fontWeight: '600', marginBottom: 4 },
  habitScoreNum: { fontSize: 42, fontWeight: '800' },
  habitScoreMax: { fontSize: 13, color: '#6B6B8D' },
  habitScoreRight: { flex: 1, justifyContent: 'center', gap: 10 },
  habitStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habitStatLbl: { fontSize: 12, color: '#A0A0C0' },
  habitStatVal: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  patternCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
  },
  patternText: { flex: 1, fontSize: 13, color: '#D0D0F0', lineHeight: 20 },
  patternConf: { fontSize: 11, fontWeight: '600', paddingTop: 2 },
});
