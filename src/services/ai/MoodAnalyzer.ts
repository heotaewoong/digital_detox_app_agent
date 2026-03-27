import { ContentCategory, RiskLevel } from '@/types';

// ── Types ────────────────────────────────────────────────────────────

export type Mood = 'great' | 'good' | 'neutral' | 'stressed' | 'anxious';

export interface MoodEntry {
  timestamp: string;
  mood: Mood;
  energy: number; // 1-5
  note?: string;
}

export type MoodRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type SuggestedIntervention = 'gentle' | 'moderate' | 'firm' | 'block';

export interface MoodState {
  reportedMood: Mood | null;
  inferredStress: number; // 0-100
  triggers: string[];
  riskLevel: MoodRiskLevel;
  suggestedIntervention: SuggestedIntervention;
}

// ── Internal tracking types ──────────────────────────────────────────

interface AppSwitchRecord {
  appName: string;
  timestamp: number;
}

interface SessionRecord {
  startTime: number;
  endTime?: number;
}

interface BlockedVisitRecord {
  category: ContentCategory;
  timestamp: number;
}

// ── Constants ────────────────────────────────────────────────────────

const MAX_MOOD_HISTORY = 100;
const RAPID_SWITCH_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const RAPID_SWITCH_THRESHOLD = 5;
const LATE_NIGHT_START_HOUR = 23; // 11 PM
const LATE_NIGHT_END_HOUR = 5;   // 5 AM
const COMPULSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const COMPULSION_THRESHOLD = 3;
const SESSION_SPIKE_MULTIPLIER = 1.5;

/**
 * Mood and stress detection service (singleton).
 *
 * Tracks mood through periodic self-check-ins and infers stress level
 * from behavioural signals such as rapid app switching, late-night usage,
 * repeated visits to blocked categories, and session duration spikes.
 */
export class MoodAnalyzer {
  private static instance: MoodAnalyzer | null = null;

  private moodHistory: MoodEntry[] = [];
  private appSwitches: AppSwitchRecord[] = [];
  private sessions: SessionRecord[] = [];
  private blockedVisits: BlockedVisitRecord[] = [];
  private currentSessionStart: number | null = null;

  private constructor() {}

  static getInstance(): MoodAnalyzer {
    if (!MoodAnalyzer.instance) {
      MoodAnalyzer.instance = new MoodAnalyzer();
    }
    return MoodAnalyzer.instance;
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Records a user-initiated mood check-in.
   */
  addMoodCheckIn(mood: Mood, energy: number, note?: string): void {
    const entry: MoodEntry = {
      timestamp: new Date().toISOString(),
      mood,
      energy: Math.max(1, Math.min(5, Math.round(energy))),
      note,
    };

    this.moodHistory.unshift(entry);
    if (this.moodHistory.length > MAX_MOOD_HISTORY) {
      this.moodHistory.pop();
    }
  }

  /**
   * Records an app switch event (used to detect rapid switching).
   */
  recordAppSwitch(appName: string): void {
    this.appSwitches.push({ appName, timestamp: Date.now() });
    // Keep only the last 2-minute window worth of switches plus a small buffer
    this.pruneAppSwitches();
  }

  /**
   * Records the start of a usage session.
   */
  recordSessionStart(): void {
    this.currentSessionStart = Date.now();
  }

  /**
   * Records the end of a usage session and stores the completed session.
   */
  recordSessionEnd(): void {
    if (this.currentSessionStart !== null) {
      this.sessions.push({
        startTime: this.currentSessionStart,
        endTime: Date.now(),
      });
      this.currentSessionStart = null;
    }
  }

  /**
   * Records a visit to a blocked content category (called externally
   * when a detection event occurs).
   */
  recordBlockedVisit(category: ContentCategory): void {
    this.blockedVisits.push({ category, timestamp: Date.now() });
  }

  /**
   * Returns the current combined mood state derived from the latest
   * self-report and all behavioural signals.
   */
  getCurrentMoodState(): MoodState {
    const triggers: string[] = [];
    let inferredStress = 0;

    // 1. Rapid app switching
    const rapidSwitchScore = this.detectRapidSwitching();
    if (rapidSwitchScore > 0) {
      inferredStress += rapidSwitchScore;
      triggers.push('rapid_app_switching');
    }

    // 2. Late-night usage
    if (this.isLateNight()) {
      inferredStress += 20;
      triggers.push('late_night_usage');
    }

    // 3. Repeated visits to same blocked category (compulsion)
    const compulsionScore = this.detectCompulsion();
    if (compulsionScore > 0) {
      inferredStress += compulsionScore;
      triggers.push('compulsive_blocked_visits');
    }

    // 4. Session duration spike vs average
    const spikeScore = this.detectSessionSpike();
    if (spikeScore > 0) {
      inferredStress += spikeScore;
      triggers.push('session_duration_spike');
    }

    // 5. Incorporate self-reported mood
    const latestMood = this.getLatestMood();
    if (latestMood) {
      inferredStress += this.moodToStressBonus(latestMood.mood, latestMood.energy);
    }

    inferredStress = Math.min(100, Math.max(0, inferredStress));

    const riskLevel = this.stressToRiskLevel(inferredStress);
    const suggestedIntervention = this.riskToIntervention(riskLevel);

    return {
      reportedMood: latestMood?.mood ?? null,
      inferredStress,
      triggers,
      riskLevel,
      suggestedIntervention,
    };
  }

  /**
   * Returns a readonly copy of the mood history.
   */
  getMoodHistory(): readonly MoodEntry[] {
    return this.moodHistory;
  }

  // ── Behavioural signal detectors ─────────────────────────────────

  /**
   * Detects rapid app switching (>5 switches in 2 min).
   * Returns a stress contribution score (0 or 30).
   */
  private detectRapidSwitching(): number {
    const now = Date.now();
    const recentSwitches = this.appSwitches.filter(
      (s) => now - s.timestamp <= RAPID_SWITCH_WINDOW_MS,
    );
    return recentSwitches.length > RAPID_SWITCH_THRESHOLD ? 30 : 0;
  }

  /**
   * Checks whether the current time is in the late-night window (11 PM - 5 AM).
   */
  private isLateNight(): boolean {
    const hour = new Date().getHours();
    return hour >= LATE_NIGHT_START_HOUR || hour < LATE_NIGHT_END_HOUR;
  }

  /**
   * Detects compulsive behaviour: same blocked category visited 3+ times
   * within the last 30 minutes.
   * Returns a stress contribution score (0 or 25).
   */
  private detectCompulsion(): number {
    const now = Date.now();
    const recentVisits = this.blockedVisits.filter(
      (v) => now - v.timestamp <= COMPULSION_WINDOW_MS,
    );

    const categoryCounts = new Map<ContentCategory, number>();
    for (const visit of recentVisits) {
      categoryCounts.set(visit.category, (categoryCounts.get(visit.category) || 0) + 1);
    }

    for (const count of categoryCounts.values()) {
      if (count >= COMPULSION_THRESHOLD) {
        return 25;
      }
    }
    return 0;
  }

  /**
   * Detects whether the current session duration is significantly above
   * the rolling average.
   * Returns a stress contribution score (0 or 20).
   */
  private detectSessionSpike(): number {
    if (this.currentSessionStart === null || this.sessions.length < 2) {
      return 0;
    }

    const currentDuration = Date.now() - this.currentSessionStart;
    const completedDurations = this.sessions
      .filter((s) => s.endTime !== undefined)
      .map((s) => s.endTime! - s.startTime);

    if (completedDurations.length === 0) return 0;

    const average =
      completedDurations.reduce((sum, d) => sum + d, 0) / completedDurations.length;

    return currentDuration > average * SESSION_SPIKE_MULTIPLIER ? 20 : 0;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private getLatestMood(): MoodEntry | null {
    return this.moodHistory.length > 0 ? this.moodHistory[0] : null;
  }

  /**
   * Converts a self-reported mood + energy into an additional stress score.
   */
  private moodToStressBonus(mood: Mood, energy: number): number {
    const moodScores: Record<Mood, number> = {
      great: -10,
      good: -5,
      neutral: 0,
      stressed: 15,
      anxious: 20,
    };

    // Low energy adds stress; high energy reduces it slightly
    const energyModifier = (3 - energy) * 3; // energy 1 → +6, energy 5 → -6

    return moodScores[mood] + energyModifier;
  }

  private stressToRiskLevel(stress: number): MoodRiskLevel {
    if (stress >= 75) return 'critical';
    if (stress >= 50) return 'high';
    if (stress >= 25) return 'medium';
    return 'low';
  }

  private riskToIntervention(risk: MoodRiskLevel): SuggestedIntervention {
    switch (risk) {
      case 'critical':
        return 'block';
      case 'high':
        return 'firm';
      case 'medium':
        return 'moderate';
      case 'low':
        return 'gentle';
    }
  }

  private pruneAppSwitches(): void {
    const cutoff = Date.now() - RAPID_SWITCH_WINDOW_MS * 2;
    this.appSwitches = this.appSwitches.filter((s) => s.timestamp > cutoff);
  }
}
