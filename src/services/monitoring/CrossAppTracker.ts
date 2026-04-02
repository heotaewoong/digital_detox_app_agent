import type { AppTransition, EvasionDetection } from '@/types';

const SIMILAR_APPS: Record<string, string[]> = {
  video: ['YouTube', 'TikTok', 'Instagram', 'Twitch', 'Netflix', '릴스', '숏폼', 'Reels'],
  gaming: ['배틀그라운드', '프리파이어', '브롤스타즈', '원신', 'Roblox', '마인크래프트', 'Clash of Clans'],
  gambling: ['포커', '슬롯', '카지노', '토토', '배팅', '스포츠베팅', 'SportsBet'],
  social: ['카카오톡', 'Instagram', 'Facebook', 'Twitter', '트위터', '틱톡', 'Snapchat', '라인'],
  shopping: ['쿠팡', '네이버쇼핑', '11번가', '무신사', '오늘의집', '당근마켓', 'Aliexpress'],
};

class CrossAppTrackerClass {
  private static instance: CrossAppTrackerClass;
  private transitions: AppTransition[] = [];
  private readonly MAX_TRANSITIONS = 50;

  static getInstance(): CrossAppTrackerClass {
    if (!CrossAppTrackerClass.instance) {
      CrossAppTrackerClass.instance = new CrossAppTrackerClass();
    }
    return CrossAppTrackerClass.instance;
  }

  private getGroup(appName: string): string | null {
    for (const [group, apps] of Object.entries(SIMILAR_APPS)) {
      if (apps.some((a) => a.toLowerCase() === appName.toLowerCase())) {
        return group;
      }
    }
    return null;
  }

  recordTransition(from: string, to: string, wasBlocked: boolean): void {
    this.transitions.push({ from, to, timestamp: new Date().toISOString(), wasBlocked });
    if (this.transitions.length > this.MAX_TRANSITIONS) {
      this.transitions.shift();
    }
  }

  detectEvasionPattern(): EvasionDetection {
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    const recent = this.transitions.filter(
      (t) => new Date(t.timestamp).getTime() >= twoMinutesAgo
    ).slice(-5);

    for (const t of recent) {
      if (!t.wasBlocked) continue;
      const fromGroup = this.getGroup(t.from);
      const toGroup = this.getGroup(t.to);
      if (fromGroup && toGroup && fromGroup === toGroup && t.from !== t.to) {
        const age = now - new Date(t.timestamp).getTime();
        const confidence = age < 60_000 ? 1.0 : 0.7;
        return {
          isEvasion: true,
          confidence,
          pattern: `${t.from} 차단 후 유사 앱(${t.to})으로 이동`,
          fromApp: t.from,
          toApp: t.to,
        };
      }
    }

    return { isEvasion: false, confidence: 0, pattern: '', fromApp: '', toApp: '' };
  }

  getAppSwitchFrequency(windowMinutes: number): number {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    return this.transitions.filter(
      (t) => new Date(t.timestamp).getTime() >= cutoff
    ).length;
  }

  getTransitionStats(): {
    totalTransitions: number;
    evasionAttempts: number;
    evasionRate: number;
    mostCommonEvasion: string;
  } {
    const evasions = this.transitions.filter((t) => {
      if (!t.wasBlocked) return false;
      return this.getGroup(t.from) === this.getGroup(t.to) && t.from !== t.to;
    });

    const evasionCounts: Record<string, number> = {};
    for (const e of evasions) {
      const key = `${e.from} → ${e.to}`;
      evasionCounts[key] = (evasionCounts[key] || 0) + 1;
    }
    const mostCommon = Object.entries(evasionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '없음';

    return {
      totalTransitions: this.transitions.length,
      evasionAttempts: evasions.length,
      evasionRate:
        this.transitions.length > 0
          ? Math.round((evasions.length / this.transitions.length) * 100)
          : 0,
      mostCommonEvasion: mostCommon,
    };
  }

  getRecentApps(count: number): string[] {
    return this.transitions
      .slice(-count)
      .map((t) => t.to)
      .reverse();
  }
}

export const CrossAppTracker = CrossAppTrackerClass.getInstance();
