import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MoodAnalyzer } from '@/services/ai/MoodAnalyzer';
import { habitAnalyzer } from '@/services/ai/HabitAnalyzer';
import MoodCheckIn from '@/components/mood/MoodCheckIn';
import type { MoodType } from '@/types';

const { width } = Dimensions.get('window');

const MOOD_EMOJI: Record<string, string> = {
  great: '😄', good: '🙂', neutral: '😐', stressed: '😰', anxious: '😟',
};
const MOOD_LABEL: Record<string, string> = {
  great: '좋아요', good: '괜찮아요', neutral: '보통', stressed: '스트레스', anxious: '불안',
};
const MOOD_COLOR: Record<string, string> = {
  great: '#10B981', good: '#3B82F6', neutral: '#A0A0C0', stressed: '#F97316', anxious: '#EF4444',
};

export default function WellnessScreen() {
  const router = useRouter();
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [moodState, setMoodState] = useState(() => MoodAnalyzer.getCurrentMoodState());
  const [moodHistory, setMoodHistory] = useState(() => MoodAnalyzer.getMoodHistory(7));

  const habitScore = useMemo(() => habitAnalyzer.getHabitScore([]), []);
  const trend = useMemo(() => habitAnalyzer.analyzeHabitTrend([], 'weekly'), []);
  const riskDay = useMemo(() => habitAnalyzer.predictRiskDay([]), []);
  const weeklyInsights = useMemo(() => habitAnalyzer.generateWeeklyInsight([]), []);
  const patterns = useMemo(() => habitAnalyzer.detectHabitPatterns([]), []);

  const handleMoodSubmit = (mood: MoodType, energy: number, note?: string) => {
    MoodAnalyzer.addMoodCheckIn(mood, energy, note);
    setMoodState(MoodAnalyzer.getCurrentMoodState());
    setMoodHistory(MoodAnalyzer.getMoodHistory(7));
    setMoodModalVisible(false);
  };

  const latestMood = MoodAnalyzer.getLatestMood();

  // Stress ring segments
  const stress = moodState.inferredStress;
  const stressColor = stress > 60 ? '#EF4444' : stress > 30 ? '#FBBF24' : '#10B981';
  const stressLabel = stress > 60 ? '높음 😰' : stress > 30 ? '보통 😐' : '낮음 😊';

  return (
    <>
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.title}>웰니스 센터</Text>
            <TouchableOpacity onPress={() => setMoodModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={26} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          {/* Hero Card */}
          <LinearGradient colors={['#6C5CE7', '#A855F7']} style={s.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.heroTop}>
              <View>
                <Text style={s.heroLabel}>오늘의 웰니스 점수</Text>
                <Text style={s.heroScore}>{habitScore}</Text>
                <Text style={s.heroScoreMax}>/100</Text>
              </View>
              <View style={s.stressCircle}>
                <Text style={s.stressCircleNum}>{stress}</Text>
                <Text style={s.stressCircleLabel}>스트레스</Text>
              </View>
            </View>
            <View style={s.heroStats}>
              <View style={s.heroStatItem}>
                <Text style={s.heroStatVal}>{trend.avgScreenTime}분</Text>
                <Text style={s.heroStatLbl}>일평균 사용</Text>
              </View>
              <View style={s.heroStatItem}>
                <Text style={s.heroStatVal}>{trend.streakDays}일</Text>
                <Text style={s.heroStatLbl}>연속 달성</Text>
              </View>
              <View style={s.heroStatItem}>
                <Text style={[s.heroStatVal, { color: trend.improvementRate >= 0 ? '#A7F3D0' : '#FCA5A5' }]}>
                  {trend.improvementRate >= 0 ? '▲' : '▼'}{Math.abs(trend.improvementRate)}%
                </Text>
                <Text style={s.heroStatLbl}>개선율</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Current Mood + Check-in */}
          <View style={s.moodRow}>
            <View style={s.currentMoodCard}>
              <Text style={s.moodCardLabel}>현재 기분</Text>
              <Text style={s.moodCardEmoji}>
                {latestMood ? MOOD_EMOJI[latestMood.mood] ?? '😊' : '😊'}
              </Text>
              <Text style={[s.moodCardText, {
                color: latestMood ? MOOD_COLOR[latestMood.mood] : '#A0A0C0'
              }]}>
                {latestMood ? MOOD_LABEL[latestMood.mood] : '미기록'}
              </Text>
              {latestMood && (
                <Text style={s.moodCardEnergy}>에너지 {latestMood.energy}/5</Text>
              )}
            </View>
            <TouchableOpacity style={s.checkInBtn} onPress={() => setMoodModalVisible(true)} activeOpacity={0.8}>
              <LinearGradient colors={['#6C5CE7', '#A855F7']} style={s.checkInGrad}>
                <Ionicons name="happy-outline" size={28} color="#FFF" />
                <Text style={s.checkInText}>기분{'\n'}체크인</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stress Triggers */}
          {moodState.triggers.length > 0 && (
            <>
              <Text style={s.secTitle}>⚡ 스트레스 유발 요인</Text>
              <View style={s.triggersCard}>
                {moodState.triggers.map((trigger, i) => (
                  <View key={i} style={s.triggerBadge}>
                    <Text style={s.triggerText}>
                      {trigger === 'rapid_app_switching' ? '🔄 빠른 앱 전환' :
                       trigger === 'late_night_usage' ? '🌙 야간 사용' :
                       trigger === 'long_session_spike' ? '⏰ 장시간 세션' :
                       trigger.startsWith('compulsive:') ? `🔁 강박적 사용 (${trigger.replace('compulsive:', '')})` :
                       trigger}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Mood History (last 7 days) */}
          {moodHistory.length > 0 && (
            <>
              <Text style={s.secTitle}>📅 최근 7일 기분 기록</Text>
              <View style={s.historyCard}>
                {moodHistory.slice(-7).map((entry, i) => (
                  <View key={i} style={s.historyRow}>
                    <Text style={s.historyEmoji}>{MOOD_EMOJI[entry.mood] ?? '😊'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.historyMood, { color: MOOD_COLOR[entry.mood] ?? '#A0A0C0' }]}>
                        {MOOD_LABEL[entry.mood] ?? entry.mood}
                      </Text>
                      {entry.note && <Text style={s.historyNote}>{entry.note}</Text>}
                    </View>
                    <View style={s.historyRight}>
                      <Text style={s.historyEnergy}>⚡ {entry.energy}/5</Text>
                      <Text style={s.historyTime}>
                        {new Date(entry.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Risk Day */}
          <Text style={s.secTitle}>⚠️ 위험 요일 예측</Text>
          <View style={s.riskCard}>
            <View style={s.riskLeft}>
              <Text style={s.riskDay}>{riskDay.dayOfWeek}</Text>
              <View style={[s.riskBadge, {
                backgroundColor: riskDay.riskLevel === '높음' ? 'rgba(239,68,68,0.2)' :
                                 riskDay.riskLevel === '보통' ? 'rgba(251,191,36,0.2)' : 'rgba(16,185,129,0.2)'
              }]}>
                <Text style={[s.riskBadgeText, {
                  color: riskDay.riskLevel === '높음' ? '#EF4444' :
                         riskDay.riskLevel === '보통' ? '#FBBF24' : '#10B981'
                }]}>{riskDay.riskLevel}</Text>
              </View>
            </View>
            <Text style={s.riskReason}>{riskDay.reason}</Text>
          </View>

          {/* Habit Patterns */}
          {patterns.length > 0 && (
            <>
              <Text style={s.secTitle}>🔍 행동 패턴 분석</Text>
              {patterns.slice(0, 4).map((p, i) => (
                <View key={i} style={[s.patternCard, {
                  borderColor: p.type === 'improvement' ? 'rgba(16,185,129,0.3)' :
                               p.type === 'regression' ? 'rgba(239,68,68,0.3)' :
                               p.type === 'spike' ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.3)'
                }]}>
                  <Text style={s.patternIcon}>
                    {p.type === 'improvement' ? '🎉' : p.type === 'regression' ? '⚠️' : p.type === 'spike' ? '🚨' : '📊'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.patternDesc}>{p.description}</Text>
                    <Text style={s.patternConf}>신뢰도 {Math.round(p.confidence * 100)}%</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* AI Insights */}
          <Text style={s.secTitle}>💡 AI 추천</Text>
          {weeklyInsights.map((insight, i) => (
            <View key={i} style={s.insightCard}>
              <Ionicons name="sparkles" size={16} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={s.insightText}>{insight}</Text>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  heroCard: { borderRadius: 20, padding: 20, marginBottom: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  heroScore: { fontSize: 48, fontWeight: '900', color: '#FFF', lineHeight: 52 },
  heroScoreMax: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  stressCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  stressCircleNum: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  stressCircleLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between' },
  heroStatItem: { alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  moodRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  currentMoodCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moodCardLabel: { fontSize: 11, color: '#6B6B8D', fontWeight: '600', marginBottom: 8 },
  moodCardEmoji: { fontSize: 36, marginBottom: 6 },
  moodCardText: { fontSize: 14, fontWeight: '700' },
  moodCardEnergy: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },
  checkInBtn: { width: 100, borderRadius: 16, overflow: 'hidden' },
  checkInGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  checkInText: { fontSize: 13, fontWeight: '700', color: '#FFF', textAlign: 'center', lineHeight: 18 },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  triggersCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  triggerBadge: { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 12, paddingVertical: 6 },
  triggerText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  historyCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyEmoji: { fontSize: 24 },
  historyMood: { fontSize: 14, fontWeight: '600' },
  historyNote: { fontSize: 11, color: '#6B6B8D', marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyEnergy: { fontSize: 12, color: '#FBBF24', fontWeight: '600' },
  historyTime: { fontSize: 11, color: '#6B6B8D' },
  riskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 24, gap: 16, borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' },
  riskLeft: { alignItems: 'center', gap: 6 },
  riskDay: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  riskBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  riskBadgeText: { fontSize: 12, fontWeight: '700' },
  riskReason: { flex: 1, fontSize: 13, color: '#A0A0C0', lineHeight: 20 },
  patternCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  patternIcon: { fontSize: 20 },
  patternDesc: { fontSize: 13, color: '#D0D0F0', lineHeight: 20 },
  patternConf: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },
  insightCard: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', borderRadius: 12, padding: 14, marginBottom: 8 },
  insightText: { flex: 1, fontSize: 13, color: '#A0A0C0', lineHeight: 20 },
});
