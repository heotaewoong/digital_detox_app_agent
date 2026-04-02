/**
 * Chrome Extension Bridge
 * 크롬 확장 프로그램의 실제 데이터를 앱에서 읽어오는 브릿지
 *
 * 웹 환경(localhost:8082)에서 localStorage를 통해 확장 프로그램과 통신합니다.
 * 확장 프로그램은 background.js에서 주기적으로 데이터를 localStorage에 씁니다.
 */

export interface ExtensionStats {
  todayBlocked: number;
  totalBlocked: number;
  lastUpdated: string;
}

export interface ExtensionTimeRecord {
  domain: string;
  title: string;
  label: string;
  labelDisplay: string;
  emoji: string;
  isProductive: boolean;
  color: string;
  durationSeconds: number;
  timestamp: string;
  date: string;
}

export interface ExtensionReport {
  today: string;
  totalMinutes: number;
  productiveRatio: number;
  categories: {
    label: string;
    labelDisplay: string;
    emoji: string;
    isProductive: boolean;
    color: string;
    totalSeconds: number;
    minutes: number;
    percentage: number;
    sites: { domain: string; title: string; seconds: number }[];
  }[];
}

export class ChromeExtensionBridge {
  private static readonly SYNC_KEY = 'acg_sync';
  private static readonly STATS_KEY = 'acg_stats';
  private static readonly REPORT_KEY = 'acg_report';

  /**
   * 앱의 키워드를 localStorage에 저장 → 확장 프로그램이 읽어감
   */
  static syncKeywordsToExtension(keywordGroups: any[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const syncData = {
        keywordGroups,
        lastSync: new Date().toISOString(),
      };
      window.localStorage.setItem(this.SYNC_KEY, JSON.stringify(syncData));
    } catch (e) {
      console.warn('[Bridge] Failed to sync keywords:', e);
    }
  }

  /**
   * 사용자 목표를 localStorage에 저장 → 확장 프로그램이 읽어감
   */
  static syncGoalsToExtension(goals: string[], dreams: string[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem('acg_goals', JSON.stringify({ goals, dreams, lastSync: new Date().toISOString() }));
    } catch (e) {}
  }

  /**
   * 확장 프로그램에서 키워드 변경 이벤트를 수신합니다.
   * 확장 프로그램에서 키워드를 추가/삭제하면 콜백이 호출됩니다.
   */
  static onKeywordsUpdatedFromExtension(callback: (groups: any[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };

    window.addEventListener('acg_keywords_updated', handler);

    // 언마운트 시 제거할 cleanup 함수 반환
    return () => window.removeEventListener('acg_keywords_updated', handler);
  }

  /**
   * 확장 프로그램의 차단 통계를 읽어옴
   */
  static getExtensionStats(): ExtensionStats | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(this.STATS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * 확장 프로그램의 시간 리포트를 읽어옴
   */
  static getExtensionReport(): ExtensionReport | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(this.REPORT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * 확장 프로그램이 연결되어 있는지 확인
   */
  static isConnected(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const raw = window.localStorage.getItem(this.SYNC_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      const lastSync = new Date(data.lastSync);
      const diffMinutes = (Date.now() - lastSync.getTime()) / 60000;
      return diffMinutes < 5; // 5분 이내에 동기화된 경우
    } catch {
      return false;
    }
  }
}
