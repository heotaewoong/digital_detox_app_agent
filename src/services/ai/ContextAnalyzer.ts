import { ContentCategory, RiskLevel } from '@/types';
import { MoodState } from './MoodAnalyzer';

// ── Types ────────────────────────────────────────────────────────────

export interface ContentContext {
  appName: string;
  previousApp?: string;
  timeOfDay: number; // hour 0-23
  sessionDuration: number; // minutes
  consecutiveBlocks: number;
  currentMood?: MoodState;
}

export type RecommendedAction = 'allow' | 'log' | 'warn' | 'soft_block' | 'hard_block';

export interface ContextualAnalysis {
  originalRiskScore: number;
  adjustedRiskScore: number;
  contextFactors: string[];
  recommendedAction: RecommendedAction;
  reasoning: string;
}

// ── Constants ────────────────────────────────────────────────────────

const ESCALATION_THRESHOLD = 3;         // blocks in 30 min to escalate
const EVASION_RISK_BOOST = 0.30;        // +30% for evasion
const LATE_NIGHT_RISK_BOOST = 0.20;     // +20% for late night entertainment
const STRESSED_SOCIAL_RISK_BOOST = 0.25; // +25% for stressed + social media
const EDUCATIONAL_REDUCTION = 0.15;     // -15% for educational content in gaming app
const LATE_NIGHT_START = 23;
const LATE_NIGHT_END = 5;

/**
 * Map of apps considered similar to each other.
 * Used to detect evasion patterns where a user switches from a blocked app
 * to a functionally equivalent one.
 */
export const APP_SIMILARITY_MAP: Record<string, string[]> = {
  YouTube: ['TikTok', 'Instagram', 'Instagram Reels', 'Facebook Watch', 'Twitch'],
  TikTok: ['YouTube', 'YouTube Shorts', 'Instagram', 'Instagram Reels', 'Facebook Watch'],
  Instagram: ['TikTok', 'YouTube', 'Facebook', 'Snapchat', 'Twitter'],
  'Instagram Reels': ['TikTok', 'YouTube Shorts', 'Facebook Watch'],
  Facebook: ['Instagram', 'Twitter', 'Snapchat'],
  Twitter: ['Facebook', 'Instagram', 'Threads'],
  Threads: ['Twitter', 'Facebook'],
  Chrome: ['Safari', 'Samsung Internet', 'Naver', 'Whale'],
  Safari: ['Chrome', 'Samsung Internet', 'Naver', 'Whale'],
  'Samsung Internet': ['Chrome', 'Safari', 'Naver'],
  Naver: ['Chrome', 'Safari', 'Samsung Internet', 'Daum'],
  // Korean-specific gaming apps
  '배틀그라운드': ['프리파이어', 'Call of Duty Mobile', 'Fortnite'],
  '프리파이어': ['배틀그라운드', 'Call of Duty Mobile', 'Fortnite'],
  '쿠팡': ['11번가', 'G마켓', '위메프', '티몬'],
  '11번가': ['쿠팡', 'G마켓', '위메프'],
};

/** Keywords that hint at educational intent even inside gaming or entertainment apps. */
const EDUCATIONAL_KEYWORDS = [
  '강의', '튜토리얼', 'tutorial', 'lecture', 'course',
  '학습', 'learn', 'study', '교육', 'education',
  '프로그래밍', 'programming', 'coding', '수학', 'math',
];

/**
 * Context-aware content analysis service.
 *
 * Goes beyond simple keyword matching by factoring in app context,
 * time-of-day, mood state, and evasion patterns to produce an
 * adjusted risk score and recommended action.
 */
export class ContextAnalyzer {
  /**
   * Analyses text within its surrounding context and returns an
   * adjusted risk assessment.
   *
   * @param text        The detected text / content snippet.
   * @param riskScore   The raw risk score produced by KeywordDetector (0-100).
   * @param context     Contextual metadata about the current usage session.
   */
  analyzeWithContext(
    text: string,
    riskScore: number,
    context: ContentContext,
  ): ContextualAnalysis {
    const factors: string[] = [];
    let adjusted = riskScore;

    // ── Rule 1: Consecutive blocks escalation ──────────────────────
    if (context.consecutiveBlocks >= ESCALATION_THRESHOLD) {
      const boost = Math.round(riskScore * 0.25);
      adjusted += boost;
      factors.push(
        `same_category_blocked_${context.consecutiveBlocks}_times_in_30min (+${boost})`,
      );
    }

    // ── Rule 2: Evasion detection ──────────────────────────────────
    if (context.previousApp) {
      const evasionDetected = this.areSimilarApps(context.appName, context.previousApp);
      if (evasionDetected) {
        const boost = Math.round(riskScore * EVASION_RISK_BOOST);
        adjusted += boost;
        factors.push(
          `evasion_detected:${context.previousApp}->${context.appName} (+${boost})`,
        );
      }
    }

    // ── Rule 3: Late-night entertainment ───────────────────────────
    if (this.isLateNight(context.timeOfDay) && this.isEntertainmentApp(context.appName)) {
      const boost = Math.round(riskScore * LATE_NIGHT_RISK_BOOST);
      adjusted += boost;
      factors.push(`late_night_entertainment (+${boost})`);
    }

    // ── Rule 4: Stressed mood + social media ───────────────────────
    if (
      context.currentMood &&
      (context.currentMood.reportedMood === 'stressed' ||
        context.currentMood.reportedMood === 'anxious' ||
        context.currentMood.inferredStress >= 50) &&
      this.isSocialMediaApp(context.appName)
    ) {
      const boost = Math.round(riskScore * STRESSED_SOCIAL_RISK_BOOST);
      adjusted += boost;
      factors.push(`stressed_mood_social_media (+${boost})`);
    }

    // ── Rule 5: Educational content false-positive protection ──────
    if (this.isGamingOrEntertainmentApp(context.appName) && this.hasEducationalContent(text)) {
      const reduction = Math.round(riskScore * EDUCATIONAL_REDUCTION);
      adjusted -= reduction;
      factors.push(`educational_content_detected (-${reduction})`);
    }

    adjusted = Math.max(0, Math.min(100, adjusted));

    const recommendedAction = this.scoreToAction(adjusted);
    const reasoning = this.buildReasoning(factors, riskScore, adjusted, recommendedAction);

    return {
      originalRiskScore: riskScore,
      adjustedRiskScore: adjusted,
      contextFactors: factors,
      recommendedAction,
      reasoning,
    };
  }

  /**
   * Detects whether the user is attempting to evade blocking by
   * switching to a similar app.
   *
   * @param currentApp  The app currently in use.
   * @param recentApps  Ordered list of recently used apps (most recent first).
   * @returns true if evasion pattern is detected.
   */
  detectEvasion(currentApp: string, recentApps: string[]): boolean {
    for (const recent of recentApps) {
      if (recent === currentApp) continue;
      if (this.areSimilarApps(currentApp, recent)) {
        return true;
      }
    }
    return false;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private areSimilarApps(appA: string, appB: string): boolean {
    const similarToA = APP_SIMILARITY_MAP[appA];
    if (similarToA && similarToA.includes(appB)) return true;

    const similarToB = APP_SIMILARITY_MAP[appB];
    if (similarToB && similarToB.includes(appA)) return true;

    return false;
  }

  private isLateNight(hour: number): boolean {
    return hour >= LATE_NIGHT_START || hour < LATE_NIGHT_END;
  }

  private isEntertainmentApp(appName: string): boolean {
    const entertainmentApps = [
      'YouTube', 'TikTok', 'Instagram', 'Netflix', 'Twitch',
      'Facebook Watch', 'Disney+', '왓챠', '웨이브',
    ];
    return entertainmentApps.some(
      (app) => appName.toLowerCase().includes(app.toLowerCase()),
    );
  }

  private isSocialMediaApp(appName: string): boolean {
    const socialApps = [
      'Instagram', 'TikTok', 'Twitter', 'Facebook', 'Threads',
      'Snapchat', 'KakaoTalk', '카카오톡', 'Discord',
    ];
    return socialApps.some(
      (app) => appName.toLowerCase().includes(app.toLowerCase()),
    );
  }

  private isGamingOrEntertainmentApp(appName: string): boolean {
    return this.isEntertainmentApp(appName) || this.isGamingApp(appName);
  }

  private isGamingApp(appName: string): boolean {
    const gamingApps = [
      '배틀그라운드', '프리파이어', 'Fortnite', 'Roblox',
      'Call of Duty', '리그 오브 레전드', 'Steam',
    ];
    return gamingApps.some(
      (app) => appName.toLowerCase().includes(app.toLowerCase()),
    );
  }

  private hasEducationalContent(text: string): boolean {
    const lowerText = text.toLowerCase();
    return EDUCATIONAL_KEYWORDS.some((kw) => lowerText.includes(kw.toLowerCase()));
  }

  private scoreToAction(score: number): RecommendedAction {
    if (score >= 80) return 'hard_block';
    if (score >= 60) return 'soft_block';
    if (score >= 40) return 'warn';
    if (score >= 20) return 'log';
    return 'allow';
  }

  private buildReasoning(
    factors: string[],
    original: number,
    adjusted: number,
    action: RecommendedAction,
  ): string {
    if (factors.length === 0) {
      return `원본 위험 점수 ${original}점. 추가 컨텍스트 요인 없음. 권장 조치: ${action}.`;
    }

    const delta = adjusted - original;
    const direction = delta >= 0 ? '상승' : '하락';
    return (
      `원본 위험 점수 ${original}점에서 ${Math.abs(delta)}점 ${direction}하여 ` +
      `조정 점수 ${adjusted}점. ` +
      `감지된 요인: ${factors.join(', ')}. ` +
      `권장 조치: ${action}.`
    );
  }
}
