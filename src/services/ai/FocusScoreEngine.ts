import { SiteVisit, FocusSession, DetectionEvent } from '@/types';
import { CATEGORY_DISPLAY } from './ContentClassifier';

/**
 * Rize 벤치마킹 - 포커스 스코어 엔진
 * 
 * 여러 요소를 종합하여 0-100 포커스 점수를 계산합니다:
 * - 생산적 시간 비율 (40%)
 * - 집중 세션 완료율 (25%)
 * - 픽업 횟수 (15%)
 * - 차단 성공률 (10%)
 * - 연속 달성일 (10%)
 */

interface FocusScoreInput {
  todayVisits: SiteVisit[];
  todaySessions: FocusSession[];
  todayDetections: DetectionEvent[];
  pickupCount: number;
  streak: number;
  screenTimeMinutes: number;
  screenTimeLimit: number;
}

interface FocusScoreResult {
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  gradeColor: string;
  gradeEmoji: string;
  breakdown: {
    productivityScore: number;
    focusSessionScore: number;
    pickupScore: number;
    blockScore: number;
    streakScore: number;
  };
  insights: string[];
  comparison: string; // 어제 대비
}

export class FocusScoreEngine {
  /**
   * 포커스 점수를 계산합니다.
   */
  static calculate(input: FocusScoreInput): FocusScoreResult {
    const breakdown = {
      productivityScore: this.calcProductivityScore(input.todayVisits),
      focusSessionScore: this.calcFocusSessionScore(input.todaySessions),
      pickupScore: this.calcPickupScore(input.pickupCount),
      blockScore: this.calcBlockScore(input.todayDetections),
      streakScore: this.calcStreakScore(input.streak),
    };

    // 가중 평균
    const totalScore = Math.round(
      breakdown.productivityScore * 0.4 +
      breakdown.focusSessionScore * 0.25 +
      breakdown.pickupScore * 0.15 +
      breakdown.blockScore * 0.1 +
      breakdown.streakScore * 0.1
    );

    const { grade, gradeColor, gradeEmoji } = this.getGrade(totalScore);
    const insights = this.generateInsights(input, breakdown);

    return {
      totalScore,
      grade,
      gradeColor,
      gradeEmoji,
      breakdown,
      insights,
      comparison: this.getComparison(totalScore),
    };
  }

  /**
   * 생산적 시간 비율 점수 (0-100)
   */
  private static calcProductivityScore(visits: SiteVisit[]): number {
    if (visits.length === 0) return 50; // 데이터 없으면 중간값

    let prodTime = 0;
    let totalTime = 0;

    for (const v of visits) {
      const min = v.durationSeconds / 60;
      totalTime += min;
      const display = CATEGORY_DISPLAY[v.classLabel];
      if (display?.isProductive) prodTime += min;
    }

    if (totalTime === 0) return 50;
    const ratio = prodTime / totalTime;
    return Math.round(ratio * 100);
  }

  /**
   * 집중 세션 점수 (0-100)
   */
  private static calcFocusSessionScore(sessions: FocusSession[]): number {
    if (sessions.length === 0) return 0;

    const completed = sessions.filter((s) => s.completed);
    const completionRate = completed.length / sessions.length;
    const totalFocusMin = completed.reduce((s, sess) => s + sess.targetMinutes, 0);

    // 60분 이상 집중하면 만점
    const timeScore = Math.min(100, (totalFocusMin / 60) * 100);
    const rateScore = completionRate * 100;

    return Math.round(timeScore * 0.6 + rateScore * 0.4);
  }

  /**
   * 픽업 점수 (적을수록 높음, 0-100)
   */
  private static calcPickupScore(pickups: number): number {
    // 0회 = 100점, 50회 이상 = 0점
    if (pickups <= 5) return 100;
    if (pickups >= 50) return 0;
    return Math.round(100 - ((pickups - 5) / 45) * 100);
  }

  /**
   * 차단 성공 점수 (0-100)
   */
  private static calcBlockScore(detections: DetectionEvent[]): number {
    if (detections.length === 0) return 100; // 감지 없으면 만점

    const blocked = detections.filter((d) => d.action === 'blocked');
    const warned = detections.filter((d) => d.action === 'warned');

    // 차단 + 경고가 많을수록 좋음 (유혹을 이겨냄)
    const successRate = (blocked.length + warned.length) / detections.length;
    return Math.round(successRate * 100);
  }

  /**
   * 연속 달성 점수 (0-100)
   */
  private static calcStreakScore(streak: number): number {
    if (streak >= 30) return 100;
    if (streak >= 14) return 80;
    if (streak >= 7) return 60;
    if (streak >= 3) return 40;
    if (streak >= 1) return 20;
    return 0;
  }

  /**
   * 등급 결정
   */
  private static getGrade(score: number): { grade: FocusScoreResult['grade']; gradeColor: string; gradeEmoji: string } {
    if (score >= 90) return { grade: 'S', gradeColor: '#FFD700', gradeEmoji: '🏆' };
    if (score >= 80) return { grade: 'A', gradeColor: '#10B981', gradeEmoji: '🌟' };
    if (score >= 70) return { grade: 'B', gradeColor: '#3B82F6', gradeEmoji: '👍' };
    if (score >= 50) return { grade: 'C', gradeColor: '#FBBF24', gradeEmoji: '💪' };
    if (score >= 30) return { grade: 'D', gradeColor: '#F97316', gradeEmoji: '😤' };
    return { grade: 'F', gradeColor: '#EF4444', gradeEmoji: '😰' };
  }

  /**
   * 인사이트 생성
   */
  private static generateInsights(input: FocusScoreInput, breakdown: FocusScoreResult['breakdown']): string[] {
    const insights: string[] = [];

    if (breakdown.productivityScore >= 70) {
      insights.push('생산적인 시간 비율이 높아요. 잘하고 있습니다!');
    } else if (breakdown.productivityScore < 40) {
      insights.push('비생산적 활동이 많아요. 집중 세션을 시작해보세요.');
    }

    if (breakdown.focusSessionScore === 0) {
      insights.push('오늘 아직 집중 세션을 시작하지 않았어요.');
    } else if (breakdown.focusSessionScore >= 80) {
      insights.push('집중 세션을 잘 완료하고 있어요!');
    }

    if (input.pickupCount > 30) {
      insights.push(`픽업 ${input.pickupCount}회는 좀 많아요. 폰을 내려놓아보세요.`);
    }

    if (input.screenTimeMinutes > input.screenTimeLimit) {
      insights.push(`오늘 사용 제한(${input.screenTimeLimit}분)을 초과했어요.`);
    }

    if (input.streak >= 7) {
      insights.push(`${input.streak}일 연속 달성 중! 대단해요!`);
    }

    // YouTube 분석
    const ytVisits = input.todayVisits.filter((v) => v.domain?.includes('youtube'));
    if (ytVisits.length > 0) {
      const studyYt = ytVisits.filter((v) => v.classLabel === 'study');
      const gameYt = ytVisits.filter((v) => v.classLabel === 'gaming');
      if (gameYt.length > studyYt.length) {
        insights.push('유튜브에서 게임 영상을 많이 봤어요. 공부 영상으로 바꿔보세요.');
      } else if (studyYt.length > 0) {
        insights.push('유튜브를 학습에 잘 활용하고 있어요!');
      }
    }

    return insights.slice(0, 4);
  }

  /**
   * 비교 문구
   */
  private static getComparison(score: number): string {
    // 시뮬레이션: 어제 점수를 랜덤으로 생성
    const yesterdayScore = Math.floor(Math.random() * 30) + 40;
    const diff = score - yesterdayScore;
    if (diff > 10) return `어제보다 ${diff}점 상승 📈`;
    if (diff < -10) return `어제보다 ${Math.abs(diff)}점 하락 📉`;
    return '어제와 비슷한 수준 ➡️';
  }
}
