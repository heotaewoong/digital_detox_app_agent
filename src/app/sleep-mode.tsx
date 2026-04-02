import { useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAppControlStore } from '@/store/useAppControlStore';

export default function SleepModeScreen() {
  const router = useRouter();
  const { sleepConfig, sleepActive, updateSleep, toggleSleepActive, loadData } = useAppControlStore();

  useEffect(() => { loadData(); }, []);

  const config = sleepConfig;
  const isActive = sleepActive;
  const update = useCallback((partial: Partial<typeof sleepConfig>) => {
    updateSleep(partial);
  }, [updateSleep]);

  const toggleActive = useCallback(() => {
    if (!isActive) {
      Alert.alert('🌙 수면 모드', `${config.bedtime} ~ ${config.wakeTime} 동안 수면 모드가 활성화됩니다.`, [
        { text: '취소', style: 'cancel' },
        { text: '활성화', onPress: () => toggleSleepActive() },
      ]);
    } else {
      toggleSleepActive();
    }
  }, [isActive, config, toggleSleepActive]);

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const windDownTime = subtractMinutes(config.bedtime, config.windDownMinutes);
  const isWindDown = isActive && currentTime >= windDownTime && currentTime < config.bedtime;
  const isSleeping = isActive && (currentTime >= config.bedtime || currentTime < config.wakeTime);

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.title}>수면 모드</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Status Card */}
        <LinearGradient
          colors={isSleeping ? ['#1E1B4B', '#312E81'] : isWindDown ? ['#78350F', '#92400E'] : ['#374151', '#1F2937']}
          style={st.statusCard}
        >
          <Text style={st.statusEmoji}>{isSleeping ? '😴' : isWindDown ? '🌅' : '🌙'}</Text>
          <View style={st.statusInfo}>
            <Text style={st.statusTitle}>
              {isSleeping ? '수면 중' : isWindDown ? '취침 준비 중' : isActive ? '대기 중' : '비활성'}
            </Text>
            <Text style={st.statusSub}>
              {isSleeping ? '모든 앱이 차단되었습니다'
                : isWindDown ? `${config.windDownMinutes}분 후 수면 모드 시작`
                : `${config.bedtime} ~ ${config.wakeTime}`}
            </Text>
          </View>
          <TouchableOpacity style={st.powerBtn} onPress={toggleActive}>
            <Ionicons name={isActive ? 'power' : 'moon'} size={24} color={isActive ? '#EF4444' : '#8B5CF6'} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Time Settings */}
        <Text style={st.sectionLabel}>시간 설정</Text>
        <View style={st.card}>
          <View style={st.timeRow}>
            <View style={st.timeBlock}>
              <Text style={st.timeLabel}>🌙 취침</Text>
              <Text style={st.timeValue}>{config.bedtime}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#6B6B8D" />
            <View style={st.timeBlock}>
              <Text style={st.timeLabel}>☀️ 기상</Text>
              <Text style={st.timeValue}>{config.wakeTime}</Text>
            </View>
          </View>
        </View>

        {/* Wind Down */}
        <Text style={st.sectionLabel}>취침 준비 시간</Text>
        <View style={st.card}>
          <Text style={st.windDownDesc}>취침 전 화면 밝기를 줄이고 알림을 제한합니다</Text>
          <View style={st.windDownRow}>
            {[15, 30, 45, 60].map((m) => (
              <TouchableOpacity key={m}
                style={[st.windDownChip, config.windDownMinutes === m && st.windDownChipActive]}
                onPress={() => update({ windDownMinutes: m })}>
                <Text style={[st.windDownText, config.windDownMinutes === m && st.windDownTextActive]}>{m}분</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Options */}
        <Text style={st.sectionLabel}>수면 모드 옵션</Text>
        <View style={st.card}>
          {[
            { key: 'blockAllApps' as const, label: '모든 앱 차단', icon: 'apps', color: '#EF4444' },
            { key: 'blockNotifications' as const, label: '알림 차단', icon: 'notifications-off', color: '#F97316' },
            { key: 'allowAlarms' as const, label: '알람 허용', icon: 'alarm', color: '#10B981' },
            { key: 'allowCalls' as const, label: '전화 허용', icon: 'call', color: '#3B82F6' },
            { key: 'showReminder' as const, label: '취침 리마인더', icon: 'time', color: '#8B5CF6' },
            { key: 'grayscaleMode' as const, label: '흑백 모드 (눈 보호)', icon: 'contrast', color: '#6B7280' },
          ].map((opt, i) => (
            <View key={opt.key}>
              {i > 0 && <View style={st.divider} />}
              <View style={st.optionRow}>
                <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                <Text style={st.optionLabel}>{opt.label}</Text>
                <Switch value={config[opt.key]}
                  onValueChange={(v) => update({ [opt.key]: v })}
                  trackColor={{ false: '#333', true: `${opt.color}40` }}
                  thumbColor={config[opt.key] ? opt.color : '#666'} />
              </View>
            </View>
          ))}
        </View>

        {/* Sleep Tips */}
        <Text style={st.sectionLabel}>수면 팁</Text>
        <View style={st.tipsCard}>
          {[
            '📱 취침 1시간 전부터 스마트폰 사용을 줄이세요',
            '🌡️ 침실 온도를 18-22°C로 유지하세요',
            '☕ 오후 2시 이후 카페인을 피하세요',
            '🏃 규칙적인 운동은 수면 질을 높여줍니다',
            '📖 취침 전 독서는 좋은 수면 습관입니다',
          ].map((tip, i) => (
            <Text key={i} style={st.tipText}>{tip}</Text>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function subtractMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m - minutes;
  const adjusted = total < 0 ? total + 1440 : total;
  return `${Math.floor(adjusted / 60).toString().padStart(2, '0')}:${(adjusted % 60).toString().padStart(2, '0')}`;
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  statusCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, gap: 14, marginBottom: 24 },
  statusEmoji: { fontSize: 36 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statusSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  powerBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#6B6B8D', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  timeBlock: { alignItems: 'center' },
  timeLabel: { fontSize: 13, color: '#6B6B8D', marginBottom: 4 },
  timeValue: { fontSize: 28, fontWeight: '700', color: '#FFF', fontVariant: ['tabular-nums'] },
  windDownDesc: { fontSize: 13, color: '#6B6B8D', marginBottom: 12 },
  windDownRow: { flexDirection: 'row', gap: 8 },
  windDownChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  windDownChipActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.2)' },
  windDownText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  windDownTextActive: { color: '#8B5CF6' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#FFF' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  tipsCard: { backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  tipText: { fontSize: 13, color: '#A0A0C0', lineHeight: 20 },
});
