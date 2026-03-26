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
