import type { InterventionStrategy, MoodState, ContextualAnalysis } from '@/types';

type UserAction = 'complied' | 'dismissed' | 'bypassed';

interface InterventionRecord {
  strategyType: string;
  userAction: UserAction;
  timestamp: string;
}

class AdaptiveInterventionEngineClass {
  private static instance: AdaptiveInterventionEngineClass;
  private history: InterventionRecord[] = [];
  private readonly MAX_HISTORY = 200;

  static getInstance(): AdaptiveInterventionEngineClass {
    if (!AdaptiveInterventionEngineClass.instance) {
      AdaptiveInterventionEngineClass.instance = new AdaptiveInterventionEngineClass();
    }
    return AdaptiveInterventionEngineClass.instance;
  }

  selectStrategy(
    moodState: MoodState,
    contextAnalysis: ContextualAnalysis,
    userGoals: string[]
  ): InterventionStrategy {
    const firstGoal = userGoals[0] || '당신의 목표';
    const { recommendedAction, adjustedRiskScore } = contextAnalysis;
    const { riskLevel, inferredStress, suggestedIntervention } = moodState;

    const isEvasion = contextAnalysis.contextFactors.some((f) =>
      f.includes('우회') || f.includes('evasion')
    );

    // 최고 강도: hard_block, critical 위험도, 또는 우회 시도
    if (
      recommendedAction === 'hard_block' ||
      riskLevel === 'critical' ||
      (isEvasion && adjustedRiskScore >= 70)
    ) {
      return {
        type: 'block',
        intensity: 5,
        message: `🛡️ 지금은 집중할 시간이에요!\n"${firstGoal}"를 향해 나아가고 있잖아요.`,
        actionLabel: '돌아가기',
        cooldownSeconds: 60,
        showDreamReminder: true,
        suggestAlternative: this.getAlternativeActivity(
          contextAnalysis.contextFactors[0] || 'general',
          moodState.reportedMood || 'neutral'
        ),
      };
    }

    // 높은 위험도 또는 스트레스 상태에서 high 위험
    if (riskLevel === 'high' || (inferredStress >= 60 && adjustedRiskScore >= 50)) {
      return {
        type: 'delay',
        intensity: 4,
        message: `잠깐, 30초만 멈춰봐요.\n"${firstGoal}" 생각나시죠?`,
        actionLabel: '잠깐 기다릴게요',
        cooldownSeconds: 30,
        showDreamReminder: true,
      };
    }

    // 중간 위험도 + 스트레스 상태 → 대안 활동 추천
    if (adjustedRiskScore >= 50 && inferredStress >= 40) {
      const alt = this.getAlternativeActivity(
        contextAnalysis.contextFactors[0] || 'general',
        moodState.reportedMood || 'neutral'
      );
      return {
        type: 'redirect',
        intensity: 3,
        message: `스트레스를 건강하게 풀어봐요 🌿`,
        actionLabel: '대안 활동하기',
        cooldownSeconds: 20,
        showDreamReminder: false,
        suggestAlternative: alt,
      };
    }

    // 중간 위험도 + 평온한 상태 → 목표 리마인더
    if (adjustedRiskScore >= 35 || recommendedAction === 'warn') {
      return {
        type: 'reminder',
        intensity: 2,
        message: `"${firstGoal}" 목표를 향해 가고 있어요 💪`,
        actionLabel: '목표 보기',
        cooldownSeconds: 15,
        showDreamReminder: true,
      };
    }

    // 낮은 위험도 → 가벼운 알림
    return {
      type: 'nudge',
      intensity: 1,
      message: `디지털 사용 시간을 체크해봐요 👀`,
      actionLabel: '알겠어요',
      cooldownSeconds: 5,
      showDreamReminder: false,
    };
  }

  getAlternativeActivity(category: string, moodType: string): string {
    const key = `${moodType}_${category}`;

    const activities: Record<string, string> = {
      stressed_social_media: '5분 명상하기 🧘',
      stressed_gaming: '심호흡 3회 하기 🌬️',
      stressed_gambling: '5분 명상하기 🧘',
      anxious_news: '좋아하는 음악 듣기 🎵',
      anxious_social_media: '일기 한 줄 쓰기 ✍️',
      neutral_gaming: '10분 산책하기 🚶',
      neutral_social_media: '친구에게 직접 연락하기 📞',
      good_shopping: '독서 10분 하기 📚',
      great_social_media: '목표 관련 유튜브 시청 🎯',
    };

    return (
      activities[key] ||
      activities[`${moodType}_general`] ||
      '물 한 잔 마시기 💧'
    );
  }

  recordInterventionResult(strategyType: string, userAction: UserAction): void {
    this.history.push({
      strategyType,
      userAction,
      timestamp: new Date().toISOString(),
    });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }

  getEffectivenessStats(): Record<string, { total: number; complied: number; rate: number }> {
    const stats: Record<string, { total: number; complied: number; rate: number }> = {};

    for (const record of this.history) {
      if (!stats[record.strategyType]) {
        stats[record.strategyType] = { total: 0, complied: 0, rate: 0 };
      }
      stats[record.strategyType].total++;
      if (record.userAction === 'complied') {
        stats[record.strategyType].complied++;
      }
    }

    for (const key of Object.keys(stats)) {
      const s = stats[key];
      s.rate = s.total > 0 ? Math.round((s.complied / s.total) * 100) : 0;
    }

    return stats;
  }
}

export const AdaptiveInterventionEngine = AdaptiveInterventionEngineClass.getInstance();
