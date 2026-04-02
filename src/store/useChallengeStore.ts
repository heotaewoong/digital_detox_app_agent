import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'challenge_store';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rewardCoins: number;
  type: 'no_app' | 'focus_time' | 'no_pickup' | 'limit_category' | 'custom';
  targetValue: number;
  currentValue: number;
  completed: boolean;
  date: string;
}

export interface HabitEntry {
  date: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  targetDays: number;
  entries: HabitEntry[];
  createdAt: string;
  isActive: boolean;
}

const CHALLENGE_POOL: Omit<DailyChallenge, 'id' | 'currentValue' | 'completed' | 'date'>[] = [
  { title: '30분 집중 세션', description: '30분 이상 집중 세션을 완료하세요', emoji: '🌲', difficulty: 'easy', rewardCoins: 20, type: 'focus_time', targetValue: 30 },
  { title: '1시간 집중 마라톤', description: '60분 집중 세션을 완료하세요', emoji: '🏃', difficulty: 'medium', rewardCoins: 50, type: 'focus_time', targetValue: 60 },
  { title: 'SNS 금지 챌린지', description: '오늘 하루 SNS 앱을 사용하지 마세요', emoji: '📵', difficulty: 'hard', rewardCoins: 80, type: 'no_app', targetValue: 0 },
  { title: '픽업 10회 이하', description: '오늘 폰 픽업을 10회 이하로 유지하세요', emoji: '📱', difficulty: 'medium', rewardCoins: 40, type: 'no_pickup', targetValue: 10 },
  { title: '게임 0분 챌린지', description: '오늘 하루 게임을 하지 마세요', emoji: '🎮', difficulty: 'medium', rewardCoins: 50, type: 'limit_category', targetValue: 0 },
  { title: '2시간 총 사용', description: '오늘 총 스크린타임을 2시간 이내로', emoji: '⏰', difficulty: 'hard', rewardCoins: 100, type: 'focus_time', targetValue: 120 },
  { title: '아침 집중 세션', description: '오전 10시 전에 집중 세션을 시작하세요', emoji: '🌅', difficulty: 'easy', rewardCoins: 25, type: 'custom', targetValue: 1 },
  { title: '쇼핑앱 금지', description: '오늘 쇼핑 앱을 열지 마세요', emoji: '🛒', difficulty: 'easy', rewardCoins: 30, type: 'no_app', targetValue: 0 },
  { title: '유튜브 30분 제한', description: '유튜브 사용을 30분 이내로 제한하세요', emoji: '📺', difficulty: 'medium', rewardCoins: 45, type: 'limit_category', targetValue: 30 },
  { title: '3회 집중 세션', description: '오늘 3번의 집중 세션을 완료하세요', emoji: '🔥', difficulty: 'hard', rewardCoins: 75, type: 'focus_time', targetValue: 3 },
];

function genId() { return `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

interface ChallengeState {
  todayChallenges: DailyChallenge[];
  completedChallenges: number;
  totalChallengesCompleted: number;
  habits: Habit[];
  // Actions
  generateDailyChallenges: () => void;
  updateChallengeProgress: (id: string, value: number) => void;
  completeChallenge: (id: string) => void;
  addHabit: (name: string, emoji: string, targetDays: number) => void;
  removeHabit: (id: string) => void;
  toggleHabitToday: (id: string) => void;
  getHabitStreak: (id: string) => number;
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  todayChallenges: [],
  completedChallenges: 0,
  totalChallengesCompleted: 0,
  habits: [],

  generateDailyChallenges: () => {
    const today = new Date().toISOString().split('T')[0];
    const existing = get().todayChallenges;
    if (existing.length > 0 && existing[0].date === today) return;

    const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    const challenges: DailyChallenge[] = selected.map((c) => ({
      ...c, id: genId(), currentValue: 0, completed: false, date: today,
    }));
    set({ todayChallenges: challenges, completedChallenges: 0 });
    get().saveData();
  },

  updateChallengeProgress: (id: string, value: number) => {
    set((state) => ({
      todayChallenges: state.todayChallenges.map((c) =>
        c.id === id ? { ...c, currentValue: value } : c
      ),
    }));
  },

  completeChallenge: (id: string) => {
    set((state) => ({
      todayChallenges: state.todayChallenges.map((c) =>
        c.id === id ? { ...c, completed: true } : c
      ),
      completedChallenges: state.completedChallenges + 1,
      totalChallengesCompleted: state.totalChallengesCompleted + 1,
    }));
    get().saveData();
  },

  addHabit: (name: string, emoji: string, targetDays: number) => {
    const habit: Habit = {
      id: genId(), name, emoji, targetDays, entries: [],
      createdAt: new Date().toISOString(), isActive: true,
    };
    set((state) => ({ habits: [...state.habits, habit] }));
    get().saveData();
  },

  removeHabit: (id: string) => {
    set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));
    get().saveData();
  },

  toggleHabitToday: (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id !== id) return h;
        const existingIdx = h.entries.findIndex((e) => e.date === today);
        if (existingIdx >= 0) {
          const newEntries = [...h.entries];
          newEntries[existingIdx] = { ...newEntries[existingIdx], completed: !newEntries[existingIdx].completed };
          return { ...h, entries: newEntries };
        }
        return { ...h, entries: [...h.entries, { date: today, completed: true }] };
      }),
    }));
    get().saveData();
  },

  getHabitStreak: (id: string) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return 0;
    let streak = 0;
    const sorted = [...habit.entries].filter((e) => e.completed).sort((a, b) => b.date.localeCompare(a.date));
    const today = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedDate = expected.toISOString().split('T')[0];
      if (sorted[i]?.date === expectedDate) streak++;
      else break;
    }
    return streak;
  },

  loadData: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          todayChallenges: data.todayChallenges || [],
          totalChallengesCompleted: data.totalChallengesCompleted || 0,
          habits: data.habits || [],
        });
      }
    } catch (e) { console.error('Failed to load challenge data:', e); }
  },

  saveData: async () => {
    try {
      const { todayChallenges, totalChallengesCompleted, habits } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ todayChallenges, totalChallengesCompleted, habits }));
    } catch (e) { console.error('Failed to save challenge data:', e); }
  },
}));
