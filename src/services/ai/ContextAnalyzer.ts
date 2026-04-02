import type { ContentContext, ContextualAnalysis, EvasionDetection } from '@/types';

export const APP_SIMILARITY_MAP: Record<string, string[]> = {
  video:    ['YouTube', 'TikTok', 'Instagram', 'Twitch', 'Netflix', '릴스', '숏폼'],
  gaming:   ['배틀그라운드', '프리파이어', '브롤스타즈', '원신', 'Roblox', '마인크래프트'],
  gambling: ['포커', '슬롯', '카지노', '토토', '배팅', '스포츠베팅'],
  social:   ['카카오톡', 'Instagram', 'Facebook', 'Twitter', '트위터', '틱톡'],
  shopping: ['쿠팡', '네이버쇼핑', '11번가', '무신사', '오늘의집', '당근마켓'],
};

const EDUCATIONAL_KEYWORDS = [
  '공부', '학습', '강의', '수업', '교육', '시험', '과제', '논문', '연구',
  'study', 'lecture', 'tutorial', 'course', 'homework', 'research',
];

function getSimilarityGroup(appName: string): string | null {
  for (const [group, apps] of Object.entries(APP_SIMILARITY_MAP)) {
    if (apps.some((a) => appName.toLowerCase().includes(a.toLowerCase()))) return group;
  }
  return null;
}

export function detectEvasion(
  currentApp: string,
  recentApps: Array<{ name: string; timestamp: number }>,
): EvasionDetection {
  const currentGroup = getSimilarityGroup(currentApp);
  if (!currentGroup) {
    return { isEvasion: false, confidence: 0, pattern: 'no_group', fromApp: '', toApp: currentApp };
  }

  const now = Date.now();
  for (const recent of recentApps) {
    const recentGroup = getSimilarityGroup(recent.name);
    if (recentGroup !== currentGroup) continue;
    const gap = (now - recent.timestamp) / 1000;
    const confidence = gap < 60 ? 1.0 : gap < 120 ? 0.7 : 0;
    if (confidence > 0) {
      return {
        isEvasion: true, confidence,
        pattern: `same_category:${currentGroup}`,
        fromApp: recent.name, toApp: currentApp,
      };
    }
  }
  return { isEvasion: false, confidence: 0, pattern: 'none', fromApp: '', toApp: currentApp };
}

export function analyzeWithContext(
  text: string,
  baseRiskScore: number,
  context: ContentContext,
): ContextualAnalysis {
  let score = baseRiskScore;
  const factors: string[] = [];
  const reasons: string[] = [];

  // 1. 연속 차단 에스컬레이션
  if (context.consecutiveBlocks >= 3) {
    score *= 1.25; factors.push('consecutive_blocks');
    reasons.push(`연속 ${context.consecutiveBlocks}회 차단 → +25%`);
  }

  // 2. 유사 앱 우회 감지
  if (context.previousApp) {
    const ev = detectEvasion(context.appName, [
      { name: context.previousApp, timestamp: Date.now() - 30_000 },
    ]);
    if (ev.isEvasion) {
      score *= 1.30; factors.push('evasion_detected');
      reasons.push(`${context.previousApp} → ${context.appName} 우회 감지 → +30%`);
    }
  }

  // 3. 야간 엔터테인먼트/게임
  const LATE = [22, 23, 0, 1, 2, 3, 4];
  const appGroup = getSimilarityGroup(context.appName);
  if (LATE.includes(context.timeOfDay) && (appGroup === 'video' || appGroup === 'gaming')) {
    score *= 1.20; factors.push('late_night');
    reasons.push(`심야 ${context.timeOfDay}시 엔터테인먼트 → +20%`);
  }

  // 4. 스트레스 상태
  if (context.currentMood && context.currentMood.inferredStress > 60) {
    score *= 1.25; factors.push('high_stress');
    reasons.push(`스트레스 ${context.currentMood.inferredStress} → +25%`);
  }

  // 5. 교육 키워드 오탐 방지
  const lower = text.toLowerCase();
  if (EDUCATIONAL_KEYWORDS.some((k) => lower.includes(k))) {
    score *= 0.85; factors.push('educational_content');
    reasons.push('교육 키워드 감지 → -15%');
  }

  score = Math.min(Math.max(score, 0), 100);

  const recommendedAction: ContextualAnalysis['recommendedAction'] =
    score < 30 ? 'allow' :
    score < 50 ? 'log' :
    score < 65 ? 'warn' :
    score < 80 ? 'soft_block' : 'hard_block';

  return {
    originalRiskScore: baseRiskScore,
    adjustedRiskScore: Math.round(score * 10) / 10,
    contextFactors: factors,
    recommendedAction,
    reasoning: reasons.length > 0
      ? `기본 ${Math.round(baseRiskScore)} → ${reasons.join('; ')} → 최종 ${Math.round(score)}`
      : `문맥 조정 없음. 기본 위험도 ${Math.round(baseRiskScore)} 유지.`,
  };
}
