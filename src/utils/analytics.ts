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
