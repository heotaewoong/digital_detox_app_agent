import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useChallengeStore } from '@/store/useChallengeStore';
import { useFocusStore } from '@/store/useFocusStore';

type TabMode = 'challenges' | 'habits';

const DIFFICULTY_INFO = {
  easy: { label: '쉬움', color: '#10B981', emoji: '🟢' },
  medium: { label: '보통', color: '#FBBF24', emoji: '🟡' },
  hard: { label: '어려움', color: '#EF4444', emoji: '🔴' },
};

const HABIT_PRESETS = [
  { name: '아침 명상', emoji: '🧘', days: 21 },
  { name: '운동하기', emoji: '💪', days: 30 },
  { name: 'SNS 1시간 이하', emoji: '📵', days: 21 },
  { name: '독서 30분', emoji: '📖', days: 30 },
  { name: '일찍 자기', emoji: '🌙', days: 21 },
  { name: '물 8잔 마시기', emoji: '💧', days: 30 },
];

export default function ChallengesScreen() {
  const router = useRouter();
  const {
    todayChallenges, totalChallengesCompleted, habits,
    generateDailyChallenges, completeChallenge, addHabit, removeHabit,
    toggleHabitToday, getHabitStreak, loadData,
  } = useChallengeStore();
  const { coins } = useFocusStore();

  const [tab, setTab] = useState<TabMode>('challenges');
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitEmoji, setHabitEmoji] = useState('✅');
  const [habitDays, setHabitDays] = useState(21);

  useEffect(() => { loadData(); generateDailyChallenges(); }, []);

  const handleAddHabit = useCallback(() => {
    if (!habitName.trim()) return;
    addHabit(habitName.trim(), habitEmoji, habitDays);
    setHabitName(''); setHabitEmoji('✅'); setHabitDays(21);
    setShowHabitModal(false);
  }, [habitName, habitEmoji, habitDays, addHabit]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.title}>챌린지 & 습관</Text>
          <View style={s.coinBadge}><Text style={s.coinText}>🪙 {coins}</Text></View>
        </View>

        {/* Tab Switcher */}
        <View style={s.tabRow}>
          <TouchableOpacity style={[s.tab, tab === 'challenges' && s.tabActive]} onPress={() => setTab('challenges')}>
            <Text style={[s.tabText, tab === 'challenges' && s.tabTextActive]}>🎯 일일 챌린지</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'habits' && s.tabActive]} onPress={() => setTab('habits')}>
            <Text style={[s.tabText, tab === 'habits' && s.tabTextActive]}>📅 습관 트래커</Text>
          </TouchableOpacity>
        </View>

        {tab === 'challenges' ? renderChallenges() : renderHabits()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={showHabitModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>새 습관 추가</Text>
              <TouchableOpacity onPress={() => setShowHabitModal(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>프리셋 선택</Text>
            <View style={s.presetGrid}>
              {HABIT_PRESETS.map((p) => (
                <TouchableOpacity key={p.name} style={s.presetChip}
                  onPress={() => { setHabitName(p.name); setHabitEmoji(p.emoji); setHabitDays(p.days); }}>
                  <Text style={s.presetEmoji}>{p.emoji}</Text>
                  <Text style={s.presetName}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>습관 이름</Text>
            <TextInput style={s.input} placeholder="예: 매일 운동하기" placeholderTextColor="#6B6B8D"
              value={habitName} onChangeText={setHabitName} />

            <Text style={s.inputLabel}>목표 일수</Text>
            <View style={s.daysRow}>
              {[7, 14, 21, 30, 66].map((d) => (
                <TouchableOpacity key={d} style={[s.dayChip, habitDays === d && s.dayChipActive]}
                  onPress={() => setHabitDays(d)}>
                  <Text style={[s.dayChipText, habitDays === d && s.dayChipTextActive]}>{d}일</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[s.saveBtn, !habitName.trim() && { opacity: 0.5 }]}
              onPress={handleAddHabit} disabled={!habitName.trim()}>
              <LinearGradient colors={['#6C5CE7', '#A855F7']} style={s.saveBtnGrad}>
                <Text style={s.saveBtnText}>습관 추가</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  function renderChallenges() {
    return (
      <View>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{todayChallenges.filter((c) => c.completed).length}/{todayChallenges.length}</Text>
            <Text style={s.statLabel}>오늘 완료</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{totalChallengesCompleted}</Text>
            <Text style={s.statLabel}>총 완료</Text>
          </View>
        </View>

        {todayChallenges.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>🎯</Text>
            <Text style={s.emptyText}>오늘의 챌린지를 생성하세요</Text>
            <TouchableOpacity style={s.generateBtn} onPress={generateDailyChallenges}>
              <Text style={s.generateBtnText}>챌린지 생성</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayChallenges.map((ch) => {
            const diff = DIFFICULTY_INFO[ch.difficulty];
            return (
              <View key={ch.id} style={[s.challengeCard, ch.completed && s.challengeCardDone]}>
                <View style={s.challengeHeader}>
                  <Text style={s.challengeEmoji}>{ch.emoji}</Text>
                  <View style={s.challengeInfo}>
                    <Text style={s.challengeTitle}>{ch.title}</Text>
                    <Text style={s.challengeDesc}>{ch.description}</Text>
                  </View>
                  <View style={[s.diffBadge, { backgroundColor: `${diff.color}20` }]}>
                    <Text style={[s.diffText, { color: diff.color }]}>{diff.label}</Text>
                  </View>
                </View>
                <View style={s.challengeFooter}>
                  <Text style={s.rewardText}>🪙 {ch.rewardCoins}</Text>
                  {ch.completed ? (
                    <View style={s.completedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={s.completedText}>완료!</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={s.completeBtn} onPress={() => completeChallenge(ch.id)}>
                      <Text style={s.completeBtnText}>완료하기</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  }

  function renderHabits() {
    return (
      <View>
        <TouchableOpacity style={s.addHabitBtn} onPress={() => setShowHabitModal(true)}>
          <Ionicons name="add-circle" size={22} color="#8B5CF6" />
          <Text style={s.addHabitText}>새 습관 추가</Text>
        </TouchableOpacity>

        {habits.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>📅</Text>
            <Text style={s.emptyText}>습관을 추가해보세요</Text>
            <Text style={s.emptySubtext}>21일이면 습관이 됩니다</Text>
          </View>
        ) : (
          habits.map((habit) => {
            const streak = getHabitStreak(habit.id);
            const completedDays = habit.entries.filter((e) => e.completed).length;
            const progress = Math.min(100, Math.round((completedDays / habit.targetDays) * 100));
            const todayDone = habit.entries.some((e) => e.date === today && e.completed);

            return (
              <View key={habit.id} style={s.habitCard}>
                <View style={s.habitHeader}>
                  <Text style={s.habitEmoji}>{habit.emoji}</Text>
                  <View style={s.habitInfo}>
                    <Text style={s.habitName}>{habit.name}</Text>
                    <Text style={s.habitMeta}>{completedDays}/{habit.targetDays}일 • 🔥 {streak}일 연속</Text>
                  </View>
                  <TouchableOpacity onPress={() => {
                    Alert.alert('삭제', `"${habit.name}" 습관을 삭제하시겠습니까?`, [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => removeHabit(habit.id) },
                    ]);
                  }}>
                    <Ionicons name="trash-outline" size={18} color="#6B6B8D" />
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={s.habitProgressBg}>
                  <LinearGradient colors={['#6C5CE7', '#A855F7']}
                    style={[s.habitProgressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={s.habitProgressText}>{progress}% 달성</Text>

                {/* Calendar dots (last 7 days) */}
                <View style={s.calendarRow}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const dateStr = d.toISOString().split('T')[0];
                    const done = habit.entries.some((e) => e.date === dateStr && e.completed);
                    const isToday = dateStr === today;
                    return (
                      <View key={dateStr} style={s.calendarDay}>
                        <Text style={s.calendarDayLabel}>
                          {['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}
                        </Text>
                        <View style={[s.calendarDot, done && s.calendarDotDone, isToday && s.calendarDotToday]}>
                          {done && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Today toggle */}
                <TouchableOpacity
                  style={[s.habitToggle, todayDone && s.habitToggleDone]}
                  onPress={() => toggleHabitToday(habit.id)}
                >
                  <Ionicons name={todayDone ? 'checkmark-circle' : 'ellipse-outline'} size={20}
                    color={todayDone ? '#10B981' : '#6B6B8D'} />
                  <Text style={[s.habitToggleText, todayDone && s.habitToggleTextDone]}>
                    {todayDone ? '오늘 완료!' : '오늘 체크하기'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  coinBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  coinText: { fontSize: 13, fontWeight: '700', color: '#FBBF24' },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  tabTextActive: { color: '#8B5CF6' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#FFF', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#6B6B8D', marginTop: 6 },
  generateBtn: { marginTop: 16, backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  generateBtnText: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },
  challengeCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  challengeCardDone: { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.05)' },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  challengeEmoji: { fontSize: 32 },
  challengeInfo: { flex: 1 },
  challengeTitle: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  challengeDesc: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },
  diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { fontSize: 11, fontWeight: '600' },
  challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardText: { fontSize: 14, fontWeight: '600', color: '#FBBF24' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  completeBtn: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  completeBtnText: { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  addHabitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 12, paddingVertical: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  addHabitText: { fontSize: 15, fontWeight: '600', color: '#8B5CF6' },
  habitCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  habitHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  habitEmoji: { fontSize: 28 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  habitMeta: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },
  habitProgressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  habitProgressFill: { height: '100%', borderRadius: 3 },
  habitProgressText: { fontSize: 11, color: '#6B6B8D', marginBottom: 10 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  calendarDay: { alignItems: 'center', gap: 4 },
  calendarDayLabel: { fontSize: 10, color: '#6B6B8D' },
  calendarDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  calendarDotDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  calendarDotToday: { borderColor: '#8B5CF6', borderWidth: 2 },
  habitToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  habitToggleDone: { backgroundColor: 'rgba(16,185,129,0.1)' },
  habitToggleText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  habitToggleTextDone: { color: '#10B981' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#A0A0C0', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFF' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  presetEmoji: { fontSize: 16 },
  presetName: { fontSize: 13, color: '#A0A0C0' },
  daysRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dayChipActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.2)' },
  dayChipText: { fontSize: 13, fontWeight: '600', color: '#6B6B8D' },
  dayChipTextActive: { color: '#8B5CF6' },
  saveBtn: { marginTop: 24 },
  saveBtnGrad: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
