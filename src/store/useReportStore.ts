import { create } from 'zustand';
import { DailyReport, UsageRecord } from '@/types';
import { generateSimulationData, generateDailyReport } from '@/utils/analytics';

interface ReportState {
  currentReport: DailyReport | null;
  weeklyReports: DailyReport[];
  streak: number;
  // Actions
  generateTodayReport: () => void;
  loadSimulationReport: () => void;
  incrementStreak: () => void;
  resetStreak: () => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  currentReport: null,
  weeklyReports: [],
  streak: 7,

  generateTodayReport: () => {
    const { streak } = get();
    const { usageRecords, detections } = generateSimulationData();
    const report = generateDailyReport(usageRecords, detections, streak);

    set((state) => ({
      currentReport: report,
      weeklyReports: [report, ...state.weeklyReports].slice(0, 7),
    }));
  },

  loadSimulationReport: () => {
    const { streak } = get();
    const { usageRecords, detections } = generateSimulationData();
    const report = generateDailyReport(usageRecords, detections, streak);

    set({ currentReport: report });
  },

  incrementStreak: () => {
    set((state) => ({ streak: state.streak + 1 }));
  },

  resetStreak: () => {
    set({ streak: 0 });
  },
}));
