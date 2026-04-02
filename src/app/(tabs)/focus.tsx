import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusStore, TREE_CATALOG, ALL_ACHIEVEMENTS } from '@/store/useFocusStore';
import { useChallengeStore } from '@/store/useChallengeStore';
import { TreeType } from '@/types';

const TIMER_PRESETS = [
  { label: '10분', value: 10 },
  { label: '25분', value: 25 },
  { label: '45분', value: 45 },
  { label: '60분', value: 60 },
  { label: '90분', value: 90 },
  { label: '120분', value: 120 },
];

const POMODORO_PRESETS = [
  { label: '25/5', focus: 25, rest: 5, desc: '기본 포모도로' },
  { label: '50/10', focus: 50, rest: 10, desc: '딥 워크' },
  { label: '90/20', focus: 90, rest: 20, desc: '울트라 집중' },
];

type SubTab = 'timer' | 'forest' | 'shop' | 'achievements';

export default function FocusScreen() {
  const {
    activeSession, sessionHistory, selectedTree, coins,
    totalTreesGrown, unlockedTrees, achievements, focusStreak,
    todayFocusMinutes, totalFocusMinutes,
    startSession, completeSession, failSession, selectTree, unlockTree,
    getTodaySessions, loadFocusData,
  } = useFocusStore();
  const { todayChallenges, updateChallengeProgress, completeChallenge: completeChallengeAction } = useChallengeStore();

  const [subTab, setSubTab] = useState<SubTab>('timer');
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  const [pomodoroPreset, setPomodoroPreset] = useState(POMODORO_PRESETS[0]);
  const [pomodoroRound, setPomodoroRound] = useState(1);
  const [isRestPhase, setIsRestPhase] = useState(false);
  const treeScale = useRef(new Animated.Value(0.3)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { loadFocusData(); }, []);

  // Timer logic
  useEffect(() => {
    if (!activeSession) {
      if (timerRef.current) clearInterval(timerRef.current);
      treeScale.setValue(0.3);
      return;
    }

    const totalSec = activeSession.targetMinutes * 60;
    setRemainingSeconds(totalSec);

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          completeSession();
          // 챌린지 자동 업데이트
          todayChallenges.forEach((ch) => {
            if (!ch.completed && ch.type === 'focus_time') {
              completeChallengeAction(ch.id);
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Tree growth animation
    Animated.timing(treeScale, {
      toValue: 1,
      duration: totalSec * 1000,
      useNativeDriver: true,
    }).start();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession?.id]);

  const handleStart = useCallback(() => {
    startSession(selectedMinutes);
  }, [selectedMinutes, startSession]);

  const handleGiveUp = useCallback(() => {
    Alert.alert(
      '포기하시겠습니까?',
      '나무가 시들어버려요... 😢',
      [
        { text: '계속하기', style: 'cancel' },
        { text: '포기', style: 'destructive', onPress: () => {
          if (timerRef.current) clearInterval(timerRef.current);
          failSession();
        }},
      ],
    );
  }, [failSession]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = activeSession
    ? 1 - remainingSeconds / (activeSession.targetMinutes * 60)
    : 0;

  const currentTreeInfo = TREE_CATALOG.find((t) => t.type === selectedTree) || TREE_CATALOG[0];
  const todaySessions = getTodaySessions();
  const todayCompleted = todaySessions.filter((s) => s.completed).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>집중 모드</Text>
          <View style={styles.coinBadge}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinText}>{coins}</Text>
          </View>
        </View>

        {/* Sub tabs */}
        <View style={styles.subTabs}>
          {([
            { key: 'timer' as SubTab, icon: 'timer-outline', label: '타이머' },
            { key: 'forest' as SubTab, icon: 'leaf-outline', label: '나의 숲' },
            { key: 'shop' as SubTab, icon: 'cart-outline', label: '상점' },
            { key: 'achievements' as SubTab, icon: 'trophy-outline', label: '업적' },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTab, subTab === tab.key && styles.subTabActive]}
              onPress={() => setSubTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={16} color={subTab === tab.key ? '#8B5CF6' : '#6B6B8D'} />
              <Text style={[styles.subTabText, subTab === tab.key && styles.subTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {subTab === 'timer' && renderTimer()}
        {subTab === 'forest' && renderForest()}
        {subTab === 'shop' && renderShop()}
        {subTab === 'achievements' && renderAchievements()}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );

  // ─── Timer Tab ───
  function renderTimer() {
    return (
      <View>
        {/* Quick Stats */}
        <View style={styles.focusStats}>
          <View style={styles.focusStat}>
            <Text style={styles.focusStatNum}>{todayCompleted}</Text>
            <Text style={styles.focusStatLabel}>오늘 완료</Text>
          </View>
          <View style={styles.focusStat}>
            <Text style={styles.focusStatNum}>{todayFocusMinutes}분</Text>
            <Text style={styles.focusStatLabel}>오늘 집중</Text>
          </View>
          <View style={styles.focusStat}>
            <Text style={styles.focusStatNum}>🔥 {focusStreak}</Text>
            <Text style={styles.focusStatLabel}>연속일</Text>
          </View>
        </View>

        {/* Tree Display */}
        <View style={styles.treeArea}>
          {activeSession ? (
            <View style={styles.activeTreeContainer}>
              <Animated.Text style={[styles.treeEmoji, { transform: [{ scale: treeScale }] }]}>
                {currentTreeInfo.emoji}
              </Animated.Text>
              <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {currentTreeInfo.name}이(가) 자라고 있어요...
              </Text>
              <TouchableOpacity style={styles.giveUpBtn} onPress={handleGiveUp}>
                <Text style={styles.giveUpText}>포기하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.idleTreeContainer}>
              <TouchableOpacity onPress={() => setShowTreeModal(true)}>
                <Text style={styles.treeEmojiIdle}>{currentTreeInfo.emoji}</Text>
                <Text style={styles.treeSelectHint}>탭하여 나무 변경</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Timer Presets */}
        {!activeSession && (
          <>
            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, !isPomodoroMode && styles.modeBtnActive]}
                onPress={() => setIsPomodoroMode(false)}
              >
                <Text style={[styles.modeBtnText, !isPomodoroMode && styles.modeBtnTextActive]}>🌲 일반 모드</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, isPomodoroMode && styles.modeBtnActive]}
                onPress={() => setIsPomodoroMode(true)}
              >
                <Text style={[styles.modeBtnText, isPomodoroMode && styles.modeBtnTextActive]}>🍅 포모도로</Text>
              </TouchableOpacity>
            </View>

            {isPomodoroMode ? (
              <>
                <Text style={styles.sectionLabel}>포모도로 프리셋</Text>
                <View style={styles.presetRow}>
                  {POMODORO_PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p.label}
                      style={[styles.presetChip, pomodoroPreset.label === p.label && styles.presetChipActive]}
                      onPress={() => { setPomodoroPreset(p); setSelectedMinutes(p.focus); }}
                    >
                      <Text style={[styles.presetText, pomodoroPreset.label === p.label && styles.presetTextActive]}>
                        {p.label}
                      </Text>
                      <Text style={styles.presetSubtext}>{p.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.pomodoroInfo}>
                  🍅 {pomodoroPreset.focus}분 집중 → {pomodoroPreset.rest}분 휴식 (라운드 {pomodoroRound})
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.sectionLabel}>집중 시간 선택</Text>
                <View style={styles.presetRow}>
                  {TIMER_PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.presetChip, selectedMinutes === p.value && styles.presetChipActive]}
                      onPress={() => setSelectedMinutes(p.value)}
                    >
                      <Text style={[styles.presetText, selectedMinutes === p.value && styles.presetTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity onPress={handleStart}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.startBtn}>
                <Ionicons name="play" size={24} color="#FFF" />
                <Text style={styles.startBtnText}>나무 심기 시작</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Today's Sessions */}
        {todaySessions.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>오늘의 기록</Text>
            <View style={styles.sessionList}>
              {todaySessions.slice(0, 10).map((s) => {
                const tree = TREE_CATALOG.find((t) => t.type === s.treeType);
                return (
                  <View key={s.id} style={styles.sessionItem}>
                    <Text style={styles.sessionEmoji}>{s.completed ? (tree?.emoji || '🌲') : '🥀'}</Text>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>
                        {s.completed ? `${s.targetMinutes}분 집중 완료` : '실패'}
                      </Text>
                      <Text style={styles.sessionTime}>
                        {new Date(s.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {s.completed && (
                      <Text style={styles.sessionCoins}>+{s.coinsEarned} 🪙</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Tree Select Modal */}
        <Modal visible={showTreeModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>나무 선택</Text>
                <TouchableOpacity onPress={() => setShowTreeModal(false)}>
                  <Ionicons name="close" size={24} color="#A0A0C0" />
                </TouchableOpacity>
              </View>
              <View style={styles.treeGrid}>
                {TREE_CATALOG.filter((t) => unlockedTrees.includes(t.type)).map((t) => (
                  <TouchableOpacity
                    key={t.type}
                    style={[styles.treeOption, selectedTree === t.type && styles.treeOptionActive]}
                    onPress={() => { selectTree(t.type); setShowTreeModal(false); }}
                  >
                    <Text style={styles.treeOptionEmoji}>{t.emoji}</Text>
                    <Text style={styles.treeOptionName}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── Forest Tab ───
  function renderForest() {
    const completedSessions = sessionHistory.filter((s) => s.completed);
    const recentTrees = completedSessions.slice(0, 30);

    return (
      <View>
        <View style={styles.forestStats}>
          <View style={styles.forestStatCard}>
            <Text style={styles.forestStatNum}>{totalTreesGrown}</Text>
            <Text style={styles.forestStatLabel}>총 나무</Text>
          </View>
          <View style={styles.forestStatCard}>
            <Text style={styles.forestStatNum}>{totalFocusMinutes}분</Text>
            <Text style={styles.forestStatLabel}>총 집중</Text>
          </View>
          <View style={styles.forestStatCard}>
            <Text style={styles.forestStatNum}>{Math.floor(totalFocusMinutes / 60)}시간</Text>
            <Text style={styles.forestStatLabel}>절약 시간</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>나의 숲 🌳</Text>
        {recentTrees.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏜️</Text>
            <Text style={styles.emptyText}>아직 나무가 없어요</Text>
            <Text style={styles.emptySubtext}>집중 세션을 완료하면 나무가 자라요</Text>
          </View>
        ) : (
          <View style={styles.forestGrid}>
            {recentTrees.map((s) => {
              const tree = TREE_CATALOG.find((t) => t.type === s.treeType);
              return (
                <View key={s.id} style={styles.forestTree}>
                  <Text style={styles.forestTreeEmoji}>{tree?.emoji || '🌲'}</Text>
                  <Text style={styles.forestTreeMin}>{s.targetMinutes}분</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // ─── Shop Tab ───
  function renderShop() {
    return (
      <View>
        <View style={styles.shopHeader}>
          <Text style={styles.shopCoins}>🪙 {coins} 코인</Text>
        </View>
        <Text style={styles.sectionLabel}>나무 상점</Text>
        {TREE_CATALOG.map((tree) => {
          const isUnlocked = unlockedTrees.includes(tree.type);
          const canAfford = coins >= tree.cost;
          return (
            <View key={tree.type} style={styles.shopItem}>
              <Text style={styles.shopEmoji}>{tree.emoji}</Text>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{tree.name}</Text>
                <Text style={styles.shopCost}>
                  {tree.cost === 0 ? '기본' : `${tree.cost} 🪙`}
                </Text>
              </View>
              {isUnlocked ? (
                <View style={styles.shopUnlocked}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.shopBuyBtn, !canAfford && styles.shopBuyBtnDisabled]}
                  onPress={() => {
                    if (unlockTree(tree.type)) {
                      Alert.alert('🎉', `${tree.name}을(를) 해금했어요!`);
                    }
                  }}
                  disabled={!canAfford}
                >
                  <Text style={[styles.shopBuyText, !canAfford && styles.shopBuyTextDisabled]}>구매</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  // ─── Achievements Tab ───
  function renderAchievements() {
    return (
      <View>
        <View style={styles.achieveHeader}>
          <Text style={styles.achieveCount}>{achievements.length}/{ALL_ACHIEVEMENTS.length} 달성</Text>
        </View>
        {ALL_ACHIEVEMENTS.map((ach) => {
          const isUnlocked = achievements.includes(ach.id);
          return (
            <View key={ach.id} style={[styles.achieveCard, isUnlocked && styles.achieveCardUnlocked]}>
              <Text style={[styles.achieveIcon, !isUnlocked && styles.achieveIconLocked]}>
                {isUnlocked ? ach.icon : '🔒'}
              </Text>
              <View style={styles.achieveInfo}>
                <Text style={[styles.achieveTitle, !isUnlocked && styles.achieveTitleLocked]}>
                  {ach.title}
                </Text>
                <Text style={styles.achieveDesc}>{ach.description}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4,
  },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 14, fontWeight: '700', color: '#FBBF24' },

  // Sub tabs
  subTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 4 },
  subTabActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  subTabText: { fontSize: 12, fontWeight: '600', color: '#6B6B8D' },
  subTabTextActive: { color: '#8B5CF6' },

  // Focus stats
  focusStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  focusStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  focusStatNum: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  focusStatLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },

  // Tree area
  treeArea: { alignItems: 'center', marginBottom: 24 },
  activeTreeContainer: { alignItems: 'center', width: '100%' },
  treeEmoji: { fontSize: 100, marginBottom: 16 },
  timerText: { fontSize: 48, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  progressBarBg: {
    width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4, overflow: 'hidden', marginTop: 16,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 14, color: '#10B981', marginTop: 10 },
  giveUpBtn: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  giveUpText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  idleTreeContainer: { alignItems: 'center', paddingVertical: 20 },
  treeEmojiIdle: { fontSize: 80 },
  treeSelectHint: { fontSize: 13, color: '#6B6B8D', marginTop: 8 },

  // Presets
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: '#6B6B8D', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  presetChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  presetChipActive: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.15)' },
  presetText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  presetTextActive: { color: '#10B981' },
  presetSubtext: { fontSize: 10, color: '#6B6B8D', marginTop: 2 },

  // Mode toggle
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  modeBtnTextActive: { color: '#8B5CF6' },
  pomodoroInfo: { fontSize: 13, color: '#F97316', textAlign: 'center', marginBottom: 16 },

  // Start button
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 16, gap: 8,
  },
  startBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  // Session list
  sessionList: { gap: 8 },
  sessionItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 12, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sessionEmoji: { fontSize: 24 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  sessionTime: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },
  sessionCoins: { fontSize: 14, fontWeight: '600', color: '#FBBF24' },

  // Forest
  forestStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  forestStatCard: {
    flex: 1, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
  },
  forestStatNum: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  forestStatLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },
  forestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  forestTree: { alignItems: 'center', width: 56, paddingVertical: 8 },
  forestTreeEmoji: { fontSize: 32 },
  forestTreeMin: { fontSize: 10, color: '#6B6B8D', marginTop: 2 },

  // Empty
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#6B6B8D', marginTop: 6 },

  // Shop
  shopHeader: { alignItems: 'center', marginBottom: 20 },
  shopCoins: { fontSize: 22, fontWeight: '700', color: '#FBBF24' },
  shopItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  shopEmoji: { fontSize: 36 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  shopCost: { fontSize: 13, color: '#6B6B8D', marginTop: 2 },
  shopUnlocked: { padding: 4 },
  shopBuyBtn: {
    backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  shopBuyBtnDisabled: { opacity: 0.4 },
  shopBuyText: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },
  shopBuyTextDisabled: { color: '#6B6B8D' },

  // Achievements
  achieveHeader: { alignItems: 'center', marginBottom: 20 },
  achieveCount: { fontSize: 16, fontWeight: '600', color: '#A0A0C0' },
  achieveCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  achieveCardUnlocked: { borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.08)' },
  achieveIcon: { fontSize: 32 },
  achieveIconLocked: { opacity: 0.5 },
  achieveInfo: { flex: 1 },
  achieveTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  achieveTitleLocked: { color: '#6B6B8D' },
  achieveDesc: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  treeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  treeOption: {
    width: 80, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  treeOptionActive: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.15)' },
  treeOptionEmoji: { fontSize: 32 },
  treeOptionName: { fontSize: 12, color: '#A0A0C0', marginTop: 6 },

  bottomSpacer: { height: 120 },
});
