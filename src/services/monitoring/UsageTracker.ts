import { ContentCategory, UsageRecord } from '@/types';

/**
 * Tracks per-app screen-time usage and provides aggregated breakdowns.
 */
export class UsageTracker {
  private usageData: Map<string, UsageRecord>;

  constructor() {
    this.usageData = new Map();
  }

  /**
   * Records additional usage time for a given app.
   * If an entry already exists for the app today, the minutes are accumulated.
   */
  trackUsage(appName: string, category: ContentCategory, minutes: number): void {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `${today}:${appName}`;

    const existing = this.usageData.get(key);
    if (existing) {
      existing.durationMinutes += minutes;
    } else {
      this.usageData.set(key, {
        date: today,
        appName,
        category,
        durationMinutes: minutes,
        detectionCount: 0,
      });
    }
  }

  /**
   * Returns all usage records for today.
   */
  getTodayUsage(): UsageRecord[] {
    const today = new Date().toISOString().split('T')[0];
    const records: UsageRecord[] = [];

    for (const [key, record] of this.usageData) {
      if (key.startsWith(today)) {
        records.push({ ...record });
      }
    }

    return records.sort((a, b) => b.durationMinutes - a.durationMinutes);
  }

  /**
   * Returns the total screen time in minutes for today.
   */
  getTotalScreenTime(): number {
    return this.getTodayUsage().reduce((sum, r) => sum + r.durationMinutes, 0);
  }

  /**
   * Returns per-category aggregated usage for today.
   */
  getCategoryBreakdown(): { category: ContentCategory; minutes: number }[] {
    const map = new Map<ContentCategory, number>();

    for (const record of this.getTodayUsage()) {
      map.set(record.category, (map.get(record.category) || 0) + record.durationMinutes);
    }

    const breakdown: { category: ContentCategory; minutes: number }[] = [];
    for (const [category, minutes] of map) {
      breakdown.push({ category, minutes });
    }

    return breakdown.sort((a, b) => b.minutes - a.minutes);
  }

  /**
   * Generates realistic simulated usage data for demo / onboarding purposes.
   * Returns 5-8 app records with varying durations totaling 3-6 hours.
   */
  getSimulationUsage(): UsageRecord[] {
    const today = new Date().toISOString().split('T')[0];

    const appPool: { appName: string; category: ContentCategory }[] = [
      { appName: 'YouTube', category: 'social_media' },
      { appName: 'Instagram', category: 'social_media' },
      { appName: 'TikTok', category: 'social_media' },
      { appName: 'KakaoTalk', category: 'social_media' },
      { appName: 'Chrome', category: 'news' },
      { appName: 'Naver', category: 'news' },
      { appName: 'Coupang', category: 'shopping' },
      { appName: '배틀그라운드', category: 'gaming' },
      { appName: 'League of Legends', category: 'gaming' },
      { appName: 'Netflix', category: 'social_media' },
    ];

    // Pick 5-8 apps
    const count = Math.floor(Math.random() * 4) + 5; // 5..8
    const shuffled = [...appPool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // Target total: 180-360 minutes (3-6 hours)
    const totalTarget = Math.floor(Math.random() * 181) + 180;

    // Distribute minutes with a skewed distribution (some apps used much more)
    const weights = selected.map(() => Math.random() * Math.random()); // skewed low
    const weightSum = weights.reduce((s, w) => s + w, 0);

    const records: UsageRecord[] = selected.map((app, i) => {
      const fraction = weights[i] / weightSum;
      const minutes = Math.max(3, Math.round(fraction * totalTarget));
      const detectionCount = app.category === 'gambling' || app.category === 'gaming'
        ? Math.floor(Math.random() * 5)
        : Math.floor(Math.random() * 2);

      return {
        date: today,
        appName: app.appName,
        category: app.category,
        durationMinutes: minutes,
        detectionCount,
      };
    });

    return records.sort((a, b) => b.durationMinutes - a.durationMinutes);
  }
}
