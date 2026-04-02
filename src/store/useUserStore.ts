import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Goal, KeywordGroup, GoalCategory, BlockedApp, ContentCategory, RiskLevel } from '@/types';
import { DEFAULT_KEYWORD_GROUPS } from '@/utils/constants';
import { ChromeExtensionBridge } from '@/services/ChromeExtensionBridge';

const STORAGE_KEY = 'user_profile';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  // Actions
  initProfile: (name: string, dreams: string[]) => void;
  addGoal: (title: string, description: string, category: GoalCategory) => void;
  removeGoal: (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  updateKeywords: (groups: KeywordGroup[]) => void;
  toggleKeywordGroup: (groupId: string) => void;
  addCustomKeywordGroup: (name: string, keywords: string[]) => void;
  addKeywordToGroup: (groupId: string, keyword: string) => void;
  removeKeywordFromGroup: (groupId: string, keyword: string) => void;
  removeKeywordGroup: (groupId: string) => void;
  updateKeywordGroupRisk: (groupId: string, riskLevel: RiskLevel) => void;
  // Blocked Apps
  addBlockedApp: (app: Omit<BlockedApp, 'id'>) => void;
  removeBlockedApp: (id: string) => void;
  toggleBlockedApp: (id: string) => void;
  updateBlockedApp: (id: string, updates: Partial<BlockedApp>) => void;
  // Profile
  completeOnboarding: () => void;
  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: true,

  initProfile: (name: string, dreams: string[]) => {
    const profile: UserProfile = {
      id: generateId(),
      name,
      dreams,
      goals: [],
      blockedKeywords: DEFAULT_KEYWORD_GROUPS.map((g) => ({ ...g })),
      blockedApps: [],
      createdAt: new Date().toISOString(),
      onboardingCompleted: false,
    };
    set({ profile });
    get().saveProfile();
  },

  addGoal: (title: string, description: string, category: GoalCategory) => {
    const { profile } = get();
    if (!profile) return;

    const newGoal: Goal = {
      id: generateId(),
      title,
      description,
      category,
      progress: 0,
    };

    set({
      profile: {
        ...profile,
        goals: [...profile.goals, newGoal],
      },
    });
    get().saveProfile();
  },

  removeGoal: (id: string) => {
    const { profile } = get();
    if (!profile) return;

    set({
      profile: {
        ...profile,
        goals: profile.goals.filter((g) => g.id !== id),
      },
    });
    get().saveProfile();
  },

  updateGoalProgress: (id: string, progress: number) => {
    const { profile } = get();
    if (!profile) return;

    const clampedProgress = Math.max(0, Math.min(100, progress));

    set({
      profile: {
        ...profile,
        goals: profile.goals.map((g) =>
          g.id === id ? { ...g, progress: clampedProgress } : g,
        ),
      },
    });
    get().saveProfile();
  },

  updateKeywords: (groups: KeywordGroup[]) => {
    const { profile } = get();
    if (!profile) return;

    set({
      profile: {
        ...profile,
        blockedKeywords: groups,
      },
    });
    get().saveProfile();
  },

  toggleKeywordGroup: (groupId: string) => {
    const { profile } = get();
    if (!profile) return;

    set({
      profile: {
        ...profile,
        blockedKeywords: profile.blockedKeywords.map((g) =>
          g.id === groupId ? { ...g, enabled: !g.enabled } : g,
        ),
      },
    });
    get().saveProfile();
  },

  addCustomKeywordGroup: (name: string, keywords: string[]) => {
    const { profile } = get();
    if (!profile) return;

    const newGroup: KeywordGroup = {
      id: generateId(),
      name,
      category: 'custom',
      keywords,
      enabled: true,
      riskLevel: 'medium',
    };

    set({
      profile: {
        ...profile,
        blockedKeywords: [...profile.blockedKeywords, newGroup],
      },
    });
    get().saveProfile();
  },

  addKeywordToGroup: (groupId: string, keyword: string) => {
    const { profile } = get();
    if (!profile) return;
    set({
      profile: {
        ...profile,
        blockedKeywords: profile.blockedKeywords.map((g) =>
          g.id === groupId && !g.keywords.includes(keyword)
            ? { ...g, keywords: [...g.keywords, keyword] }
            : g,
        ),
      },
    });
    get().saveProfile();
  },

  removeKeywordFromGroup: (groupId: string, keyword: string) => {
    const { profile } = get();
    if (!profile) return;
    set({
      profile: {
        ...profile,
        blockedKeywords: profile.blockedKeywords.map((g) =>
          g.id === groupId
            ? { ...g, keywords: g.keywords.filter((k) => k !== keyword) }
            : g,
        ),
      },
    });
    get().saveProfile();
  },

  removeKeywordGroup: (groupId: string) => {
    const { profile } = get();
    if (!profile) return;
    set({
      profile: {
        ...profile,
        blockedKeywords: profile.blockedKeywords.filter((g) => g.id !== groupId),
      },
    });
    get().saveProfile();
  },

  updateKeywordGroupRisk: (groupId: string, riskLevel: RiskLevel) => {
    const { profile } = get();
    if (!profile) return;
    set({
      profile: {
        ...profile,
        blockedKeywords: profile.blockedKeywords.map((g) =>
          g.id === groupId ? { ...g, riskLevel } : g,
        ),
      },
    });
    get().saveProfile();
  },

  // Blocked Apps
  addBlockedApp: (app: Omit<BlockedApp, 'id'>) => {
    const { profile } = get();
    if (!profile) return;
    const newApp: BlockedApp = { ...app, id: generateId() };
    set({
      profile: {
        ...profile,
        blockedApps: [...(profile.blockedApps || []), newApp],
      },
    });
    get().saveProfile();
  },

  removeBlockedApp: (id: string) => {
    const { profile } = get();
    if (!profile) return;
    set({
      profile: {
        ...profile,
        blockedApps: (profile.blockedApps || []).filter((a) => a.id !== id),
      },
    });
    get().saveProfile();
  },

  toggleBlockedApp: (id: string) => {
    const { profile } = get();
    if (!profile) return;
    set({
      profile: {
        ...profile,
        blockedApps: (profile.blockedApps || []).map((a) =>
          a.id === id ? { ...a, isBlocked: !a.isBlocked } : a,
        ),
      },
    });
    get().saveProfile();
  },

  updateBlockedApp: (id: string, updates: Partial<BlockedApp>) => {
    const { profile } = get();
    if (!profile) return;
    set({
      profile: {
        ...profile,
        blockedApps: (profile.blockedApps || []).map((a) =>
          a.id === id ? { ...a, ...updates } : a,
        ),
      },
    });
    get().saveProfile();
  },

  completeOnboarding: () => {
    const { profile } = get();
    if (!profile) return;

    set({
      profile: {
        ...profile,
        onboardingCompleted: true,
      },
    });
    get().saveProfile();
  },

  loadProfile: async () => {
    try {
      set({ isLoading: true });
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const profile = JSON.parse(raw) as UserProfile;
        // Ensure blockedApps exists for older profiles
        if (!profile.blockedApps) {
          profile.blockedApps = [];
        }
        set({ profile, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      set({ isLoading: false });
    }
  },

  saveProfile: async () => {
    try {
      const { profile } = get();
      if (profile) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        // 크롬 확장 프로그램과 키워드 동기화
        ChromeExtensionBridge.syncKeywordsToExtension(profile.blockedKeywords);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  },
}));
