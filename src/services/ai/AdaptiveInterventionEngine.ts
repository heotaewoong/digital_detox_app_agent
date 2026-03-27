import { MoodState, Mood, MoodRiskLevel } from './MoodAnalyzer';
import { ContextualAnalysis, RecommendedAction } from './ContextAnalyzer';

// ── Types ────────────────────────────────────────────────────────────

export type InterventionType = 'nudge' | 'reminder' | 'delay' | 'redirect' | 'block';

export type UserAction = 'complied' | 'dismissed' | 'bypassed';

export interface InterventionStrategy {
  type: InterventionType;
  intensity: number; // 1-5
  message: string;
  actionLabel: string;
  cooldownSeconds: number;
  showDreamReminder: boolean;
  suggestAlternative?: string;
}

interface InterventionRecord {
  timestamp: number;
  strategyType: InterventionType;
  userAction: UserAction;
}

// ── Constants ────────────────────────────────────────────────────────

const MAX_INTERVENTION_HISTORY = 200;

/**
 * Maps (category, mood) pairs to healthy alternative activities.
 */
const ALTERNATIVE_ACTIVITIES: Record<string, Record<string, string[]>> = {
  social_media: {
    stressed: ['5분 명상하기', '심호흡 3회'],
    anxious: ['5분 명상하기', '좋아하는 음악 듣기'],
    neutral: ['친구에게 직접 전화하기', '10분 산책하기'],
    good: ['목표 관련 콘텐츠 찾아보기', '독서 10분'],
    great: ['창작 활동 시작하기', '운동 루틴 수행'],
  },
  gaming: {
    stressed: ['스트레칭 5분', '심호흡 3회'],
    anxious: ['좋아하는 음악 듣기', '감사 일기 쓰기'],
    neutral: ['10분 산책하기', '목표 관련 유튜브 시청'],
    good: ['목표 관련 유튜브 시청', '독서 15분'],
    great: ['운동 30분', '새로운 기술 학습'],
  },
  news: {
    stressed: ['좋아하는 음악 듣기', '감사 일기 쓰기'],
    anxious: ['좋아하는 음악 듣기', '감사 일기 쓰기'],
    neutral: ['독서 10분', '산책하기'],
    good: ['목표 관련 뉴스만 확인하기', '팟캐스트 듣기'],
    great: ['목표 관련 아티클 읽기', '학습 콘텐츠 시청'],
  },
  gambling: {
    stressed: ['즉시 자리 이동하기', '신뢰할 수 있는 사람에게 연락하기'],
    anxious: ['심호흡 10회', '산책 나가기'],
    neutral: ['목표 금액 저축 앱 확인하기', '운동하기'],
    good: ['재무 목표 점검하기', '건전한 취미 활동하기'],
    great: ['저축 목표 확인하기', '자기 계발 시간 갖기'],
  },
  adult: {
    stressed: ['운동하기', '차가운 물로 세수하기'],
    anxious: ['명상하기', '야외 활동하기'],
    neutral: ['독서하기', '운동하기'],
    good: ['목표 관련 활동하기', '사회적 활동 참여'],
    great: ['창작 활동하기', '운동 루틴 수행'],
  },
  shopping: {
    stressed: ['위시리스트에만 추가하기', '24시간 후 재확인 알림 설정'],
    anxious: ['산책하기', '명상하기'],
    neutral: ['예산 앱 확인하기', '이번 달 지출 점검하기'],
    good: ['저축 목표 확인하기', '무료 콘텐츠 즐기기'],
    great: ['재무 목표 점검하기', '기부 활동 알아보기'],
  },
  custom: {
    stressed: ['5분 명상하기', '심호흡 3회'],
    anxious: ['좋아하는 음악 듣기', '산책하기'],
    neutral: ['목표 확인하기', '독서 10분'],
    good: ['목표 관련 활동하기', '운동하기'],
    great: ['새로운 기술 학습하기', '창작 활동하기'],
  },
};

/**
 * Messages displayed for each intervention type.
 */
const INTERVENTION_MESSAGES: Record<InterventionType, string> = {
  nudge: '잠깐! 지금 이 활동이 당신의 목표에 도움이 될까요?',
  reminder: '당신의 꿈을 기억하세요. 오늘의 목표를 확인해 볼까요?',
  delay: '30초 동안 잠시 멈추고 생각해 보세요. 정말 필요한 활동인가요?',
  redirect: '지금 기분이 좋지 않은 것 같아요. 더 건강한 대안을 시도해 볼까요?',
  block: '이 콘텐츠는 당신의 목표 달성을 방해합니다. 꿈을 위해 멈춰 주세요.',
};

const INTERVENTION_LABELS: Record<InterventionType, string> = {
  nudge: '확인',
  reminder: '목표 보기',
  delay: '기다리는 중...',
  redirect: '대안 활동 시작',
  block: '돌아가기',
};

/**
 * Adaptive intervention engine (singleton).
 *
 * Selects the most appropriate intervention strategy based on the user's
 * current mood state, contextual risk analysis, and personal goals.
 * Tracks intervention outcomes to enable future effectiveness analysis.
 */
export class AdaptiveInterventionEngine {
  private static instance: AdaptiveInterventionEngine | null = null;

  private interventionHistory: InterventionRecord[] = [];

  private constructor() {}

  static getInstance(): AdaptiveInterventionEngine {
    if (!AdaptiveInterventionEngine.instance) {
      AdaptiveInterventionEngine.instance = new AdaptiveInterventionEngine();
    }
    return AdaptiveInterventionEngine.instance;
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Selects an intervention strategy appropriate for the current user state.
   */
  selectStrategy(
    moodState: MoodState,
    contextAnalysis: ContextualAnalysis,
    userGoals: string[],
  ): InterventionStrategy {
    const type = this.determineType(moodState, contextAnalysis);
    const intensity = this.determineIntensity(type, contextAnalysis.adjustedRiskScore);
    const mood: Mood = moodState.reportedMood ?? 'neutral';

    // Determine the content category from context factors or fall back to 'custom'
    const category = this.inferCategory(contextAnalysis);
    const alternative = this.getAlternativeActivity(category, mood);

    const goalSnippet =
      userGoals.length > 0
        ? ` 당신의 목표: "${userGoals[0]}"`
        : '';

    const message = INTERVENTION_MESSAGES[type] + goalSnippet;

    return {
      type,
      intensity,
      message,
      actionLabel: INTERVENTION_LABELS[type],
      cooldownSeconds: this.getCooldown(type),
      showDreamReminder: type === 'delay' || type === 'block',
      suggestAlternative: type === 'redirect' || type === 'block' ? alternative : undefined,
    };
  }

  /**
   * Returns a healthy alternative activity suggestion based on the content
   * category and the user's current mood.
   */
  getAlternativeActivity(category: string, mood: string): string {
    const categoryActivities = ALTERNATIVE_ACTIVITIES[category] ?? ALTERNATIVE_ACTIVITIES['custom'];
    const moodActivities = categoryActivities[mood] ?? categoryActivities['neutral'];
    // Pick a random suggestion from the available options
    return moodActivities[Math.floor(Math.random() * moodActivities.length)];
  }

  /**
   * Records the outcome of an intervention so effectiveness can be tracked.
   */
  recordInterventionResult(strategyType: InterventionType, userAction: UserAction): void {
    this.interventionHistory.push({
      timestamp: Date.now(),
      strategyType,
      userAction,
    });

    if (this.interventionHistory.length > MAX_INTERVENTION_HISTORY) {
      this.interventionHistory.shift();
    }
  }

  /**
   * Returns effectiveness statistics for each intervention type.
   * Compliance rate = complied / (complied + dismissed + bypassed).
   */
  getEffectivenessStats(): Record<InterventionType, { total: number; complianceRate: number }> {
    const types: InterventionType[] = ['nudge', 'reminder', 'delay', 'redirect', 'block'];
    const stats: Record<InterventionType, { total: number; complianceRate: number }> = {} as any;

    for (const type of types) {
      const records = this.interventionHistory.filter((r) => r.strategyType === type);
      const complied = records.filter((r) => r.userAction === 'complied').length;
      stats[type] = {
        total: records.length,
        complianceRate: records.length > 0 ? complied / records.length : 0,
      };
    }

    return stats;
  }

  /**
   * Returns a readonly copy of the intervention history.
   */
  getInterventionHistory(): readonly InterventionRecord[] {
    return this.interventionHistory;
  }

  // ── Private helpers ────────────────────────────────────────────────

  /**
   * Determines the intervention type based on mood risk level, context
   * analysis score, and whether evasion was detected.
   */
  private determineType(
    moodState: MoodState,
    contextAnalysis: ContextualAnalysis,
  ): InterventionType {
    const score = contextAnalysis.adjustedRiskScore;
    const mood = moodState.reportedMood ?? 'neutral';
    const hasEvasion = contextAnalysis.contextFactors.some((f) => f.includes('evasion'));
    const isStressed = mood === 'stressed' || mood === 'anxious';

    // Critical risk OR repeated evasion → block
    if (score >= 80 || (hasEvasion && score >= 60)) {
      return 'block';
    }

    // High risk → delay with dream reminder
    if (score >= 60) {
      return 'delay';
    }

    // Medium risk + stressed → redirect to healthy alternative
    if (score >= 40 && isStressed) {
      return 'redirect';
    }

    // Medium risk + neutral/good mood → reminder
    if (score >= 40) {
      return 'reminder';
    }

    // Low risk + good mood → gentle nudge
    return 'nudge';
  }

  private determineIntensity(type: InterventionType, riskScore: number): number {
    switch (type) {
      case 'nudge':
        return 1;
      case 'reminder':
        return 2;
      case 'redirect':
        return 3;
      case 'delay':
        return 4;
      case 'block':
        return 5;
    }
  }

  private getCooldown(type: InterventionType): number {
    switch (type) {
      case 'nudge':
        return 5;
      case 'reminder':
        return 15;
      case 'redirect':
        return 20;
      case 'delay':
        return 30;
      case 'block':
        return 60;
    }
  }

  /**
   * Attempts to infer the content category from contextual analysis factors.
   * Falls back to 'custom' if no category can be determined.
   */
  private inferCategory(contextAnalysis: ContextualAnalysis): string {
    const factorStr = contextAnalysis.contextFactors.join(' ').toLowerCase();

    if (factorStr.includes('social')) return 'social_media';
    if (factorStr.includes('gaming') || factorStr.includes('game')) return 'gaming';
    if (factorStr.includes('gambling') || factorStr.includes('casino')) return 'gambling';
    if (factorStr.includes('shopping')) return 'shopping';
    if (factorStr.includes('news')) return 'news';
    if (factorStr.includes('adult')) return 'adult';

    // Try to infer from the recommended action severity
    if (contextAnalysis.adjustedRiskScore >= 80) return 'gambling';
    return 'custom';
  }
}
