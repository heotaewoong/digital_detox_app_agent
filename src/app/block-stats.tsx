import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMonitorStore } from '@/store/useMonitorStore';
import { ChromeExtensionBridge } from '@/services/ChromeExtensionBridge';
import { CrossAppTracker } from '@/services/monitoring/CrossAppTracker';
import { AdaptiveInterventionEngine } from '@/services/ai/AdaptiveInterventionEngine';

type Period = 'today' | 'week' | 'all';

const ACTION_COLORS = { logged: '#3B82F6', warned: '#FBBF24', blocked: '#EF4444' };
const ACTION_LABELS = { logged: '기록', warned: '경고', blocked: '차단' };

const CATEGORY_EMOJI: Record<string, string> = {
  gambling: '🎰', gaming: '🎮', adult: '🔞', social_media: '📱',
  shopping: '🛒', news: '📰', custom: '✏️',
};

export default function BlockStatsScreen() {
  const router = useRouter();
  const { detectionLog } = useMonitorStore();
  const [period, setPeriod] = useState<Period>('today');
  const [extStats, setExtStats] = useState<any>(null);
  const [crossStats] = useState(() => CrossAppTracker.getTransitionStats());
  const [effectStats] = useState(() => AdaptiveInterventionEngine.getEffectivenessStats());

  useEffect(() => {
    const stats = ChromeExtensionBridge.getExtensionStats();
    setExtStats(stats);
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600000).toISOString();

  const filtered = detectionLog.filter((d) => {
    if (period === 'today') return d.timestamp.startsWith(todayStr);
    if (period === 'week') return d.timestamp >= weekAgo;
    return true;
  });

  const blocked = filtered.filter(d => d.action === 'blocked').length;
  const warned = filtered.filter(d => d.action === 'warned').length;
  const logged = filtered.filter(d => d.action === 'logged').length;

  // 카테고리별 집계
  const catMap: Record<string, number> = {};
  filtered.forEach(d => { catMap[d.category] = (catMap[d.category] || 0) + 1; });
  const catList = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  // 시간대별 집계 (오늘)
  const hourMap: Record<number, number> = {};
  filtered.filter(d => d.timestamp.startsWith(todayStr)).forEach(d => {
    const h = new Date(d.timestamp).getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  });
  const maxHour = Math.max(...Object.values(hourMap), 1);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.title}>차단 통계</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* 확장 프로그램 실제 통계 */}
        {extStats && (
          <View style={s.extCard}>
            <Ionicons name="globe-outline" size={18} color="#8B5CF6" />
            <Text style={s.extText}>크롬 확장: 오늘 {extStats.todayBlocked}건 / 총 {extStats.totalBlocked}건 차단</Text>
          </View>
        )}

        {/* 기간 선택 */}
        <View style={s.periodRow}>
          {(['today', 'week', 'all'] as Period[]).map((p) => (
            <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodBtnActive]} onPress={() => setPeriod(p)}>
              <Text style={[s.periodText, period === p && s.periodTextActive]}>
                {p === 'today' ? '오늘' : p === 'week' ? '이번 주' : '전체'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 요약 카드 */}
        <View style={s.summaryRow}>
          <LinearGradient colors={['#EF4444', '#DC2626']} style={s.summaryCard}>
            <Text style={s.summaryNum}>{blocked}</Text>
            <Text style={s.summaryLabel}>차단</Text>
          </LinearGradient>
          <LinearGradient colors={['#FBBF24', '#D97706']} style={s.summaryCard}>
            <Text style={s.summaryNum}>{warned}</Text>
            <Text style={s.summaryLabel}>경고</Text>
          </LinearGradient>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.summaryCard}>
            <Text style={s.summaryNum}>{logged}</Text>
            <Text style={s.summaryLabel}>기록</Text>
          </LinearGradient>
        </View>

        {/* 크로스앱 우회 분석 */}
        <Text style={s.sectionTitle}>🔀 앱 전환 & 우회 분석</Text>
        <View style={s.evasionCard}>
          <View style={s.evasionRow}>
            <View style={s.evasionStat}>
              <Text style={s.evasionNum}>{crossStats.totalTransitions}</Text>
              <Text style={s.evasionLbl}>총 전환</Text>
            </View>
            <View style={s.evasionStat}>
              <Text style={[s.evasionNum, { color: crossStats.evasionAttempts > 0 ? '#EF4444' : '#10B981' }]}>
                {crossStats.evasionAttempts}
              </Text>
              <Text style={s.evasionLbl}>우회 시도</Text>
            </View>
            <View style={s.evasionStat}>
              <Text style={[s.evasionNum, { color: crossStats.evasionRate > 20 ? '#EF4444' : '#10B981' }]}>
                {crossStats.evasionRate}%
              </Text>
              <Text style={s.evasionLbl}>우회율</Text>
            </View>
          </View>
          {crossStats.mostCommonEvasion !== '없음' && (
            <View style={s.evasionAlert}>
              <Ionicons name="swap-horizontal" size={14} color="#FBBF24" />
              <Text style={s.evasionAlertText}>자주 우회: {crossStats.mostCommonEvasion}</Text>
            </View>
          )}
        </View>

        {/* AI 개입 효과 */}
        {Object.keys(effectStats).length > 0 && (
          <>
            <Text style={s.sectionTitle}>🧠 AI 개입 효과</Text>
            <View style={s.effectCard}>
              {Object.entries(effectStats).map(([type, stat]) => (
                <View key={type} style={s.effectRow}>
                  <Text style={s.effectType}>{type}</Text>
                  <View style={s.effectBarBg}>
                    <View style={[s.effectBarFill, {
                      width: `${stat.rate}%`,
                      backgroundColor: stat.rate >= 70 ? '#10B981' : stat.rate >= 40 ? '#FBBF24' : '#EF4444'
                    }]} />
                  </View>
                  <Text style={s.effectRate}>{stat.rate}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 시간대별 차트 (오늘) */}
        {period === 'today' && Object.keys(hourMap).length > 0 && (
          <>
            <Text style={s.sectionTitle}>시간대별 감지</Text>
            <View style={s.hourChart}>
              {Array.from({ length: 24 }).map((_, h) => {
                const count = hourMap[h] || 0;
                const barH = count > 0 ? Math.max(8, (count / maxHour) * 80) : 4;
                return (
                  <View key={h} style={s.hourCol}>
                    <View style={[s.hourBar, { height: barH, backgroundColor: count > 0 ? '#EF4444' : 'rgba(255,255,255,0.05)' }]} />
                    {h % 6 === 0 && <Text style={s.hourLabel}>{h}시</Text>}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* 카테고리별 */}
        {catList.length > 0 && (
          <>
            <Text style={s.sectionTitle}>카테고리별</Text>
            <View style={s.catCard}>
              {catList.map(([cat, count]) => (
                <View key={cat} style={s.catRow}>
                  <Text style={s.catEmoji}>{CATEGORY_EMOJI[cat] || '📄'}</Text>
                  <Text style={s.catName}>{cat}</Text>
                  <View style={s.catBarBg}>
                    <View style={[s.catBarFill, { width: `${(count / filtered.length) * 100}%` }]} />
                  </View>
                  <Text style={s.catCount}>{count}건</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 최근 감지 로그 */}
        <Text style={s.sectionTitle}>최근 감지 기록</Text>
        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={s.emptyText}>감지된 항목이 없어요</Text>
            <Text style={s.emptySubtext}>잘 지키고 있어요!</Text>
          </View>
        ) : (
          filtered.slice(0, 20).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((event) => (
            <View key={event.id} style={s.logCard}>
              <View style={s.logHeader}>
                <View style={s.logApp}>
                  <Ionicons name="apps" size={14} color="#A0A0C0" />
                  <Text style={s.logAppName}>{event.appName}</Text>
                </View>
                <View style={[s.actionBadge, { backgroundColor: `${ACTION_COLORS[event.action]}20` }]}>
                  <Text style={[s.actionText, { color: ACTION_COLORS[event.action] }]}>
                    {ACTION_LABELS[event.action]}
                  </Text>
                </View>
              </View>
              <Text style={s.logKeywords} numberOfLines={1}>
                키워드: {event.matchedKeywords.join(', ')}
              </Text>
              <View style={s.logFooter}>
                <Text style={s.logCat}>{CATEGORY_EMOJI[event.category] || '📄'} {event.category}</Text>
                <Text style={s.logTime}>
                  {new Date(event.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  extCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  extText: { fontSize: 13, color: '#A0A0C0' },
  periodRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  periodBtnActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#6B6B8D' },
  periodTextActive: { color: '#8B5CF6' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  hourChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, marginBottom: 24, gap: 2 },
  hourCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  hourBar: { width: '80%', borderRadius: 2 },
  hourLabel: { fontSize: 8, color: '#6B6B8D', marginTop: 4 },
  catCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 24, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catEmoji: { fontSize: 20, width: 24 },
  catName: { fontSize: 13, color: '#A0A0C0', width: 80 },
  catBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', backgroundColor: '#EF4444', borderRadius: 3 },
  catCount: { fontSize: 13, fontWeight: '600', color: '#FFF', width: 36, textAlign: 'right' },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#FFF', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#6B6B8D', marginTop: 6 },
  logCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logApp: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logAppName: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  actionBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  actionText: { fontSize: 11, fontWeight: '700' },
  logKeywords: { fontSize: 12, color: '#A0A0C0', marginBottom: 6 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  logCat: { fontSize: 11, color: '#6B6B8D' },
  logTime: { fontSize: 11, color: '#6B6B8D' },
  // Evasion analysis styles
  evasionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  evasionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  evasionStat: { alignItems: 'center' },
  evasionNum: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  evasionLbl: { fontSize: 11, color: '#6B6B8D', marginTop: 2 },
  evasionAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 8, padding: 8 },
  evasionAlertText: { fontSize: 12, color: '#FBBF24', fontWeight: '600' },
  effectCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 20, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  effectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  effectType: { fontSize: 12, color: '#A0A0C0', width: 70 },
  effectBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  effectBarFill: { height: '100%', borderRadius: 4 },
  effectRate: { fontSize: 12, fontWeight: '700', color: '#FFF', width: 36, textAlign: 'right' },
});
