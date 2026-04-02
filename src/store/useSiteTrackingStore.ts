import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SiteVisit, SiteStats, BlockedSite, BypassRule, FloatingWidgetConfig,
  ContentClassLabel,
} from '@/types';
import { AIContentClassifier } from '@/services/ai/ContentClassifier';

const STORAGE_KEY = 'site_tracking';

function generateId() {
  return `sv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// 기본 차단 사이트 목록
const DEFAULT_BLOCKED_SITES: BlockedSite[] = [
  { id: 'bs_1', url: 'pornhub.com', reason: '성인 사이트', category: 'adult', enabled: true, addedAt: new Date().toISOString() },
  { id: 'bs_2', url: 'xvideos.com', reason: '성인 사이트', category: 'adult', enabled: true, addedAt: new Date().toISOString() },
  { id: 'bs_3', url: 'bet365.com', reason: '도박 사이트', category: 'gambling', enabled: true, addedAt: new Date().toISOString() },
];

// 카카오톡 우회 방지 규칙
const DEFAULT_BYPASS_RULES: BypassRule[] = [
  { id: 'bp_1', appName: '카카오톡', packageName: 'com.kakao.talk',
    bypassType: 'in_app_browser', enabled: true,
    description: '카카오톡 내 브라우저로 차단 사이트 접속 방지' },
  { id: 'bp_2', appName: '카카오톡', packageName: 'com.kakao.talk',
    bypassType: 'link_redirect', enabled: true,
    description: '카카오톡 링크를 통한 차단 우회 방지' },
  { id: 'bp_3', appName: '네이버', packageName: 'com.nhn.android.search',
    bypassType: 'in_app_browser', enabled: false,
    description: '네이버 앱 내 브라우저 차단 우회 방지' },
  { id: 'bp_4', appName: '인스타그램', packageName: 'com.instagram.android',
    bypassType: 'webview', enabled: false,
    description: '인스타그램 내장 브라우저 차단 우회 방지' },
];

interface SiteTrackingState {
  // Site visits
  visits: SiteVisit[];
  todayVisits: SiteVisit[];
  // Blocked sites
  blockedSites: BlockedSite[];
  // Bypass rules
  bypassRules: BypassRule[];
  // Floating widget
  widgetConfig: FloatingWidgetConfig;
  // Stats
  todayScreenMinutes: number;
  todayPickups: number;
  todayProductiveMinutes: number;
  todayDistractingMinutes: number;
  // Actions
  addVisit: (url: string, title: string, appSource: string) => SiteVisit;
  endVisit: (visitId: string) => void;
  addBlockedSite: (url: string, reason: string, category: string) => void;
  removeBlockedSite: (id: string) => void;
  toggleBlockedSite: (id: string) => void;
  toggleBypassRule: (id: string) => void;
  updateWidgetConfig: (config: Partial<FloatingWidgetConfig>) => void;
  checkURL: (url: string, appSource: string) => { blocked: boolean; reason: string; isKakaoBypass: boolean };
  getSiteStats: () => SiteStats[];
  getCategoryStats: () => ReturnType<typeof AIContentClassifier.generateCategoryStats>;
  getProductiveRatio: () => number;
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  // Simulation
  generateSimulationData: () => void;
}

export const useSiteTrackingStore = create<SiteTrackingState>((set, get) => ({
  visits: [],
  todayVisits: [],
  blockedSites: [...DEFAULT_BLOCKED_SITES],
  bypassRules: [...DEFAULT_BYPASS_RULES],
  widgetConfig: {
    enabled: true,
    position: 'top-right',
    showScreenTime: true,
    showPickupCount: true,
    showBlockedCount: false,
    opacity: 0.8,
    colorMode: 'auto',
    limitWarningMinutes: 120,
  },
  todayScreenMinutes: 0,
  todayPickups: 0,
  todayProductiveMinutes: 0,
  todayDistractingMinutes: 0,

  addVisit: (url: string, title: string, appSource: string) => {
    const classification = AIContentClassifier.classify(url, title);
    const domain = extractDomain(url);
    const visit: SiteVisit = {
      id: generateId(),
      url,
      domain,
      title,
      classLabel: classification.label,
      confidence: classification.confidence,
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      appSource,
      isBlocked: false,
    };

    set((state) => ({
      visits: [visit, ...state.visits].slice(0, 500),
      todayVisits: [visit, ...state.todayVisits],
      todayPickups: state.todayPickups + 1,
    }));

    return visit;
  },

  endVisit: (visitId: string) => {
    set((state) => {
      const updatedVisits = state.visits.map((v) => {
        if (v.id === visitId && !v.endTime) {
          const duration = Math.floor((Date.now() - new Date(v.startTime).getTime()) / 1000);
          return { ...v, endTime: new Date().toISOString(), durationSeconds: duration };
        }
        return v;
      });
      return { visits: updatedVisits };
    });
    get().saveData();
  },

  addBlockedSite: (url: string, reason: string, category: string) => {
    const site: BlockedSite = {
      id: generateId(),
      url: url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''),
      reason,
      category: category as any,
      enabled: true,
      addedAt: new Date().toISOString(),
    };
    set((state) => ({ blockedSites: [...state.blockedSites, site] }));
    get().saveData();
  },

  removeBlockedSite: (id: string) => {
    set((state) => ({ blockedSites: state.blockedSites.filter((s) => s.id !== id) }));
    get().saveData();
  },

  toggleBlockedSite: (id: string) => {
    set((state) => ({
      blockedSites: state.blockedSites.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s),
    }));
    get().saveData();
  },

  toggleBypassRule: (id: string) => {
    set((state) => ({
      bypassRules: state.bypassRules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r),
    }));
    get().saveData();
  },

  updateWidgetConfig: (config: Partial<FloatingWidgetConfig>) => {
    set((state) => ({ widgetConfig: { ...state.widgetConfig, ...config } }));
    get().saveData();
  },

  checkURL: (url: string, appSource: string) => {
    const { blockedSites, bypassRules } = get();
    const enabledSites = blockedSites.filter((s) => s.enabled).map((s) => s.url);
    const blockResult = AIContentClassifier.shouldBlockURL(url, [], enabledSites);
    const isKakaoBypass = bypassRules.some((r) => r.enabled && r.appName === appSource)
      && AIContentClassifier.isKakaoBypass(url, appSource);

    return {
      blocked: blockResult.blocked || isKakaoBypass,
      reason: isKakaoBypass ? `${appSource} 우회 접속 감지` : blockResult.reason,
      isKakaoBypass,
    };
  },

  getSiteStats: () => {
    const { todayVisits } = get();
    const statsMap = new Map<string, SiteStats>();

    for (const visit of todayVisits) {
      const existing = statsMap.get(visit.domain);
      if (existing) {
        existing.totalMinutes += visit.durationSeconds / 60;
        existing.visitCount += 1;
        existing.lastVisit = visit.startTime;
      } else {
        statsMap.set(visit.domain, {
          domain: visit.domain,
          totalMinutes: visit.durationSeconds / 60,
          visitCount: 1,
          classLabel: visit.classLabel,
          lastVisit: visit.startTime,
        });
      }
    }

    return Array.from(statsMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  },

  getCategoryStats: () => {
    return AIContentClassifier.generateCategoryStats(get().todayVisits);
  },

  getProductiveRatio: () => {
    const stats = get().getCategoryStats();
    const total = stats.reduce((sum, s) => sum + s.totalMinutes, 0);
    if (total === 0) return 0;
    const productive = stats.filter((s) => s.isProductive).reduce((sum, s) => sum + s.totalMinutes, 0);
    return Math.round((productive / total) * 100);
  },

  generateSimulationData: () => {
    const simVisits: SiteVisit[] = SIMULATION_VISITS.map((sv, i) => ({
      id: `sim_${i}_${Date.now()}`,
      ...sv,
      startTime: new Date(Date.now() - Math.random() * 8 * 3600000).toISOString(),
      durationSeconds: Math.floor(Math.random() * 1800 + 60),
      isBlocked: false,
    }));

    const totalMinutes = simVisits.reduce((s, v) => s + v.durationSeconds / 60, 0);
    const productive = simVisits
      .filter((v) => ['study', 'work', 'health', 'news'].includes(v.classLabel))
      .reduce((s, v) => s + v.durationSeconds / 60, 0);

    set({
      todayVisits: simVisits,
      visits: simVisits,
      todayScreenMinutes: Math.round(totalMinutes),
      todayPickups: Math.floor(Math.random() * 30 + 10),
      todayProductiveMinutes: Math.round(productive),
      todayDistractingMinutes: Math.round(totalMinutes - productive),
    });
  },

  loadData: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          blockedSites: data.blockedSites || DEFAULT_BLOCKED_SITES,
          bypassRules: data.bypassRules || DEFAULT_BYPASS_RULES,
          widgetConfig: { ...get().widgetConfig, ...(data.widgetConfig || {}) },
        });
      }
    } catch (e) {
      console.error('Failed to load site tracking data:', e);
    }
  },

  saveData: async () => {
    try {
      const { blockedSites, bypassRules, widgetConfig } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ blockedSites, bypassRules, widgetConfig }));
    } catch (e) {
      console.error('Failed to save site tracking data:', e);
    }
  },
}));

function extractDomain(url: string): string {
  try {
    return url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  } catch {
    return url;
  }
}

// 시뮬레이션 데이터
const SIMULATION_VISITS: Omit<SiteVisit, 'id' | 'startTime' | 'durationSeconds' | 'isBlocked'>[] = [
  { url: 'https://youtube.com/watch?v=abc', domain: 'youtube.com', title: 'React Native 강의 #5 - 네비게이션 완벽 정리', classLabel: 'study', confidence: 0.85, appSource: 'Chrome' },
  { url: 'https://youtube.com/watch?v=def', domain: 'youtube.com', title: '롤 시즌14 패치노트 분석 - 새로운 챔피언 공략', classLabel: 'gaming', confidence: 0.85, appSource: 'Chrome' },
  { url: 'https://youtube.com/watch?v=ghi', domain: 'youtube.com', title: '일상 브이로그 - 카페에서 공부하는 하루', classLabel: 'entertainment', confidence: 0.8, appSource: 'YouTube' },
  { url: 'https://youtube.com/watch?v=jkl', domain: 'youtube.com', title: 'Python 알고리즘 코딩테스트 준비 - 백준 풀이', classLabel: 'study', confidence: 0.85, appSource: 'YouTube' },
  { url: 'https://youtube.com/watch?v=mno', domain: 'youtube.com', title: '오버워치2 시즌8 경쟁전 실황 플레이', classLabel: 'gaming', confidence: 0.85, appSource: 'YouTube' },
  { url: 'https://instagram.com/feed', domain: 'instagram.com', title: 'Instagram 피드', classLabel: 'social', confidence: 0.9, appSource: 'Instagram' },
  { url: 'https://github.com/project', domain: 'github.com', title: 'GitHub - 프로젝트 코드 리뷰', classLabel: 'study', confidence: 0.9, appSource: 'Chrome' },
  { url: 'https://coupang.com/products', domain: 'coupang.com', title: '쿠팡 - 오늘의 특가', classLabel: 'shopping', confidence: 0.9, appSource: 'Chrome' },
  { url: 'https://news.naver.com/main', domain: 'news.naver.com', title: '네이버 뉴스 - 오늘의 주요 뉴스', classLabel: 'news', confidence: 0.85, appSource: '카카오톡' },
  { url: 'https://stackoverflow.com/questions', domain: 'stackoverflow.com', title: 'Stack Overflow - TypeScript 질문', classLabel: 'study', confidence: 0.9, appSource: 'Chrome' },
  { url: 'https://op.gg/summoners', domain: 'op.gg', title: 'OP.GG - 전적 검색', classLabel: 'gaming', confidence: 0.9, appSource: 'Chrome' },
  { url: 'https://tiktok.com/@user', domain: 'tiktok.com', title: 'TikTok - 추천 피드', classLabel: 'social', confidence: 0.9, appSource: 'TikTok' },
  { url: 'https://notion.so/workspace', domain: 'notion.so', title: 'Notion - 프로젝트 관리', classLabel: 'work', confidence: 0.9, appSource: 'Chrome' },
  { url: 'https://youtube.com/watch?v=pqr', domain: 'youtube.com', title: '토익 900점 달성 비법 - 리스닝 파트별 공략', classLabel: 'study', confidence: 0.85, appSource: 'YouTube' },
  { url: 'https://twitch.tv/streamer', domain: 'twitch.tv', title: 'Twitch - 게임 스트리밍', classLabel: 'gaming', confidence: 0.9, appSource: 'Chrome' },
  { url: 'https://youtube.com/watch?v=stu', domain: 'youtube.com', title: '홈트레이닝 30분 전신 운동 루틴', classLabel: 'health', confidence: 0.85, appSource: 'YouTube' },
  { url: 'https://youtube.com/watch?v=vwx', domain: 'youtube.com', title: '쿠팡 하울 - 이번 달 구매한 것들 언박싱', classLabel: 'shopping', confidence: 0.75, appSource: 'YouTube' },
  { url: 'https://youtube.com/watch?v=yza', domain: 'youtube.com', title: 'AWS 클라우드 자격증 준비 - SAA 핵심 정리', classLabel: 'study', confidence: 0.85, appSource: 'YouTube' },
  { url: 'https://youtube.com/watch?v=bcd', domain: 'youtube.com', title: '마인크래프트 서바이벌 시즌3 #15', classLabel: 'gaming', confidence: 0.85, appSource: 'YouTube' },
  { url: 'https://m.search.naver.com/search', domain: 'm.search.naver.com', title: '네이버 검색 (카카오톡 내)', classLabel: 'other', confidence: 0.5, appSource: '카카오톡' },
];
