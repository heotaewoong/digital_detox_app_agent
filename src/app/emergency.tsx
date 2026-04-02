import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MoodAnalyzer } from '@/services/ai/MoodAnalyzer';
import { AdaptiveInterventionEngine } from '@/services/ai/AdaptiveInterventionEngine';

const SOS_DURATION_OPTIONS = [
  { label: '15분', value: 15 },
  { label: '30분', value: 30 },
  { label: '1시간', value: 60 },
  { label: '2시간', value: 120 },
  { label: '오늘 하루', value: 1440 },
];

export default function EmergencyScreen() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const pulseAnim = useState(() => new Animated.Value(1))[0];

  const moodState = useMemo(() => MoodAnalyzer.getCurrentMoodState(), []);
  const alternative = useMemo(() => AdaptiveInterventionEngine.getAlternativeActivity('general', 'stressed'), []);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) { clearInterval(timer); setIsActive(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isActive]);

  const activateSOS = useCallback(() => {
    Alert.alert(
      '🚨 긴급 차단 모드',
      `${selectedDuration}분 동안 모든 앱과 사이트를 차단합니다.\n이 기간 동안 해제할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '활성화', style: 'destructive', onPress: () => {
          setIsActive(true);
          setRemainingSeconds(selectedDuration * 60);
          Vibration.vibrate([0, 200, 100, 200]);
        }},
      ]
    );
  }, [selectedDuration]);

  const deactivate = useCallback(() => {
    Alert.alert('차단 해제', '정말 긴급 차단을 해제하시겠습니까?\n책임 파트너에게 알림이 전송됩니다.', [
      { text: '유지', style: 'cancel' },
      { text: '해제', style: 'destructive', onPress: () => {
        setIsActive(false);
        setRemainingSeconds(0);
      }},
    ]);
  }, []);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={st.title}>긴급 차단 모드</Text>
        <View style={{ width: 24 }} />
      </View>

      {isActive ? (
        <View style={st.activeContainer}>
          <Animated.View style={[st.sosCircle, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={st.sosCircleInner}>
              <Ionicons name="lock-closed" size={48} color="#FFF" />
              <Text style={st.sosTimer}>{formatTime(remainingSeconds)}</Text>
              <Text style={st.sosLabel}>차단 중</Text>
            </LinearGradient>
          </Animated.View>
          <Text style={st.sosMsg}>모든 앱과 사이트가 차단되었습니다</Text>
          <Text style={st.sosSubMsg}>집중하세요! 당신은 할 수 있어요 💪</Text>
          <TouchableOpacity style={st.deactivateBtn} onPress={deactivate}>
            <Text style={st.deactivateText}>긴급 해제 (파트너 알림)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={st.setupContainer}>
          <View style={st.sosIconWrap}>
            <Ionicons name="warning" size={64} color="#EF4444" />
          </View>
          <Text style={st.setupTitle}>긴급 차단이 필요한 순간인가요?</Text>
          <Text style={st.setupDesc}>
            유혹을 느낄 때 즉시 모든 앱과 사이트를 차단합니다.{'\n'}
            설정한 시간 동안 해제가 어렵습니다.
          </Text>

          {/* Stress Level */}
          <View style={st.stressInfo}>
            <View style={st.stressRow}>
              <Ionicons name="pulse-outline" size={16} color={moodState.inferredStress > 60 ? '#EF4444' : '#FBBF24'} />
              <Text style={st.stressText}>현재 스트레스 지수: {moodState.inferredStress}%</Text>
              <View style={[st.stressBadge, {
                backgroundColor: moodState.riskLevel === 'critical' ? 'rgba(239,68,68,0.2)' :
                                 moodState.riskLevel === 'high' ? 'rgba(249,115,22,0.2)' : 'rgba(251,191,36,0.2)'
              }]}>
                <Text style={[st.stressBadgeText, {
                  color: moodState.riskLevel === 'critical' ? '#EF4444' :
                         moodState.riskLevel === 'high' ? '#F97316' : '#FBBF24'
                }]}>
                  {moodState.riskLevel === 'critical' ? '🔴 위험' : moodState.riskLevel === 'high' ? '🟠 높음' : '🟡 보통'}
                </Text>
              </View>
            </View>
          </View>

          {/* Alternative suggestion */}
          <View style={st.altCard}>
            <Ionicons name="leaf-outline" size={18} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={st.altTitle}>대신 이렇게 해보세요</Text>
              <Text style={st.altText}>{alternative}</Text>
            </View>
          </View>

          <Text style={st.durationLabel}>차단 시간 선택</Text>
          <View style={st.durationRow}>
            {SOS_DURATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[st.durationChip, selectedDuration === opt.value && st.durationChipActive]}
                onPress={() => setSelectedDuration(opt.value)}
              >
                <Text style={[st.durationText, selectedDuration === opt.value && st.durationTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={activateSOS}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={st.sosBtn}>
              <Ionicons name="shield" size={24} color="#FFF" />
              <Text style={st.sosBtnText}>긴급 차단 활성화</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A', paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  activeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  sosCircle: { marginBottom: 32 },
  sosCircleInner: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  sosTimer: { fontSize: 36, fontWeight: '700', color: '#FFF', marginTop: 8, fontVariant: ['tabular-nums'] },
  sosLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  sosMsg: { fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  sosSubMsg: { fontSize: 15, color: '#A0A0C0', marginTop: 8, textAlign: 'center' },
  deactivateBtn: { marginTop: 40, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deactivateText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  setupContainer: { flex: 1, alignItems: 'center', paddingTop: 40 },
  sosIconWrap: { marginBottom: 24 },
  setupTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  setupDesc: { fontSize: 14, color: '#A0A0C0', textAlign: 'center', lineHeight: 22, marginTop: 12, marginBottom: 32 },
  durationLabel: { fontSize: 14, fontWeight: '600', color: '#6B6B8D', marginBottom: 12, alignSelf: 'flex-start' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32, alignSelf: 'stretch' },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  durationChipActive: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.15)' },
  durationText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  durationTextActive: { color: '#EF4444' },
  sosBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 40, gap: 10 },
  sosBtnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  stressInfo: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stressText: { flex: 1, fontSize: 13, color: '#A0A0C0', fontWeight: '500' },
  stressBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  stressBadgeText: { fontSize: 11, fontWeight: '700' },
  altCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', padding: 14, marginBottom: 24, alignSelf: 'stretch' },
  altTitle: { fontSize: 12, fontWeight: '700', color: '#10B981', marginBottom: 4 },
  altText: { fontSize: 13, color: '#A0A0C0', lineHeight: 20 },
});
