import { CategoryUsage, ContentCategory, DailyReport, DetectionEvent, UsageRecord } from '@/types';
import { colors } from './theme';

export function generateDailyReport(
  usageRecords: UsageRecord[],
  detections: DetectionEvent[],
  streak: number,
): DailyReport {
  const totalScreenTime = usageRecords.reduce((sum, r) => sum + r.durationMinutes, 0);

  const categoryMap = new Map<ContentCategory, number>();
  usageRecords.forEach((r) => {
    categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + r.durationMinutes);
  });

  const categoryBreakdown: CategoryUsage[] = Array.from(categoryMap.entries()).map(([category, minutes]) => ({
    category,
    minutes,
    percentage: totalScreenTime > 0 ? Math.round((minutes / totalScreenTime) * 100) : 0,
    color: colors.categories[category] || colors.primary,
  }));

  const blockedCount = detections.filter((d) => d.action === 'blocked').length;
  const savedMinutes = blockedCount * 15; // estimate 15min saved per block

  return {
    date: new Date().toISOString().split('T')[0],
    totalScreenTime,
    categoryBreakdown,
    detections,
    blockedCount,
    savedMinutes,
    streak,
    aiInsight: '',
    goalProgress: [],
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

export function getRiskColor(score: number): string {
  if (score >= 80) return colors.danger;
  if (score >= 60) return colors.accentOrange;
  if (score >= 40) return colors.warning;
  return colors.success;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '새벽이에요';
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '좋은 오후에요';
  return '좋은 저녁이에요';
}

export function generateSimulationData(): { usageRecords: UsageRecord[]; detections: DetectionEvent[] } {
  const categories: ContentCategory[] = ['social_media', 'gaming', 'shopping', 'news', 'gambling'];
  const today = new Date().toISOString().split('T')[0];

  const usageRecords: UsageRecord[] = categories.map((category) => ({
    date: today,
    appName: getAppForCategory(category),
    category,
    durationMinutes: Math.floor(Math.random() * 120) + 10,
    detectionCount: Math.floor(Math.random() * 5),
  }));

  const detections: DetectionEvent[] = Array.from({ length: 5 }, (_, i) => ({
    id: `sim-${i}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    appName: getAppForCategory(categories[i % categories.length]),
    category: categories[i % categories.length],
    matchedKeywords: ['시뮬레이션 키워드'],
    riskScore: Math.floor(Math.random() * 60) + 40,
    action: (['logged', 'warned', 'blocked'] as const)[Math.floor(Math.random() * 3)],
  }));

  return { usageRecords, detections };
}

function getAppForCategory(category: ContentCategory): string {
  const map: Record<ContentCategory, string> = {
    gambling: 'Chrome',
    gaming: 'YouTube',
    adult: 'Chrome',
    social_media: 'Instagram',
    shopping: '쿠팡',
    news: '네이버',
    custom: 'Unknown',
  };
  return map[category];
}

// ---- Monthly report & wellness analytics ----

export interface MonthlyReport {
  month: string; // YYYY-MM
  totalDays: number;
  weeklyAverages: { week: number; avgScreenTime: number; avgBlocked: number }[];
  overallAvgScreenTime: number;
  overallAvgBlocked: number;
  totalBlocked: number;
  totalSavedMinutes: number;
  improvementPercent: number;
  topCategory: string | null;
  bestStreak: number;
}

/**
 * Generates a MonthlyReport with weekly averages, trends, and improvement %.
 */
export function generateMonthlyReport(dailyReports: DailyReport[]): MonthlyReport {
  if (dailyReports.length === 0) {
    return {
      month: new Date().toISOString().slice(0, 7),
      totalDays: 0,
      weeklyAverages: [],
      overallAvgScreenTime: 0,
      overallAvgBlocked: 0,
      totalBlocked: 0,
      totalSavedMinutes: 0,
      improvementPercent: 0,
      topCategory: null,
      bestStreak: 0,
    };
  }

  const sorted = [...dailyReports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const month = sorted[0].date.slice(0, 7);

  // Split into weeks of 7
  const weeklyAverages: { week: number; avgScreenTime: number; avgBlocked: number }[] = [];
  for (let i = 0; i < sorted.length; i += 7) {
    const chunk = sorted.slice(i, i + 7);
    const weekNum = weeklyAverages.length + 1;
    weeklyAverages.push({
      week: weekNum,
      avgScreenTime: Math.round(
        chunk.reduce((s, r) => s + r.totalScreenTime, 0) / chunk.length,
      ),
      avgBlocked: Math.round(
        (chunk.reduce((s, r) => s + r.blockedCount, 0) / chunk.length) * 10,
      ) / 10,
    });
  }

  const overallAvgScreenTime = Math.round(
    sorted.reduce((s, r) => s + r.totalScreenTime, 0) / sorted.length,
  );
  const totalBlocked = sorted.reduce((s, r) => s + r.blockedCount, 0);
  const overallAvgBlocked =
    Math.round((totalBlocked / sorted.length) * 10) / 10;
  const totalSavedMinutes = sorted.reduce((s, r) => s + r.savedMinutes, 0);

  // Improvement: first half vs second half screen time
  const mid = Math.floor(sorted.length / 2) || 1;
  const firstAvg =
    sorted.slice(0, mid).reduce((s, r) => s + r.totalScreenTime, 0) / mid;
  const secondAvg =
    sorted.slice(mid).reduce((s, r) => s + r.totalScreenTime, 0) /
    (sorted.length - mid);
  const improvementPercent =
    firstAvg > 0
      ? Math.round(((firstAvg - secondAvg) / firstAvg) * 1000) / 10
      : 0;

  // Top category by total minutes
  const catMinutes = new Map<string, number>();
  for (const r of sorted) {
    for (const cu of r.categoryBreakdown) {
      catMinutes.set(cu.category, (catMinutes.get(cu.category) || 0) + cu.minutes);
    }
  }
  let topCategory: string | null = null;
  let topMin = 0;
  for (const [cat, mins] of catMinutes) {
    if (mins > topMin) {
      topMin = mins;
      topCategory = cat;
    }
  }

  // Best streak
  const bestStreak = Math.max(...sorted.map((r) => r.streak), 0);

  return {
    month,
    totalDays: sorted.length,
    weeklyAverages,
    overallAvgScreenTime,
    overallAvgBlocked,
    totalBlocked,
    totalSavedMinutes,
    improvementPercent,
    topCategory,
    bestStreak,
  };
}

/**
 * Calculates a wellness score (0-100) based on screen time, blocks, and streaks.
 */
export function calculateWellnessScore(reports: DailyReport[]): number {
  if (reports.length === 0) return 50;

  const sorted = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Screen time score (0-40): lower average = better
  const avgScreen =
    sorted.reduce((s, r) => s + r.totalScreenTime, 0) / sorted.length;
  // 0 min -> 40, 360+ min -> 0
  const screenScore = Math.max(0, 40 - (avgScreen / 360) * 40);

  // Block trend score (0-30): decreasing blocks over time = better
  const mid = Math.floor(sorted.length / 2) || 1;
  const firstBlocks =
    sorted.slice(0, mid).reduce((s, r) => s + r.blockedCount, 0) / mid;
  const secondBlocks =
    sorted.slice(mid).reduce((s, r) => s + r.blockedCount, 0) /
    (sorted.length - mid);
  const blockImprovement =
    firstBlocks > 0 ? (firstBlocks - secondBlocks) / firstBlocks : 0;
  const blockScore = Math.max(0, Math.min(30, 15 + blockImprovement * 30));

  // Streak score (0-30): higher streak = better
  const maxStreak = Math.max(...sorted.map((r) => r.streak), 0);
  const streakScore = Math.min(30, maxStreak * 2);

  return Math.round(Math.min(100, Math.max(0, screenScore + blockScore + streakScore)));
}

/**
 * Returns average screen time and blocked count for each day of the week.
 */
export function getWeekdayPattern(
  reports: DailyReport[],
): Record<string, { avgScreenTime: number; avgBlocked: number }> {
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  const buckets: Record<string, { screen: number[]; blocked: number[] }> = {};
  for (const name of dayNames) {
    buckets[name] = { screen: [], blocked: [] };
  }

  for (const r of reports) {
    const dayIdx = new Date(r.date).getDay();
    const name = dayNames[dayIdx];
    buckets[name].screen.push(r.totalScreenTime);
    buckets[name].blocked.push(r.blockedCount);
  }

  const result: Record<string, { avgScreenTime: number; avgBlocked: number }> = {};
  for (const name of dayNames) {
    const s = buckets[name].screen;
    const b = buckets[name].blocked;
    result[name] = {
      avgScreenTime: s.length > 0 ? Math.round(s.reduce((a, v) => a + v, 0) / s.length) : 0,
      avgBlocked: b.length > 0 ? Math.round((b.reduce((a, v) => a + v, 0) / b.length) * 10) / 10 : 0,
    };
  }

  return result;
}

/**
 * Generates 30 days of simulated DailyReport data for testing.
 */
export function generateSimulationMonthlyData(): DailyReport[] {
  const categories: ContentCategory[] = ['social_media', 'gaming', 'shopping', 'news', 'gambling'];
  const reports: DailyReport[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Weekends get more screen time
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseTime = isWeekend ? 280 : 180;
    const totalScreenTime = baseTime + Math.floor(Math.random() * 120) - 40;

    // Gradual improvement trend: later days have slightly less time
    const trendFactor = 1 - (29 - i) * 0.005;

    const adjustedScreenTime = Math.max(
      30,
      Math.round(totalScreenTime * trendFactor),
    );

    // Category breakdown
    const catCount = 3 + Math.floor(Math.random() * 3);
    const selectedCats = [...categories]
      .sort(() => Math.random() - 0.5)
      .slice(0, catCount);

    let remaining = adjustedScreenTime;
    const categoryBreakdown: CategoryUsage[] = selectedCats.map((cat, idx) => {
      const isLast = idx === selectedCats.length - 1;
      const mins = isLast
        ? remaining
        : Math.max(5, Math.floor(remaining * (Math.random() * 0.5 + 0.1)));
      remaining -= mins;
      if (remaining < 0) remaining = 0;
      return {
        category: cat,
        minutes: mins,
        percentage: 0, // filled below
        color: colors.categories[cat] || colors.primary,
      };
    });

    const total = categoryBreakdown.reduce((s, c) => s + c.minutes, 0);
    for (const cb of categoryBreakdown) {
      cb.percentage = total > 0 ? Math.round((cb.minutes / total) * 100) : 0;
    }

    const blockedCount = Math.max(0, Math.floor(Math.random() * 6) - 1);
    const streak = Math.max(0, 30 - i - Math.floor(Math.random() * 5));

    reports.push({
      date: dateStr,
      totalScreenTime: adjustedScreenTime,
      categoryBreakdown,
      detections: [],
      blockedCount,
      savedMinutes: blockedCount * 15,
      streak,
      aiInsight: '',
      goalProgress: [],
    });
  }

  return reports;
}
