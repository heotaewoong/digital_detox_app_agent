import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAppControlStore } from '@/store/useAppControlStore';
import { ChromeExtensionBridge } from '@/services/ChromeExtensionBridge';

export default function AppLimitsScreen() {
  const router = useRouter();
  const { appLimits, updateAppLimit, toggleAppLimit, loadData } = useAppControlStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadData();
    // 크롬 확장 프로그램의 실제 사용 시간 데이터 로드
    const extReport = ChromeExtensionBridge.getExtensionReport();
    if (extReport && extReport.categories) {
      extReport.categories.forEach((cat) => {
        // 카테고리 이름으로 앱 제한과 매칭
        const matchingLimit = appLimits.find(l =>
          l.name.toLowerCase().includes(cat.label.toLowerCase()) ||
          cat.label.toLowerCase().includes(l.name.toLowerCase())
        );
        if (matchingLimit) {
          updateAppLimit(matchingLimit.id, { usedMinutes: cat.minutes });
        }
      });
    }
  }, []);

  const toggleLimit = useCallback((id: string) => {
    toggleAppLimit(id);
  }, [toggleAppLimit]);

  const startEdit = useCallback((limit: typeof appLimits[0]) => {
    setEditingId(limit.id);
    setEditValue(limit.dailyLimitMinutes.toString());
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const minutes = parseInt(editValue, 10);
    if (isNaN(minutes) || minutes < 1) return;
    updateAppLimit(editingId, { dailyLimitMinutes: minutes });
    setEditingId(null);
  }, [editingId, editValue, updateAppLimit]);

  const limits = appLimits;
  const totalLimit = limits.filter((l) => l.enabled).reduce((s, l) => s + l.dailyLimitMinutes, 0);
  const totalUsed = limits.filter((l) => l.enabled).reduce((s, l) => s + l.usedMinutes, 0);

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.title}>앱 사용 제한</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary */}
        <View style={st.summaryCard}>
          <View style={st.summaryRow}>
            <View style={st.summaryItem}>
              <Text style={st.summaryNum}>{totalUsed}분</Text>
              <Text style={st.summaryLabel}>오늘 사용</Text>
            </View>
            <View style={st.summaryDivider} />
            <View style={st.summaryItem}>
              <Text style={st.summaryNum}>{totalLimit}분</Text>
              <Text style={st.summaryLabel}>일일 제한</Text>
            </View>
            <View style={st.summaryDivider} />
            <View style={st.summaryItem}>
              <Text style={[st.summaryNum, { color: totalUsed > totalLimit ? '#EF4444' : '#10B981' }]}>
                {Math.max(0, totalLimit - totalUsed)}분
              </Text>
              <Text style={st.summaryLabel}>남은 시간</Text>
            </View>
          </View>
          {/* Overall progress bar */}
          <View style={st.overallBarBg}>
            <View style={[st.overallBarFill, {
              width: `${Math.min(100, (totalUsed / totalLimit) * 100)}%`,
              backgroundColor: totalUsed > totalLimit * 0.8 ? '#EF4444' : totalUsed > totalLimit * 0.5 ? '#FBBF24' : '#10B981',
            }]} />
          </View>
        </View>

        {/* App Limits */}
        {limits.map((limit) => {
          const percentage = limit.dailyLimitMinutes > 0 ? (limit.usedMinutes / limit.dailyLimitMinutes) * 100 : 0;
          const isOver = percentage >= 100;
          const isWarning = percentage >= 80;
          const barColor = isOver ? '#EF4444' : isWarning ? '#FBBF24' : '#10B981';

          return (
            <View key={limit.id} style={[st.limitCard, !limit.enabled && st.limitCardDisabled]}>
              <View style={st.limitHeader}>
                <Text style={st.limitEmoji}>{limit.emoji}</Text>
                <View style={st.limitInfo}>
                  <Text style={st.limitName}>{limit.name}</Text>
                  <Text style={st.limitMeta}>
                    {limit.usedMinutes}분 / {limit.dailyLimitMinutes}분
                    {isOver && ' ⚠️ 초과!'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => toggleLimit(limit.id)}>
                  <Ionicons name={limit.enabled ? 'toggle' : 'toggle-outline'} size={28}
                    color={limit.enabled ? '#8B5CF6' : '#6B6B8D'} />
                </TouchableOpacity>
              </View>

              {limit.enabled && (
                <>
                  <View style={st.limitBarBg}>
                    <View style={[st.limitBarFill, { width: `${Math.min(100, percentage)}%`, backgroundColor: barColor }]} />
                  </View>

                  {editingId === limit.id ? (
                    <View style={st.editRow}>
                      <TextInput style={st.editInput} value={editValue} onChangeText={setEditValue}
                        keyboardType="number-pad" autoFocus />
                      <Text style={st.editUnit}>분</Text>
                      <TouchableOpacity style={st.editSaveBtn} onPress={saveEdit}>
                        <Text style={st.editSaveText}>저장</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={st.editTrigger} onPress={() => startEdit(limit)}>
                      <Ionicons name="create-outline" size={14} color="#6B6B8D" />
                      <Text style={st.editTriggerText}>제한 시간 변경</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          );
        })}

        {/* Quick Presets */}
        <Text style={st.sectionLabel}>빠른 설정</Text>
        <View style={st.presetRow}>
          {[
            { label: '엄격 (1시간)', total: 60 },
            { label: '보통 (2시간)', total: 120 },
            { label: '여유 (3시간)', total: 180 },
          ].map((preset) => (
            <TouchableOpacity key={preset.label} style={st.presetBtn}
              onPress={() => {
                const perApp = Math.floor(preset.total / limits.filter((l) => l.enabled).length);
                limits.filter((l) => l.enabled).forEach((l) => updateAppLimit(l.id, { dailyLimitMinutes: perApp }));
              }}>
              <Text style={st.presetBtnText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  summaryLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  overallBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  overallBarFill: { height: '100%', borderRadius: 4 },
  limitCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  limitCardDisabled: { opacity: 0.5 },
  limitHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  limitEmoji: { fontSize: 28 },
  limitInfo: { flex: 1 },
  limitName: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  limitMeta: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },
  limitBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  limitBarFill: { height: '100%', borderRadius: 3 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  editUnit: { fontSize: 14, color: '#6B6B8D' },
  editSaveBtn: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editSaveText: { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  editTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editTriggerText: { fontSize: 12, color: '#6B6B8D' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#6B6B8D', marginBottom: 10, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  presetBtnText: { fontSize: 12, fontWeight: '600', color: '#A0A0C0' },
});
