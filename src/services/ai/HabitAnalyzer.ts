/**
 * HabitAnalyzer - Long-term habit change tracking and analysis.
 * Analyzes usage patterns over weeks/months and generates insights.
 */

import { DailyReport, ContentCategory } from '@/types';

export interface HabitTrend {
  period: 'weekly' | 'monthly' | 'quarterly';
  avgScreenTime: number;
  avgBlockedCount: number;
  categoryTrends: Record<string, number[]>;
  streakDays: number;
  improvementRate: number;
}

export interface HabitPattern {
  type: 'improvement' | 'regression' | 'plateau' | 'spike';
  category: string;
  description: string;
  confidence: number;
}

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/**
 * Analyzes habit trends over a given period.
 * Improvement rate = (first_half_avg - second_half_avg) / first_half_avg * 100
 */
export function analyzeHabitTrend(
  reports: DailyReport[],
  period: 'weekly' | 'monthly' | 'quarterly',
): HabitTrend {
  if (reports.length === 0) {
    return {
      period,
      avgScreenTime: 0,
      avgBlockedCount: 0,
      categoryTrends: {},
      streakDays: 0,
      improvementRate: 0,
    };
  }

  const sorted = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const avgScreenTime =
    sorted.reduce((s, r) => s + r.totalScreenTime, 0) / sorted.length;
  const avgBlockedCount =
    sorted.reduce((s, r) => s + r.blockedCount, 0) / sorted.length;

  // Category trends: array of daily minutes per category
  const categoryTrends: Record<string, number[]> = {};
  for (const report of sorted) {
    for (const cu of report.categoryBreakdown) {
      if (!categoryTrends[cu.category]) {
        categoryTrends[cu.category] = [];
      }
      categoryTrends[cu.category].push(cu.minutes);
    }
  }

  // Streak: consecutive days from the end where blockedCount stayed low (< 3)
  let streakDays = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].blockedCount < 3) {
      streakDays++;
    } else {
      break;
    }
  }

  // Improvement rate: compare first half vs second half screen time
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid || 1);
  const secondHalf = sorted.slice(mid);

  const firstAvg =
    firstHalf.reduce((s, r) => s + r.totalScreenTime, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((s, r) => s + r.totalScreenTime, 0) / secondHalf.length;

  const improvementRate =
    firstAvg > 0 ? ((firstAvg - secondAvg) / firstAvg) * 100 : 0;

  return {
    period,
    avgScreenTime: Math.round(avgScreenTime),
    avgBlockedCount: Math.round(avgBlockedCount * 10) / 10,
    categoryTrends,
    streakDays,
    improvementRate: Math.round(improvementRate * 10) / 10,
  };
}

/**
 * Detects notable patterns in the report history.
 */
export function detectHabitPatterns(reports: DailyReport[]): HabitPattern[] {
  if (reports.length < 3) return [];

  const sorted = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const patterns: HabitPattern[] = [];

  // Per-category analysis
  const categoryDays = buildCategoryDays(sorted);

  for (const [category, dailyMinutes] of Object.entries(categoryDays)) {
    if (dailyMinutes.length < 3) continue;

    const mid = Math.floor(dailyMinutes.length / 2);
    const firstAvg = avg(dailyMinutes.slice(0, mid || 1));
    const secondAvg = avg(dailyMinutes.slice(mid));

    if (firstAvg === 0 && secondAvg === 0) continue;

    const changeRate =
      firstAvg > 0 ? ((firstAvg - secondAvg) / firstAvg) * 100 : 0;

    if (changeRate > 20) {
      patterns.push({
        type: 'improvement',
        category,
        description: `${categoryLabel(category)} 사용 시간이 지난 ${dailyMinutes.length}일간 ${Math.round(changeRate)}% 감소했습니다`,
        confidence: Math.min(95, 50 + Math.abs(changeRate)),
      });
    } else if (changeRate < -20) {
      patterns.push({
        type: 'regression',
        category,
        description: `${categoryLabel(category)} 사용 시간이 지난 ${dailyMinutes.length}일간 ${Math.round(Math.abs(changeRate))}% 증가했습니다`,
        confidence: Math.min(95, 50 + Math.abs(changeRate)),
      });
    } else {
      patterns.push({
        type: 'plateau',
        category,
        description: `${categoryLabel(category)} 사용 시간이 안정적으로 유지되고 있습니다`,
        confidence: 60,
      });
    }
  }

  // Weekend vs weekday comparison
  const weekdayMins: number[] = [];
  const weekendMins: number[] = [];
  for (const r of sorted) {
    const day = new Date(r.date).getDay();
    if (day === 0 || day === 6) {
      weekendMins.push(r.totalScreenTime);
    } else {
      weekdayMins.push(r.totalScreenTime);
    }
  }
  if (weekdayMins.length > 0 && weekendMins.length > 0) {
    const ratio = avg(weekendMins) / avg(weekdayMins);
    if (ratio > 1.5) {
      patterns.push({
        type: 'spike',
        category: 'overall',
        description: `주말 소셜미디어 사용이 평일보다 ${Math.round(ratio)}배 많습니다`,
        confidence: Math.min(90, 50 + (ratio - 1) * 30),
      });
    }
  }

  return patterns;
}

/**
 * Generates Korean-language weekly insights from the last 7 reports.
 */
export function generateWeeklyInsight(reports: DailyReport[]): string[] {
  const recent = lastN(reports, 7);
  if (recent.length === 0) return ['아직 충분한 데이터가 없습니다.'];

  const insights: string[] = [];
  const trend = analyzeHabitTrend(recent, 'weekly');

  insights.push(
    `이번 주 평균 스크린타임: ${formatMin(trend.avgScreenTime)}`,
  );

  if (trend.improvementRate > 10) {
    insights.push(
      `스크린타임이 ${Math.round(trend.improvementRate)}% 개선되었습니다!`,
    );
  } else if (trend.improvementRate < -10) {
    insights.push(
      `스크린타임이 ${Math.round(Math.abs(trend.improvementRate))}% 증가했습니다. 주의가 필요합니다.`,
    );
  }

  if (trend.streakDays >= 3) {
    insights.push(`${trend.streakDays}일 연속 건강한 사용 패턴을 유지하고 있습니다.`);
  }

  const totalBlocked = recent.reduce((s, r) => s + r.blockedCount, 0);
  if (totalBlocked > 0) {
    insights.push(`이번 주 총 ${totalBlocked}건의 유해 콘텐츠를 차단했습니다.`);
  }

  return insights;
}

/**
 * Generates Korean-language monthly insights from the last 30 reports.
 */
export function generateMonthlyInsight(reports: DailyReport[]): string[] {
  const recent = lastN(reports, 30);
  if (recent.length < 7) return ['월간 분석을 위한 데이터가 부족합니다.'];

  const insights: string[] = [];
  const trend = analyzeHabitTrend(recent, 'monthly');
  const patterns = detectHabitPatterns(recent);

  insights.push(
    `이번 달 평균 스크린타임: ${formatMin(trend.avgScreenTime)}`,
  );
  insights.push(
    `평균 차단 횟수: 하루 ${trend.avgBlockedCount}회`,
  );

  if (trend.improvementRate > 5) {
    insights.push(
      `전체적으로 ${Math.round(trend.improvementRate)}% 개선 추세를 보이고 있습니다.`,
    );
  }

  // Add the most notable pattern
  const notable = patterns.find(
    (p) => p.type === 'improvement' || p.type === 'regression',
  );
  if (notable) {
    insights.push(notable.description);
  }

  if (trend.streakDays >= 7) {
    insights.push(
      `${trend.streakDays}일 연속 건강한 사용을 유지 중입니다. 훌륭합니다!`,
    );
  }

  return insights;
}

/**
 * Predicts the highest-risk day of the week based on historical data.
 */
export function predictRiskDay(
  reports: DailyReport[],
): { dayOfWeek: string; riskLevel: string; reason: string } {
  if (reports.length < 7) {
    return { dayOfWeek: '토요일', riskLevel: 'medium', reason: '데이터 부족으로 기본값 반환' };
  }

  const dayTotals: Record<number, number[]> = {};
  for (let d = 0; d < 7; d++) dayTotals[d] = [];

  for (const r of reports) {
    const day = new Date(r.date).getDay();
    dayTotals[day].push(r.totalScreenTime + r.blockedCount * 10);
  }

  let worstDay = 0;
  let worstAvg = 0;
  for (let d = 0; d < 7; d++) {
    const a = dayTotals[d].length > 0 ? avg(dayTotals[d]) : 0;
    if (a > worstAvg) {
      worstAvg = a;
      worstDay = d;
    }
  }

  const overallAvg = avg(Object.values(dayTotals).flat());
  const ratio = overallAvg > 0 ? worstAvg / overallAvg : 1;

  let riskLevel: string;
  if (ratio > 1.5) riskLevel = 'high';
  else if (ratio > 1.2) riskLevel = 'medium';
  else riskLevel = 'low';

  return {
    dayOfWeek: DAY_NAMES[worstDay],
    riskLevel,
    reason: `${DAY_NAMES[worstDay]}의 평균 사용량이 다른 요일보다 ${Math.round((ratio - 1) * 100)}% 높습니다`,
  };
}

/**
 * Returns an overall digital wellness score (0-100).
 * Based on: screen time trend, block compliance, category diversity, consistency.
 */
export function getHabitScore(reports: DailyReport[]): number {
  if (reports.length === 0) return 50;

  const sorted = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // 1. Screen time trend score (0-25): lower recent = better
  const mid = Math.floor(sorted.length / 2) || 1;
  const firstAvg = avg(sorted.slice(0, mid).map((r) => r.totalScreenTime));
  const secondAvg = avg(sorted.slice(mid).map((r) => r.totalScreenTime));
  const trendScore =
    firstAvg > 0
      ? Math.min(25, Math.max(0, ((firstAvg - secondAvg) / firstAvg) * 50 + 12.5))
      : 12.5;

  // 2. Block compliance score (0-25): fewer blocks = better habits
  const avgBlocked = avg(sorted.map((r) => r.blockedCount));
  const blockScore = Math.max(0, 25 - avgBlocked * 3);

  // 3. Category diversity score (0-25): more diverse = healthier
  const allCategories = new Set<string>();
  for (const r of sorted) {
    for (const cu of r.categoryBreakdown) {
      allCategories.add(cu.category);
    }
  }
  const diversityScore = Math.min(25, allCategories.size * 5);

  // 4. Consistency score (0-25): lower variance in daily screen time = better
  const times = sorted.map((r) => r.totalScreenTime);
  const mean = avg(times);
  const variance =
    times.length > 1
      ? times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  const consistencyScore = Math.max(0, 25 - cv * 25);

  return Math.round(
    Math.min(100, Math.max(0, trendScore + blockScore + diversityScore + consistencyScore)),
  );
}

// ---- Private helpers ----

function buildCategoryDays(
  sorted: DailyReport[],
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const r of sorted) {
    for (const cu of r.categoryBreakdown) {
      if (!result[cu.category]) result[cu.category] = [];
      result[cu.category].push(cu.minutes);
    }
  }
  return result;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function lastN(reports: DailyReport[], n: number): DailyReport[] {
  const sorted = [...reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return sorted.slice(0, n);
}

function formatMin(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    gambling: '도박',
    gaming: '게임',
    adult: '성인',
    social_media: '소셜미디어',
    shopping: '쇼핑',
    news: '뉴스',
    custom: '기타',
  };
  return labels[category] || category;
}
