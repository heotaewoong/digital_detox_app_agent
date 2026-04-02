import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '@/types';

const STORAGE_KEY = 'app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  monitoringEnabled: true,
  notificationsEnabled: true,
  cooldownSeconds: 30,
  blockStrength: 'moderate',
  dailyReportTime: '22:00',
  theme: 'dark',
  language: 'ko',
};

interface SettingsState {
  settings: AppSettings;
  // Actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },

  updateSettings: (partial: Partial<AppSettings>) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...partial,
      },
    }));
    get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<AppSettings>;
        set({
          settings: {
            ...DEFAULT_SETTINGS,
            ...stored,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const { settings } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  resetSettings: () => {
    set({ settings: { ...DEFAULT_SETTINGS } });
    get().saveSettings();
  },
}));
