import type { MoodEntry, MoodState, MoodType, RiskLevel } from '@/types';

class MoodAnalyzerClass {
  private static instance: MoodAnalyzerClass;
  private moodHistory: MoodEntry[] = [];
  private readonly MAX_HISTORY = 100;
  private appSwitchTimestamps: number[] = [];
  private sessionStartTime?: number;
  private blockedVisitCounts: Record<string, number> = {};

  private constructor() {}

  static getInstance(): MoodAnalyzerClass {
    if (!MoodAnalyzerClass.instance) {
      MoodAnalyzerClass.instance = new MoodAnalyzerClass();
    }
    return MoodAnalyzerClass.instance;
  }

  addMoodCheckIn(mood: MoodType, energy: number, note?: string): void {
    this.moodHistory.push({ timestamp: new Date().toISOString(), mood, energy, note });
    if (this.moodHistory.length > this.MAX_HISTORY) this.moodHistory.shift();
  }

  recordAppSwitch(_appName: string): void {
    this.appSwitchTimestamps.push(Date.now());
    if (this.appSwitchTimestamps.length > 50) this.appSwitchTimestamps.shift();
  }

  recordSessionStart(): void { this.sessionStartTime = Date.now(); }
  recordSessionEnd(): void { this.sessionStartTime = undefined; }

  recordBlockedVisit(category: string): void {
    this.blockedVisitCounts[category] = (this.blockedVisitCounts[category] ?? 0) + 1;
  }

  getCurrentMoodState(): MoodState {
    let inferredStress = 0;
    const triggers: string[] = [];

    // 빠른 앱 전환: 2분 내 5회 이상
    const twoMinAgo = Date.now() - 2 * 60 * 1000;
    const recentSwitches = this.appSwitchTimestamps.filter((ts) => ts >= twoMinAgo);
    if (recentSwitches.length > 5) { inferredStress += 30; triggers.push('rapid_app_switching'); }

    // 야간 사용: 22:00-05:00
    const h = new Date().getHours();
    if (h >= 22 || h <= 5) { inferredStress += 20; triggers.push('late_night_usage'); }

    // 강박적 차단 방문: 같은 카테고리 3회 초과
    for (const [cat, count] of Object.entries(this.blockedVisitCounts)) {
      if (count > 3) { inferredStress += 25; triggers.push(`compulsive:${cat}`); break; }
    }

    // 세션 과장: 평균의 2배 초과
    const avgMs = this.computeAvgSessionMs();
    if (this.sessionStartTime && avgMs > 0) {
      const current = Date.now() - this.sessionStartTime;
      if (current > 2 * avgMs) { inferredStress += 20; triggers.push('long_session_spike'); }
    }

    inferredStress = Math.min(inferredStress, 100);

    const riskLevel: RiskLevel =
      inferredStress < 25 ? 'low' :
      inferredStress < 50 ? 'medium' :
      inferredStress < 75 ? 'high' : 'critical';

    const interventionMap: Record<RiskLevel, MoodState['suggestedIntervention']> = {
      low: 'gentle', medium: 'moderate', high: 'firm', critical: 'block',
    };

    return {
      reportedMood: this.getLatestMood()?.mood ?? null,
      inferredStress,
      triggers,
      riskLevel,
      suggestedIntervention: interventionMap[riskLevel],
    };
  }

  getLatestMood(): MoodEntry | null {
    return this.moodHistory.length > 0
      ? this.moodHistory[this.moodHistory.length - 1]
      : null;
  }

  getMoodHistory(days: number): MoodEntry[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.moodHistory.filter((e) => e.timestamp >= cutoff.toISOString());
  }

  private computeAvgSessionMs(): number {
    const ts = this.appSwitchTimestamps;
    if (ts.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < ts.length; i++) total += ts[i] - ts[i - 1];
    return total / (ts.length - 1);
  }
}

export const MoodAnalyzer = MoodAnalyzerClass.getInstance();
