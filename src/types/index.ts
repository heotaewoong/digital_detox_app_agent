// User types
export interface UserProfile {
  id: string;
  name: string;
  dreams: string[];
  goals: Goal[];
  blockedKeywords: KeywordGroup[];
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetDate?: string;
  progress: number; // 0-100
}

export type GoalCategory = 'career' | 'health' | 'education' | 'relationship' | 'creative' | 'financial';

// Keyword types
export interface KeywordGroup {
  id: string;
  name: string;
  category: ContentCategory;
  keywords: string[];
  enabled: boolean;
  riskLevel: RiskLevel;
}

export type ContentCategory = 'gambling' | 'gaming' | 'adult' | 'social_media' | 'shopping' | 'news' | 'custom';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Monitoring types
export interface DetectionEvent {
  id: string;
  timestamp: string;
  appName: string;
  category: ContentCategory;
  matchedKeywords: string[];
  riskScore: number;
  action: 'logged' | 'warned' | 'blocked';
  screenshotUri?: string;
}

export interface MonitoringState {
  isActive: boolean;
  isSimulationMode: boolean;
  totalDetections: number;
  todayDetections: number;
  blockedCount: number;
  lastDetection?: DetectionEvent;
}

// Usage tracking types
export interface UsageRecord {
  date: string;
  appName: string;
  category: ContentCategory;
  durationMinutes: number;
  detectionCount: number;
}

export interface DailyReport {
  date: string;
  totalScreenTime: number; // minutes
  categoryBreakdown: CategoryUsage[];
  detections: DetectionEvent[];
  blockedCount: number;
  savedMinutes: number;
  streak: number;
  aiInsight: string;
  goalProgress: GoalProgress[];
}

export interface CategoryUsage {
  category: ContentCategory;
  minutes: number;
  percentage: number;
  color: string;
}

export interface GoalProgress {
  goalId: string;
  title: string;
  progress: number;
  change: number; // daily change
}

// Motivation types
export interface MotivationContent {
  id: string;
  type: 'text' | 'image' | 'audio';
  content: string; // text or URI
  relatedGoal?: string;
  createdAt: string;
}

// Settings types
export interface AppSettings {
  monitoringEnabled: boolean;
  notificationsEnabled: boolean;
  cooldownSeconds: number;
  blockStrength: 'gentle' | 'moderate' | 'strict';
  dailyReportTime: string; // HH:mm
  theme: 'dark' | 'system';
  language: 'ko' | 'en';
}

// Navigation types
export type TabRoute = 'dashboard' | 'monitor' | 'goals' | 'settings';

// Mood & Context Types
export type MoodType = 'great' | 'good' | 'neutral' | 'stressed' | 'anxious';

export interface MoodEntry {
  timestamp: string;
  mood: MoodType;
  energy: number; // 1-5
  note?: string;
}

export interface MoodState {
  reportedMood: MoodType | null;
  inferredStress: number; // 0-100
  triggers: string[];
  riskLevel: RiskLevel;
  suggestedIntervention: 'gentle' | 'moderate' | 'firm' | 'block';
}

export interface ContentContext {
  appName: string;
  previousApp?: string;
  timeOfDay: number; // 0-23
  sessionDuration: number; // minutes
  consecutiveBlocks: number;
  currentMood?: MoodState;
}

export interface ContextualAnalysis {
  originalRiskScore: number;
  adjustedRiskScore: number;
  contextFactors: string[];
  recommendedAction: 'allow' | 'log' | 'warn' | 'soft_block' | 'hard_block';
  reasoning: string;
}

export interface InterventionStrategy {
  type: 'nudge' | 'reminder' | 'delay' | 'redirect' | 'block';
  intensity: number; // 1-5
  message: string;
  actionLabel: string;
  cooldownSeconds: number;
  showDreamReminder: boolean;
  suggestAlternative?: string;
}

export interface AppTransition {
  from: string;
  to: string;
  timestamp: string;
  wasBlocked: boolean;
}

export interface HabitPattern {
  type: 'improvement' | 'regression' | 'plateau' | 'spike';
  category: string;
  description: string;
  confidence: number;
}

export interface EvasionDetection {
  isEvasion: boolean;
  confidence: number;
  pattern: string;
  fromApp: string;
  toApp: string;
}
