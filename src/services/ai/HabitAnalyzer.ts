import type { DailyReport, HabitPattern } from '@/types';

export interface HabitTrend {
  period: 'weekly' | 'monthly' | 'quarterly';
  avgScreenTime: number;
  avgBlockedCount: number;
  streakDays: number;
  improvementRate: number;
  dominantCategory: string;
}

const WEEKDAY_LABELS: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토',
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function generateSimulatedReports(): DailyReport[] {
  const cats = ['social_media', 'gaming', 'shopping', 'news'] as const;
  const reports: DailyReport[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000);
    const dateStr = date.toISOString().split('T')[0];
    const screenTime = 120 + Math.floor(Math.random() * 180);
    reports.push({
      date: dateStr,
      totalScreenTime: screenTime,
      categoryBreakdown: cats.map((cat) => ({
        category: cat,
        minutes: Math.floor(screenTime / cats.length) + Math.floor(Math.random() * 20),
        percentage: Math.floor(100 / cats.length),
        color: '#8B5CF6',
      })),
      detections: [],
      blockedCount: Math.floor(Math.random() * 10),
      savedMinutes: Math.floor(Math.random() * 10) * 15,
      streak: 29 - i,
      aiInsight: '',
      goalProgress: [],
    });
  }
  return reports;
}

export class HabitAnalyzer {
  analyzeHabitTrend(reports: DailyReport[], period: 'weekly' | 'monthly' | 'quarterly'): HabitTrend {
    const data = reports.length === 0 ? generateSimulatedReports() : reports;
    const half = Math.floor(data.length / 2);
    const first = data.slice(0, half);
    const second = data.slice(half);
    const firstAvg = avg(first.map((r) => r.totalScreenTime));
    const secondAvg = avg(second.map((r) => r.totalScreenTime));
    const improvementRate = firstAvg > 0 ? ((firstAvg - secondAvg) / firstAvg) * 100 : 0;

    const catMinutes: Record<string, number> = {};
    data.forEach((r) =>
      r.categoryBreakdown.forEach((c) => {
        catMinutes[c.category] = (catMinutes[c.category] ?? 0) + c.minutes;
      })
    );
    const dominantCategory =
      Object.entries(catMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

    return {
      period,
      avgScreenTime: Math.round(avg(data.map((r) => r.totalScreenTime))),
      avgBlockedCount: Math.round(avg(data.map((r) => r.blockedCount))),
      streakDays: data[data.length - 1]?.streak ?? 0,
      improvementRate: Math.round(improvementRate * 10) / 10,
      dominantCategory,
    };
  }

  detectHabitPatterns(reports: DailyReport[]): HabitPattern[] {
    const data = reports.length === 0 ? generateSimulatedReports() : reports;
    const recent = data.slice(-14);
    const prevWeek = recent.slice(0, 7);
    const currWeek = recent.slice(7);

    const catPrev: Record<string, number> = {};
    const catCurr: Record<string, number> = {};
    prevWeek.forEach((r) => r.categoryBreakdown.forEach((c) => {
      catPrev[c.category] = (catPrev[c.category] ?? 0) + c.minutes;
    }));
    currWeek.forEach((r) => r.categoryBreakdown.forEach((c) => {
      catCurr[c.category] = (catCurr[c.category] ?? 0) + c.minutes;
    }));

    const catLabels: Record<string, string> = {
      gaming: '게임', social_media: '소셜 미디어',
      shopping: '쇼핑', news: '뉴스', gambling: '도박', adult: '성인',
    };

    const patterns: HabitPattern[] = [];
    const allCats = new Set([...Object.keys(catPrev), ...Object.keys(catCurr)]);
    allCats.forEach((cat) => {
      const prev = catPrev[cat] ?? 0;
      const curr = catCurr[cat] ?? 0;
      if (prev === 0) return;
      const rate = ((curr - prev) / prev) * 100;
      const label = catLabels[cat] ?? cat;
      if (rate < -10) {
        patterns.push({ type: 'improvement', category: cat,
          description: `${label} 사용 시간이 지난 2주간 ${Math.abs(Math.round(rate))}% 감소했습니다 🎉`,
          confidence: Math.min(0.95, 0.5 + Math.abs(rate) / 100) });
      } else if (rate > 10) {
        patterns.push({ type: 'regression', category: cat,
          description: `${label} 사용 시간이 지난 2주간 ${Math.round(rate)}% 증가했습니다 ⚠️`,
          confidence: Math.min(0.95, 0.5 + rate / 100) });
      } else if (Math.abs(rate) <= 5) {
        patterns.push({ type: 'plateau', category: cat,
          description: `${label} 사용 패턴이 2주째 비슷한 수준을 유지하고 있습니다`,
          confidence: 0.7 });
      }
    });

    const overallPrev = avg(prevWeek.map((r) => r.totalScreenTime));
    const overallCurr = avg(currWeek.map((r) => r.totalScreenTime));
    const overallChange = overallPrev > 0 ? ((overallCurr - overallPrev) / overallPrev) * 100 : 0;
    if (overallChange > 30) {
      patterns.push({ type: 'spike', category: 'overall',
        description: `이번 주 전체 스크린 타임이 ${Math.round(overallChange)}% 급증했습니다 🚨`,
        confidence: 0.85 });
    }
    return patterns;
  }

  generateWeeklyInsight(reports: DailyReport[]): string[] {
    const data = reports.length === 0 ? generateSimulatedReports() : reports;
    const recent = data.slice(-14);
    const prevWeek = recent.slice(0, 7);
    const currWeek = recent.slice(7);
    const screenChange = Math.round(
      ((avg(prevWeek.map((r) => r.totalScreenTime)) - avg(currWeek.map((r) => r.totalScreenTime)))
        / (avg(prevWeek.map((r) => r.totalScreenTime)) || 1)) * 100
    );
    const blockChange = Math.round(
      ((avg(currWeek.map((r) => r.blockedCount)) - avg(prevWeek.map((r) => r.blockedCount)))
        / (avg(prevWeek.map((r) => r.blockedCount)) || 1)) * 100
    );
    const streak = data[data.length - 1]?.streak ?? 0;
    const riskDay = this.predictRiskDay(data);
    const insights: string[] = [];

    if (screenChange > 0)
      insights.push(`이번 주 스크린 타임이 지난 주보다 ${screenChange}% 줄었어요! 정말 잘하고 있어요 🎉`);
    else if (screenChange < 0)
      insights.push(`이번 주 스크린 타임이 지난 주보다 ${Math.abs(screenChange)}% 늘었어요. 조금 더 신경 써볼까요?`);

    if (blockChange > 0)
      insights.push(`차단 성공률이 ${blockChange}% 향상됐어요! 의지력이 강해지고 있어요 💪`);

    if (streak >= 7)
      insights.push(`${streak}일 연속 목표 달성 중! 이 기세 유지해요 🔥`);
    else if (streak >= 3)
      insights.push(`${streak}일 연속 도전 중. 7일 달성까지 조금만 더!`);

    insights.push(`${riskDay.dayOfWeek}에 과사용 주의가 필요해요. 미리 계획을 세워보세요.`);
    return insights.slice(0, 4);
  }

  getHabitScore(reports: DailyReport[]): number {
    const data = reports.length === 0 ? generateSimulatedReports() : reports;
    const half = Math.floor(data.length / 2);
    const first = data.slice(0, half);
    const second = data.slice(half);
    const firstScreen = avg(first.map((r) => r.totalScreenTime));
    const secondScreen = avg(second.map((r) => r.totalScreenTime));
    const screenScore = Math.min(100, Math.max(0,
      50 + (firstScreen > 0 ? ((firstScreen - secondScreen) / firstScreen) * 100 : 0)
    ));
    const firstBlock = avg(first.map((r) => r.blockedCount));
    const secondBlock = avg(second.map((r) => r.blockedCount));
    const blockScore = Math.min(100, Math.max(0,
      50 + (firstBlock > 0 ? ((secondBlock - firstBlock) / firstBlock) * 50 : 0)
    ));
    const allTimes = data.map((r) => r.totalScreenTime);
    const mean = avg(allTimes);
    const stdDev = Math.sqrt(avg(allTimes.map((t) => Math.pow(t - mean, 2))));
    const consistencyScore = Math.min(100, Math.max(0, 100 - (stdDev / (mean || 1)) * 100));
    return Math.round(screenScore * 0.4 + blockScore * 0.3 + consistencyScore * 0.3);
  }

  predictRiskDay(reports: DailyReport[]): { dayOfWeek: string; riskLevel: string; reason: string } {
    const data = reports.length === 0 ? generateSimulatedReports() : reports;
    const pattern = this.getWeekdayPattern(data);
    const sorted = Object.entries(pattern).sort((a, b) => b[1].avgScreenTime - a[1].avgScreenTime);
    const [riskDay, stats] = sorted[0] ?? ['월', { avgScreenTime: 120, avgBlocked: 3 }];
    const overallAvg = avg(data.map((r) => r.totalScreenTime));
    const ratio = overallAvg > 0 ? stats.avgScreenTime / overallAvg : 1;
    const riskLevel = ratio >= 1.5 ? '높음' : ratio >= 1.2 ? '보통' : '낮음';
    const h = Math.floor(stats.avgScreenTime / 60);
    const m = stats.avgScreenTime % 60;
    return {
      dayOfWeek: `${riskDay}요일`,
      riskLevel,
      reason: `${riskDay}요일 평균 스크린 타임이 ${m > 0 ? `${h}시간 ${m}분` : `${h}시간`}으로 가장 높습니다`,
    };
  }

  getWeekdayPattern(reports: DailyReport[]): Record<string, { avgScreenTime: number; avgBlocked: number }> {
    const data = reports.length === 0 ? generateSimulatedReports() : reports;
    const buckets: Record<number, { screen: number[]; blocked: number[] }> = {};
    data.forEach((r) => {
      const day = new Date(r.date).getDay();
      if (!buckets[day]) buckets[day] = { screen: [], blocked: [] };
      buckets[day].screen.push(r.totalScreenTime);
      buckets[day].blocked.push(r.blockedCount);
    });
    const result: Record<string, { avgScreenTime: number; avgBlocked: number }> = {};
    Object.entries(buckets).forEach(([d, { screen, blocked }]) => {
      result[WEEKDAY_LABELS[Number(d)] ?? d] = {
        avgScreenTime: Math.round(avg(screen)),
        avgBlocked: Math.round(avg(blocked)),
      };
    });
    return result;
  }
}

export const habitAnalyzer = new HabitAnalyzer();
