import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_control';

/**
 * 통합 앱 제어 스토어
 * 스케줄 차단, 앱 사용 제한, 수면 모드, 화이트리스트를 통합 관리합니다.
 * AsyncStorage에 자동 저장됩니다.
 */

export interface ScheduleRule {
  id: string;
  name: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: number[];
  mode: 'block_all' | 'block_selected' | 'focus_only' | 'keyword_only';
  // 선택 차단 시 구체적 대상
  blockedAppNames?: string[];      // 차단할 앱 이름 목록
  blockedKeywordGroupIds?: string[]; // 차단할 키워드 그룹 ID
  blockedDomains?: string[];       // 차단할 도메인
  allowedDomains?: string[];       // 허용할 도메인 (화이트리스트)
  // 알림 설정
  notifyBefore?: number;           // 시작 N분 전 알림
  strictMode?: boolean;            // 엄격 모드 (해제 불가)
}

export interface AppLimit {
  id: string;
  name: string;
  emoji: string;
  dailyLimitMinutes: number;
  usedMinutes: number;
  enabled: boolean;
}

export interface SleepConfig {
  enabled: boolean;
  bedtime: string;
  wakeTime: string;
  windDownMinutes: number;
  blockAllApps: boolean;
  blockNotifications: boolean;
  allowAlarms: boolean;
  allowCalls: boolean;
  showReminder: boolean;
  grayscaleMode: boolean;
}

export interface WhitelistApp {
  id: string;
  name: string;
  emoji: string;
  allowed: boolean;
}

function genId() { return `ac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

const DEFAULT_SCHEDULES: ScheduleRule[] = [
  { id: genId(), name: '🌙 취침 시간', enabled: false, startTime: '23:00', endTime: '07:00', days: [0,1,2,3,4,5,6], mode: 'block_all' },
  { id: genId(), name: '📚 공부 시간', enabled: false, startTime: '09:00', endTime: '18:00', days: [1,2,3,4,5], mode: 'block_selected' },
  { id: genId(), name: '🍽️ 식사 시간', enabled: false, startTime: '12:00', endTime: '13:00', days: [1,2,3,4,5], mode: 'focus_only' },
];

const DEFAULT_APP_LIMITS: AppLimit[] = [
  { id: '1', name: 'YouTube', emoji: '📺', dailyLimitMinutes: 60, usedMinutes: 0, enabled: true },
  { id: '2', name: 'Instagram', emoji: '📸', dailyLimitMinutes: 30, usedMinutes: 0, enabled: true },
  { id: '3', name: 'TikTok', emoji: '🎵', dailyLimitMinutes: 20, usedMinutes: 0, enabled: true },
  { id: '4', name: '게임', emoji: '🎮', dailyLimitMinutes: 45, usedMinutes: 0, enabled: true },
  { id: '5', name: '쿠팡', emoji: '🛒', dailyLimitMinutes: 15, usedMinutes: 0, enabled: false },
  { id: '6', name: 'Twitter/X', emoji: '🐦', dailyLimitMinutes: 20, usedMinutes: 0, enabled: false },
];

const DEFAULT_SLEEP: SleepConfig = {
  enabled: false, bedtime: '23:00', wakeTime: '07:00', windDownMinutes: 30,
  blockAllApps: true, blockNotifications: true, allowAlarms: true, allowCalls: true,
  showReminder: true, grayscaleMode: false,
};

const DEFAULT_WHITELIST: WhitelistApp[] = [
  { id: '1', name: '전화', emoji: '📞', allowed: true },
  { id: '2', name: '메시지', emoji: '💬', allowed: true },
  { id: '3', name: '카카오톡', emoji: '💛', allowed: true },
  { id: '4', name: '지도', emoji: '🗺️', allowed: true },
  { id: '5', name: '카메라', emoji: '📷', allowed: true },
  { id: '6', name: '시계/알람', emoji: '⏰', allowed: true },
  { id: '7', name: '설정', emoji: '⚙️', allowed: true },
  { id: '8', name: 'YouTube', emoji: '📺', allowed: false },
  { id: '9', name: 'Instagram', emoji: '📸', allowed: false },
  { id: '10', name: 'TikTok', emoji: '🎵', allowed: false },
  { id: '11', name: '게임', emoji: '🎮', allowed: false },
  { id: '12', name: '쿠팡', emoji: '🛒', allowed: false },
];

interface AppControlState {
  schedules: ScheduleRule[];
  appLimits: AppLimit[];
  sleepConfig: SleepConfig;
  whitelist: WhitelistApp[];
  whitelistActive: boolean;
  sleepActive: boolean;
  // Schedule actions
  addSchedule: (rule: Omit<ScheduleRule, 'id'>) => void;
  updateSchedule: (id: string, updates: Partial<ScheduleRule>) => void;
  removeSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;
  // App limit actions
  updateAppLimit: (id: string, updates: Partial<AppLimit>) => void;
  toggleAppLimit: (id: string) => void;
  addAppUsage: (id: string, minutes: number) => void;
  resetDailyUsage: () => void;
  // Sleep actions
  updateSleep: (updates: Partial<SleepConfig>) => void;
  toggleSleepActive: () => void;
  // Whitelist actions
  toggleWhitelistApp: (id: string) => void;
  toggleWhitelistMode: () => void;
  // Check if currently blocked
  isCurrentlyScheduleBlocked: () => ScheduleRule | null;
  isAppOverLimit: (appName: string) => boolean;
  // Persistence
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
}

export const useAppControlStore = create<AppControlState>((set, get) => ({
  schedules: DEFAULT_SCHEDULES,
  appLimits: DEFAULT_APP_LIMITS,
  sleepConfig: DEFAULT_SLEEP,
  whitelist: DEFAULT_WHITELIST,
  whitelistActive: false,
  sleepActive: false,

  addSchedule: (rule) => {
    set((s) => ({ schedules: [...s.schedules, { ...rule, id: genId() }] }));
    get().saveData();
  },
  updateSchedule: (id, updates) => {
    set((s) => ({ schedules: s.schedules.map((r) => r.id === id ? { ...r, ...updates } : r) }));
    get().saveData();
  },
  removeSchedule: (id) => {
    set((s) => ({ schedules: s.schedules.filter((r) => r.id !== id) }));
    get().saveData();
  },
  toggleSchedule: (id) => {
    set((s) => ({ schedules: s.schedules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r) }));
    get().saveData();
  },

  updateAppLimit: (id, updates) => {
    set((s) => ({ appLimits: s.appLimits.map((l) => l.id === id ? { ...l, ...updates } : l) }));
    get().saveData();
  },
  toggleAppLimit: (id) => {
    set((s) => ({ appLimits: s.appLimits.map((l) => l.id === id ? { ...l, enabled: !l.enabled } : l) }));
    get().saveData();
  },
  addAppUsage: (id, minutes) => {
    set((s) => ({ appLimits: s.appLimits.map((l) => l.id === id ? { ...l, usedMinutes: l.usedMinutes + minutes } : l) }));
  },
  resetDailyUsage: () => {
    set((s) => ({ appLimits: s.appLimits.map((l) => ({ ...l, usedMinutes: 0 })) }));
    get().saveData();
  },

  updateSleep: (updates) => {
    set((s) => ({ sleepConfig: { ...s.sleepConfig, ...updates } }));
    get().saveData();
  },
  toggleSleepActive: () => {
    set((s) => ({ sleepActive: !s.sleepActive }));
    get().saveData();
  },

  toggleWhitelistApp: (id) => {
    set((s) => ({ whitelist: s.whitelist.map((a) => a.id === id ? { ...a, allowed: !a.allowed } : a) }));
    get().saveData();
  },
  toggleWhitelistMode: () => {
    set((s) => ({ whitelistActive: !s.whitelistActive }));
    get().saveData();
  },

  isCurrentlyScheduleBlocked: () => {
    const { schedules } = get();
    const now = new Date();
    const day = now.getDay();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return schedules.find((s) => s.enabled && s.days.includes(day) && isTimeInRange(time, s.startTime, s.endTime)) || null;
  },

  isAppOverLimit: (appName: string) => {
    const limit = get().appLimits.find((l) => l.enabled && l.name.toLowerCase() === appName.toLowerCase());
    return limit ? limit.usedMinutes >= limit.dailyLimitMinutes : false;
  },

  loadData: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          schedules: data.schedules || DEFAULT_SCHEDULES,
          appLimits: data.appLimits || DEFAULT_APP_LIMITS,
          sleepConfig: data.sleepConfig || DEFAULT_SLEEP,
          whitelist: data.whitelist || DEFAULT_WHITELIST,
          whitelistActive: data.whitelistActive || false,
          sleepActive: data.sleepActive || false,
        });
      }
    } catch (e) { console.error('Failed to load app control data:', e); }
  },

  saveData: async () => {
    try {
      const { schedules, appLimits, sleepConfig, whitelist, whitelistActive, sleepActive } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        schedules, appLimits, sleepConfig, whitelist, whitelistActive, sleepActive,
      }));
      // 크롬 확장 프로그램과 스케줄 동기화
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('app_control', JSON.stringify({ schedules, appLimits }));
      }
    } catch (e) { console.error('Failed to save app control data:', e); }
  },
}));

function isTimeInRange(current: string, start: string, end: string): boolean {
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}
