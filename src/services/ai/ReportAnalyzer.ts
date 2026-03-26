import { DailyReport } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  gambling: '도박',
  gaming: '게임',
  adult: '성인 콘텐츠',
  social_media: 'SNS',
  shopping: '쇼핑',
  news: '뉴스',
  custom: '기타',
};

export class ReportAnalyzer {
  /**
   * Generates a Korean-language insight based on the daily report data.
   * Comments on total screen time, most used category, blocked count, and streak.
   */
  static generateInsight(report: DailyReport): string {
    const parts: string[] = [];

    // Screen time comment
    const hours = Math.floor(report.totalScreenTime / 60);
    const minutes = report.totalScreenTime % 60;
    if (hours > 0) {
      parts.push(`오늘 총 스크린 타임은 ${hours}시간 ${minutes}분이에요.`);
    } else {
      parts.push(`오늘 총 스크린 타임은 ${minutes}분이에요.`);
    }

    // Most used category
    if (report.categoryBreakdown.length > 0) {
      const sorted = [...report.categoryBreakdown].sort(
        (a, b) => b.minutes - a.minutes
      );
      const top = sorted[0];
      const label = CATEGORY_LABELS[top.category] ?? top.category;
      parts.push(
        `가장 많이 사용한 카테고리는 '${label}'(${top.minutes}분)입니다.`
      );
    }

    // Blocked count
    if (report.blockedCount > 0) {
      parts.push(
        `유해 콘텐츠를 ${report.blockedCount}회 차단했어요. 잘하고 있어요!`
      );
    } else {
      parts.push('오늘은 차단된 콘텐츠가 없었어요. 훌륭합니다!');
    }

    // Saved minutes
    if (report.savedMinutes > 0) {
      parts.push(`약 ${report.savedMinutes}분의 시간을 아꼈어요.`);
    }

    // Streak
    if (report.streak > 1) {
      parts.push(`${report.streak}일 연속 목표를 지키고 있어요! 대단해요!`);
    } else if (report.streak === 1) {
      parts.push('오늘부터 새로운 연속 기록을 시작해요!');
    }

    return parts.join(' ');
  }

  /**
   * Analyzes a weekly trend from multiple daily reports and provides a summary.
   */
  static getWeeklyTrend(reports: DailyReport[]): string {
    if (reports.length === 0) {
      return '아직 분석할 데이터가 충분하지 않아요. 며칠 더 사용해보세요!';
    }

    if (reports.length === 1) {
      return '첫 번째 리포트가 생성되었어요! 데이터가 쌓이면 추세를 분석해드릴게요.';
    }

    const totalScreenTimes = reports.map((r) => r.totalScreenTime);
    const avgScreenTime = Math.round(
      totalScreenTimes.reduce((a, b) => a + b, 0) / reports.length
    );

    const firstHalf = reports.slice(0, Math.floor(reports.length / 2));
    const secondHalf = reports.slice(Math.floor(reports.length / 2));

    const firstAvg =
      firstHalf.reduce((s, r) => s + r.totalScreenTime, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((s, r) => s + r.totalScreenTime, 0) /
      secondHalf.length;

    const parts: string[] = [];

    parts.push(`이번 주 평균 스크린 타임은 ${avgScreenTime}분이에요.`);

    if (secondAvg < firstAvg) {
      const decrease = Math.round(firstAvg - secondAvg);
      parts.push(
        `후반으로 갈수록 스크린 타임이 약 ${decrease}분 줄었어요. 좋은 추세입니다!`
      );
    } else if (secondAvg > firstAvg) {
      const increase = Math.round(secondAvg - firstAvg);
      parts.push(
        `후반에 스크린 타임이 약 ${increase}분 늘었어요. 조금 더 주의해볼까요?`
      );
    } else {
      parts.push('스크린 타임이 일정하게 유지되고 있어요.');
    }

    const totalBlocked = reports.reduce((s, r) => s + r.blockedCount, 0);
    if (totalBlocked > 0) {
      parts.push(`이번 주 총 ${totalBlocked}회 유해 콘텐츠를 차단했어요.`);
    }

    const maxStreak = Math.max(...reports.map((r) => r.streak));
    if (maxStreak > 1) {
      parts.push(`최대 ${maxStreak}일 연속 목표를 달성했어요!`);
    }

    return parts.join(' ');
  }

  /**
   * Provides an actionable suggestion based on patterns in the report.
   */
  static getSuggestion(report: DailyReport): string {
    // High screen time
    if (report.totalScreenTime > 360) {
      return '오늘 스크린 타임이 6시간을 넘었어요. 내일은 30분 줄이는 것을 목표로 해보는 건 어떨까요?';
    }

    // Many detections
    if (report.detections.length > 10) {
      return '오늘 유해 콘텐츠 감지가 많았어요. 특정 시간대에 집중되는지 확인해보고, 그 시간에 다른 활동을 계획해보세요.';
    }

    // Dominant category
    if (report.categoryBreakdown.length > 0) {
      const sorted = [...report.categoryBreakdown].sort(
        (a, b) => b.percentage - a.percentage
      );
      const top = sorted[0];
      if (top.percentage > 50) {
        const label = CATEGORY_LABELS[top.category] ?? top.category;
        return `'${label}' 카테고리가 전체의 ${Math.round(top.percentage)}%를 차지하고 있어요. 이 부분에 대한 시간 제한을 설정해보는 건 어떨까요?`;
      }
    }

    // Low streak
    if (report.streak === 0) {
      return '오늘부터 다시 시작해요! 작은 목표부터 설정하고 하나씩 달성해보세요.';
    }

    // Good performance
    if (report.blockedCount === 0 && report.totalScreenTime < 180) {
      return '오늘 정말 잘했어요! 이 습관을 유지하면 목표에 빠르게 다가갈 수 있어요.';
    }

    // Saved time
    if (report.savedMinutes > 30) {
      return `오늘 ${report.savedMinutes}분을 아꼈어요! 이 시간을 목표 달성에 활용해보세요.`;
    }

    return '꾸준히 하는 것이 중요해요. 내일도 함께 목표를 향해 나아가요!';
  }
}
