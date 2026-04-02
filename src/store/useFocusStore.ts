import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusSession, TreeType, TreeInfo, Achievement } from '@/types';

const STORAGE_KEY = 'focus_store';

function generateId(): string {
  return `fs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const TREE_CATALOG: TreeInfo[] = [
  { type: 'pine', name: '소나무', emoji: '🌲', cost: 0, unlocked: true },
  { type: 'oak', name: '참나무', emoji: '🌳', cost: 100, unlocked: false },
  { type: 'cherry', name: '벚나무', emoji: '🌸', cost: 200, unlocked: false },
  { type: 'bamboo', name: '대나무', emoji: '🎋', cost: 300, unlocked: false },
  { type: 'maple', name: '단풍나무', emoji: '🍁', cost: 400, unlocked: false },
  { type: 'ginkgo', name: '은행나무', emoji: '💛', cost: 500, unlocked: false },
  { type: 'palm', name: '야자수', emoji: '🌴', cost: 600, unlocked: false },
  { type: 'cactus', name: '선인장', emoji: '🌵', cost: 800, unlocked: false },
];

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_tree', title: '첫 나무', description: '첫 번째 집중 세션 완료', icon: '🌱',
    condition: { type: 'sessions', target: 1 } },
  { id: 'forest_5', title: '작은 숲', description: '5개의 나무 심기', icon: '🌿',
    condition: { type: 'trees', target: 5 } },
  { id: 'forest_25', title: '울창한 숲', description: '25개의 나무 심기', icon: '🏕️',
    condition: { type: 'trees', target: 25 } },
  { id: 'streak_3', title: '3일 연속', description: '3일 연속 집중 달성', icon: '🔥',
    condition: { type: 'streak', target: 3 } },
  { id: 'streak_7', title: '일주일 전사', description: '7일 연속 집중 달성', icon: '⚡',
    condition: { type: 'streak', target: 7 } },
  { id: 'streak_30', title: '한 달 마스터', description: '30일 연속 집중 달성', icon: '👑',
    condition: { type: 'streak', target: 30 } },
  { id: 'blocked_10', title: '수호자', description: '10건 차단 달성', icon: '🛡️',
    condition: { type: 'blocked', target: 10 } },
  { id: 'blocked_50', title: '철벽 방어', description: '50건 차단 달성', icon: '🏰',
    condition: { type: 'blocked', target: 50 } },
  { id: 'saved_60', title: '시간 절약가', description: '60분 절약 달성', icon: '⏰',
    condition: { type: 'saved_time', target: 60 } },
  { id: 'saved_300', title: '시간 부자', description: '300분 절약 달성', icon: '💎',
    condition: { type: 'saved_time', target: 300 } },
];

interface FocusState {
  // Focus session
  activeSession: FocusSession | null;
  sessionHistory: FocusSession[];
  selectedTree: TreeType;
  // Rewards
  coins: number;
  totalTreesGrown: number;
  unlockedTrees: TreeType[];
  achievements: string[]; // achievement ids
  focusStreak: number;
  // Stats
  todayFocusMinutes: number;
  weeklyFocusMinutes: number;
  totalFocusMinutes: number;
  // Actions
  startSession: (targetMinutes: number) => void;
  completeSession: () => void;
  failSession: () => void;
  selectTree: (tree: TreeType) => void;
  unlockTree: (tree: TreeType) => boolean;
  checkAchievements: () => string[];
  getTodaySessions: () => FocusSession[];
  loadFocusData: () => Promise<void>;
  saveFocusData: () => Promise<void>;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  activeSession: null,
  sessionHistory: [],
  selectedTree: 'pine',
  coins: 0,
  totalTreesGrown: 0,
  unlockedTrees: ['pine'],
  achievements: [],
  focusStreak: 0,
  todayFocusMinutes: 0,
  weeklyFocusMinutes: 0,
  totalFocusMinutes: 0,

  startSession: (targetMinutes: number) => {
    const session: FocusSession = {
      id: generateId(),
      startTime: new Date().toISOString(),
      durationMinutes: 0,
      targetMinutes,
      completed: false,
      treeType: get().selectedTree,
      coinsEarned: 0,
    };
    set({ activeSession: session });
  },

  completeSession: () => {
    const { activeSession, sessionHistory, coins, totalTreesGrown, todayFocusMinutes, weeklyFocusMinutes, totalFocusMinutes } = get();
    if (!activeSession) return;

    const earnedCoins = Math.floor(activeSession.targetMinutes * 2);
    const completed: FocusSession = {
      ...activeSession,
      endTime: new Date().toISOString(),
      durationMinutes: activeSession.targetMinutes,
      completed: true,
      coinsEarned: earnedCoins,
    };

    set({
      activeSession: null,
      sessionHistory: [completed, ...sessionHistory].slice(0, 200),
      coins: coins + earnedCoins,
      totalTreesGrown: totalTreesGrown + 1,
      todayFocusMinutes: todayFocusMinutes + activeSession.targetMinutes,
      weeklyFocusMinutes: weeklyFocusMinutes + activeSession.targetMinutes,
      totalFocusMinutes: totalFocusMinutes + activeSession.targetMinutes,
    });

    get().checkAchievements();
    get().saveFocusData();
  },

  failSession: () => {
    const { activeSession, sessionHistory } = get();
    if (!activeSession) return;

    const failed: FocusSession = {
      ...activeSession,
      endTime: new Date().toISOString(),
      durationMinutes: 0,
      completed: false,
      coinsEarned: 0,
    };

    set({
      activeSession: null,
      sessionHistory: [failed, ...sessionHistory].slice(0, 200),
    });
    get().saveFocusData();
  },

  selectTree: (tree: TreeType) => {
    const { unlockedTrees } = get();
    if (unlockedTrees.includes(tree)) {
      set({ selectedTree: tree });
    }
  },

  unlockTree: (tree: TreeType) => {
    const { coins, unlockedTrees } = get();
    const treeInfo = TREE_CATALOG.find((t) => t.type === tree);
    if (!treeInfo || unlockedTrees.includes(tree) || coins < treeInfo.cost) return false;

    set({
      coins: coins - treeInfo.cost,
      unlockedTrees: [...unlockedTrees, tree],
    });
    get().saveFocusData();
    return true;
  },

  checkAchievements: () => {
    const state = get();
    const newlyUnlocked: string[] = [];

    for (const ach of ALL_ACHIEVEMENTS) {
      if (state.achievements.includes(ach.id)) continue;

      let met = false;
      switch (ach.condition.type) {
        case 'sessions':
          met = state.sessionHistory.filter((s) => s.completed).length >= ach.condition.target;
          break;
        case 'trees':
          met = state.totalTreesGrown >= ach.condition.target;
          break;
        case 'streak':
          met = state.focusStreak >= ach.condition.target;
          break;
        case 'blocked':
          met = false; // checked externally
          break;
        case 'saved_time':
          met = state.totalFocusMinutes >= ach.condition.target;
          break;
      }

      if (met) {
        newlyUnlocked.push(ach.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      set({ achievements: [...state.achievements, ...newlyUnlocked] });
      get().saveFocusData();
    }
    return newlyUnlocked;
  },

  getTodaySessions: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().sessionHistory.filter((s) => s.startTime.startsWith(today));
  },

  loadFocusData: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          sessionHistory: data.sessionHistory || [],
          selectedTree: data.selectedTree || 'pine',
          coins: data.coins || 0,
          totalTreesGrown: data.totalTreesGrown || 0,
          unlockedTrees: data.unlockedTrees || ['pine'],
          achievements: data.achievements || [],
          focusStreak: data.focusStreak || 0,
          todayFocusMinutes: data.todayFocusMinutes || 0,
          weeklyFocusMinutes: data.weeklyFocusMinutes || 0,
          totalFocusMinutes: data.totalFocusMinutes || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load focus data:', e);
    }
  },

  saveFocusData: async () => {
    try {
      const state = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionHistory: state.sessionHistory,
        selectedTree: state.selectedTree,
        coins: state.coins,
        totalTreesGrown: state.totalTreesGrown,
        unlockedTrees: state.unlockedTrees,
        achievements: state.achievements,
        focusStreak: state.focusStreak,
        todayFocusMinutes: state.todayFocusMinutes,
        weeklyFocusMinutes: state.weeklyFocusMinutes,
        totalFocusMinutes: state.totalFocusMinutes,
      }));
    } catch (e) {
      console.error('Failed to save focus data:', e);
    }
  },
}));
