// User types
export interface UserProfile {
  id: string;
  name: string;
  dreams: string[];
  goals: Goal[];
  blockedKeywords: KeywordGroup[];
  blockedApps: BlockedApp[];
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

// Blocked App types
export interface BlockedApp {
  id: string;
  name: string;
  packageName: string; // e.g. com.instagram.android
  icon?: string;
  category: ContentCategory;
  isBlocked: boolean;
  scheduleStart?: string; // HH:mm
  scheduleEnd?: string;   // HH:mm
  scheduleDays?: number[]; // 0=Sun...6=Sat
  dailyLimitMinutes?: number;
  usedMinutesToday?: number;
}

export interface BlockSchedule {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  days: number[];    // 0=Sun, 1=Mon, ...6=Sat
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
export type TabRoute = 'dashboard' | 'monitor' | 'blocking' | 'goals' | 'settings';

// Focus Session types (Forest/Opal 벤치마킹)
export interface FocusSession {
  id: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  targetMinutes: number;
  completed: boolean;
  treeType: TreeType;
  coinsEarned: number;
}

export type TreeType = 'pine' | 'oak' | 'cherry' | 'bamboo' | 'maple' | 'ginkgo' | 'palm' | 'cactus';

export interface TreeInfo {
  type: TreeType;
  name: string;
  emoji: string;
  cost: number;
  unlocked: boolean;
}

// Achievement/Reward types
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  unlockedAt?: string;
}

export interface AchievementCondition {
  type: 'streak' | 'sessions' | 'blocked' | 'saved_time' | 'trees';
  target: number;
}

// Usage Analytics types (Opal 벤치마킹)
export interface UsageAnalytics {
  date: string;
  totalScreenTime: number;
  pickupCount: number;
  focusScore: number; // 0-100
  longestFocusStreak: number; // minutes
  appUsage: AppUsageEntry[];
  hourlyUsage: number[]; // 24 entries, minutes per hour
}

export interface AppUsageEntry {
  appName: string;
  minutes: number;
  category: 'productive' | 'distracting' | 'neutral';
  pickups: number;
}

// Schedule types
export interface ScheduleBlockRule {
  id: string;
  name: string;
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  days: number[];    // 0=Sun, 1=Mon, ...6=Sat
  blockedApps: string[]; // app ids
  blockedKeywordGroups: string[]; // group ids
}

// ─── AI Content Classification (Rize 벤치마킹) ───
export type ContentClassLabel =
  | 'study'        // 공부/학습
  | 'work'         // 업무/생산성
  | 'entertainment'// 엔터테인먼트
  | 'gaming'       // 게임
  | 'social'       // 소셜/커뮤니케이션
  | 'shopping'     // 쇼핑
  | 'news'         // 뉴스/정보
  | 'health'       // 건강/운동
  | 'adult'        // 성인
  | 'gambling'     // 도박
  | 'other';       // 기타

export interface SiteVisit {
  id: string;
  url: string;
  domain: string;
  title: string;
  classLabel: ContentClassLabel;
  confidence: number; // 0-1
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  appSource: string; // 어떤 앱에서 접속했는지 (Chrome, 카카오톡 등)
  isBlocked: boolean;
}

export interface SiteStats {
  domain: string;
  totalMinutes: number;
  visitCount: number;
  classLabel: ContentClassLabel;
  lastVisit: string;
}

export interface CategoryTimeStats {
  label: ContentClassLabel;
  displayName: string;
  emoji: string;
  totalMinutes: number;
  percentage: number;
  color: string;
  isProductive: boolean;
}

// ─── URL/Site Blocking (BlockP 벤치마킹) ───
export interface BlockedSite {
  id: string;
  url: string;       // URL 패턴 (도메인 또는 전체 URL)
  reason: string;
  category: ContentCategory;
  enabled: boolean;
  addedAt: string;
}

export interface URLBlockRule {
  id: string;
  pattern: string;   // regex 또는 glob 패턴
  type: 'domain' | 'url' | 'keyword_in_url';
  enabled: boolean;
}

// ─── Floating Widget (YourHour 벤치마킹) ───
export interface FloatingWidgetConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showScreenTime: boolean;
  showPickupCount: boolean;
  showBlockedCount: boolean;
  opacity: number; // 0.3 - 1.0
  colorMode: 'auto' | 'green' | 'yellow' | 'red'; // auto = changes based on usage
  limitWarningMinutes: number; // 색상 변경 기준 시간
}

// ─── KakaoTalk Bypass Prevention ───
export interface BypassRule {
  id: string;
  appName: string;
  packageName: string;
  bypassType: 'in_app_browser' | 'link_redirect' | 'webview';
  enabled: boolean;
  description: string;
}

// ─── Mood & Context-Aware Blocking ───
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
