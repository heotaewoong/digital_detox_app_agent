import { create } from 'zustand';
import { DetectionEvent, MonitoringState, ContentCategory } from '@/types';

const MAX_LOG_SIZE = 100;

interface MonitorState {
  monitoring: MonitoringState;
  detectionLog: DetectionEvent[];
  // Actions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  toggleSimulationMode: () => void;
  addDetection: (event: DetectionEvent) => void;
  clearDetections: () => void;
  getDetectionsToday: () => DetectionEvent[];
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  monitoring: {
    isActive: false,
    isSimulationMode: true,
    totalDetections: 0,
    todayDetections: 0,
    blockedCount: 0,
    lastDetection: undefined,
  },

  detectionLog: [],

  startMonitoring: () => {
    set((state) => ({
      monitoring: {
        ...state.monitoring,
        isActive: true,
      },
    }));
  },

  stopMonitoring: () => {
    set((state) => ({
      monitoring: {
        ...state.monitoring,
        isActive: false,
      },
    }));
  },

  toggleSimulationMode: () => {
    set((state) => ({
      monitoring: {
        ...state.monitoring,
        isSimulationMode: !state.monitoring.isSimulationMode,
      },
    }));
  },

  addDetection: (event: DetectionEvent) => {
    set((state) => {
      const updatedLog = [event, ...state.detectionLog].slice(0, MAX_LOG_SIZE);
      const isBlocked = event.action === 'blocked';

      return {
        detectionLog: updatedLog,
        monitoring: {
          ...state.monitoring,
          totalDetections: state.monitoring.totalDetections + 1,
          todayDetections: state.monitoring.todayDetections + 1,
          blockedCount: state.monitoring.blockedCount + (isBlocked ? 1 : 0),
          lastDetection: event,
        },
      };
    });
  },

  clearDetections: () => {
    set((state) => ({
      detectionLog: [],
      monitoring: {
        ...state.monitoring,
        totalDetections: 0,
        todayDetections: 0,
        blockedCount: 0,
        lastDetection: undefined,
      },
    }));
  },

  getDetectionsToday: () => {
    const { detectionLog } = get();
    const todayStr = new Date().toISOString().split('T')[0];

    return detectionLog.filter((event) => event.timestamp.startsWith(todayStr));
  },
}));
