import { ContentCategory, KeywordGroup, RiskLevel } from '@/types';

export const APP_NAME = 'AI Content Guardian';
export const APP_VERSION = '1.0.0';

export const COOLDOWN_OPTIONS = [
  { label: '10초', value: 10 },
  { label: '30초', value: 30 },
  { label: '1분', value: 60 },
  { label: '5분', value: 300 },
];

export const BLOCK_STRENGTH_OPTIONS = [
  { label: '부드러움', value: 'gentle' as const, description: '알림만 표시' },
  { label: '보통', value: 'moderate' as const, description: '차단 + 10초 쿨다운' },
  { label: '엄격', value: 'strict' as const, description: '차단 + 60초 쿨다운' },
];

export const DEFAULT_KEYWORD_GROUPS: KeywordGroup[] = [
  {
    id: 'gambling',
    name: '도박/베팅',
    category: 'gambling',
    keywords: ['카지노', '슬롯', '베팅', '도박', '바카라', '포커', '토토', '배팅', 'casino', 'gambling', 'slot', 'betting'],
    enabled: true,
    riskLevel: 'critical',
  },
  {
    id: 'gaming',
    name: '게임 중독',
    category: 'gaming',
    keywords: ['가챠', '뽑기', '과금', '아이템 구매', '보석 충전', '다이아 충전', 'gacha', 'loot box'],
    enabled: true,
    riskLevel: 'high',
  },
  {
    id: 'adult',
    name: '성인 콘텐츠',
    category: 'adult',
    keywords: ['야동', '포르노', '성인사이트', 'xxx', 'porn', 'nsfw'],
    enabled: true,
    riskLevel: 'critical',
  },
  {
    id: 'social_media',
    name: '소셜 미디어 과다',
    category: 'social_media',
    keywords: ['숏츠', '릴스', '틱톡', '피드 새로고침', 'shorts', 'reels', 'tiktok', 'infinite scroll'],
    enabled: false,
    riskLevel: 'medium',
  },
  {
    id: 'shopping',
    name: '충동 쇼핑',
    category: 'shopping',
    keywords: ['타임세일', '플래시딜', '한정판매', '오늘만', '최저가', 'flash sale', 'limited time'],
    enabled: false,
    riskLevel: 'low',
  },
];

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  gambling: '도박/베팅',
  gaming: '게임',
  adult: '성인',
  social_media: '소셜 미디어',
  shopping: '쇼핑',
  news: '뉴스',
  custom: '사용자 정의',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '위험',
};

export const GOAL_CATEGORY_LABELS = {
  career: { label: '커리어', icon: 'briefcase' },
  health: { label: '건강', icon: 'heart' },
  education: { label: '교육', icon: 'book' },
  relationship: { label: '관계', icon: 'people' },
  creative: { label: '창작', icon: 'color-palette' },
  financial: { label: '재무', icon: 'cash' },
};

export const SIMULATION_APPS = [
  'YouTube', 'Chrome', 'Safari', 'Instagram', 'TikTok', 'Twitter',
  'Facebook', '네이버', '카카오톡', 'Discord', '쿠팡', '배달의민족',
];
