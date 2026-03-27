/**
 * CrossAppTracker - Detects evasion patterns when users switch
 * from a blocked app to a similar-category app.
 */

export interface AppTransition {
  from: string;
  to: string;
  timestamp: string;
  wasBlocked: boolean;
}

export interface EvasionResult {
  isEvasion: boolean;
  confidence: number;
  pattern: string;
  fromApp: string;
  toApp: string;
}

export interface TransitionStats {
  totalTransitions: number;
  evasionAttempts: number;
  evasionRate: number;
  mostCommonEvasion: string | null;
}

const SIMILAR_APPS: Record<string, string[]> = {
  video: ['YouTube', 'TikTok', 'Instagram', 'Twitch', 'Netflix', '숏폼'],
  gaming: ['배틀그라운드', '프리파이어', '브롤스타즈', '원신', 'Roblox', '마인크래프트'],
  gambling: ['포커', '슬롯', '카지노', '토토', '배팅'],
  social: ['카카오톡', 'Instagram', 'Facebook', 'Twitter', '틱톡', '트위터'],
  shopping: ['쿠팡', '네이버쇼핑', '11번가', '무신사', '오늘의집'],
};

const MAX_TRANSITIONS = 50;
const EVASION_WINDOW_MS = 60_000; // 60 seconds

export class CrossAppTracker {
  private static instance: CrossAppTracker;
  private transitions: AppTransition[] = [];

  private constructor() {}

  static getInstance(): CrossAppTracker {
    if (!CrossAppTracker.instance) {
      CrossAppTracker.instance = new CrossAppTracker();
    }
    return CrossAppTracker.instance;
  }

  /**
   * Records an app transition. Maintains a rolling window of the last 50.
   */
  recordTransition(from: string, to: string, wasBlocked: boolean): void {
    this.transitions.push({
      from,
      to,
      timestamp: new Date().toISOString(),
      wasBlocked,
    });

    if (this.transitions.length > MAX_TRANSITIONS) {
      this.transitions = this.transitions.slice(-MAX_TRANSITIONS);
    }
  }

  /**
   * Checks if the most recent transition looks like an evasion:
   * user moved from a blocked app to a similar-category app within 60 seconds.
   */
  detectEvasionPattern(): EvasionResult {
    const noEvasion: EvasionResult = {
      isEvasion: false,
      confidence: 0,
      pattern: '',
      fromApp: '',
      toApp: '',
    };

    if (this.transitions.length < 2) return noEvasion;

    const latest = this.transitions[this.transitions.length - 1];
    const previous = this.transitions[this.transitions.length - 2];

    if (!previous.wasBlocked) return noEvasion;

    const timeDiff =
      new Date(latest.timestamp).getTime() - new Date(previous.timestamp).getTime();
    if (timeDiff > EVASION_WINDOW_MS) return noEvasion;

    const sharedCategory = this.findSharedCategory(previous.from, latest.to);
    if (!sharedCategory) return noEvasion;

    // Confidence: higher when the switch was faster
    const speedFactor = 1 - timeDiff / EVASION_WINDOW_MS;
    const confidence = Math.round(Math.min(100, 50 + speedFactor * 50));

    return {
      isEvasion: true,
      confidence,
      pattern: sharedCategory,
      fromApp: previous.from,
      toApp: latest.to,
    };
  }

  /**
   * Returns aggregate statistics about transitions and evasion attempts.
   */
  getTransitionStats(): TransitionStats {
    const evasionCounts = new Map<string, number>();
    let evasionAttempts = 0;

    for (let i = 1; i < this.transitions.length; i++) {
      const prev = this.transitions[i - 1];
      const curr = this.transitions[i];

      if (!prev.wasBlocked) continue;

      const timeDiff =
        new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (timeDiff > EVASION_WINDOW_MS) continue;

      const category = this.findSharedCategory(prev.from, curr.to);
      if (category) {
        evasionAttempts++;
        const key = `${prev.from} -> ${curr.to}`;
        evasionCounts.set(key, (evasionCounts.get(key) || 0) + 1);
      }
    }

    let mostCommonEvasion: string | null = null;
    let maxCount = 0;
    for (const [key, count] of evasionCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonEvasion = key;
      }
    }

    const totalTransitions = this.transitions.length;
    return {
      totalTransitions,
      evasionAttempts,
      evasionRate: totalTransitions > 0 ? evasionAttempts / totalTransitions : 0,
      mostCommonEvasion,
    };
  }

  /**
   * Returns the number of app switches within the last `windowMinutes` minutes.
   * Useful for stress / anxiety detection.
   */
  getAppSwitchFrequency(windowMinutes: number): number {
    const cutoff = Date.now() - windowMinutes * 60_000;
    return this.transitions.filter(
      (t) => new Date(t.timestamp).getTime() >= cutoff,
    ).length;
  }

  // ---- private helpers ----

  private findSharedCategory(appA: string, appB: string): string | null {
    if (appA === appB) return null;
    for (const [category, apps] of Object.entries(SIMILAR_APPS)) {
      if (apps.includes(appA) && apps.includes(appB)) {
        return category;
      }
    }
    return null;
  }
}
