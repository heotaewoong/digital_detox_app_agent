import { ContentClassLabel, SiteVisit, CategoryTimeStats } from '@/types';

/**
 * AI 콘텐츠 분류기 (Rize 벤치마킹)
 * URL, 페이지 제목, 콘텐츠를 분석하여 카테고리를 자동 분류합니다.
 * 유튜브 영상도 게임/공부/엔터테인먼트 등으로 세분화합니다.
 */

interface ClassificationRule {
  patterns: RegExp[];
  label: ContentClassLabel;
  confidence: number;
}

// 도메인 기반 분류 규칙
const DOMAIN_RULES: ClassificationRule[] = [
  // 공부/학습
  { patterns: [/coursera\.org/i, /udemy\.com/i, /edx\.org/i, /khan\.academy/i, /leetcode\.com/i,
    /hackerrank\.com/i, /stackoverflow\.com/i, /github\.com/i, /notion\.so/i, /scholar\.google/i,
    /wikipedia\.org/i, /docs\.google\.com/i, /drive\.google\.com/i], label: 'study', confidence: 0.9 },
  // 업무/생산성
  { patterns: [/slack\.com/i, /trello\.com/i, /jira\.atlassian/i, /figma\.com/i, /canva\.com/i,
    /zoom\.us/i, /meet\.google/i, /calendar\.google/i, /mail\.google/i, /outlook\.com/i],
    label: 'work', confidence: 0.85 },
  // 게임
  { patterns: [/twitch\.tv/i, /steampowered\.com/i, /op\.gg/i, /fmkorea\.com/i, /inven\.co\.kr/i,
    /dcinside\.com.*게임/i, /nexon\.com/i, /netmarble\.com/i, /plaync\.com/i, /riotgames\.com/i],
    label: 'gaming', confidence: 0.9 },
  // 소셜
  { patterns: [/instagram\.com/i, /facebook\.com/i, /twitter\.com/i, /x\.com/i, /tiktok\.com/i,
    /reddit\.com/i, /threads\.net/i, /snapchat\.com/i], label: 'social', confidence: 0.9 },
  // 쇼핑
  { patterns: [/coupang\.com/i, /gmarket\.co\.kr/i, /11st\.co\.kr/i, /amazon\.com/i,
    /aliexpress\.com/i, /musinsa\.com/i, /zigzag\.kr/i, /ohouse\.com/i, /baemin\.com/i,
    /yogiyo\.co\.kr/i], label: 'shopping', confidence: 0.9 },
  // 뉴스
  { patterns: [/naver\.com\/news/i, /news\.naver/i, /chosun\.com/i, /joongang\.co\.kr/i,
    /donga\.com/i, /hani\.co\.kr/i, /bbc\.com/i, /cnn\.com/i], label: 'news', confidence: 0.85 },
  // 건강
  { patterns: [/nike\.com\/run/i, /strava\.com/i, /myfitnesspal/i, /healthline\.com/i],
    label: 'health', confidence: 0.85 },
  // 도박
  { patterns: [/bet365/i, /casino/i, /poker/i, /토토/i, /배팅/i], label: 'gambling', confidence: 0.95 },
  // 성인
  { patterns: [/porn/i, /xxx/i, /adult/i, /nsfw/i], label: 'adult', confidence: 0.95 },
];

// 유튜브 영상 제목 기반 분류 규칙
const YOUTUBE_TITLE_RULES: ClassificationRule[] = [
  // 공부/학습
  { patterns: [/강의/i, /tutorial/i, /lecture/i, /course/i, /배우기/i, /공부/i, /설명/i,
    /코딩/i, /프로그래밍/i, /알고리즘/i, /수학/i, /영어/i, /과학/i, /역사/i, /문법/i,
    /react/i, /python/i, /javascript/i, /java\b/i, /개발/i, /입문/i, /기초/i, /심화/i,
    /수능/i, /토익/i, /토플/i, /IELTS/i, /자격증/i, /시험/i, /정리/i, /요약/i],
    label: 'study', confidence: 0.85 },
  // 게임
  { patterns: [/게임/i, /gaming/i, /gameplay/i, /walkthrough/i, /롤\b/i, /LOL/i, /발로란트/i,
    /오버워치/i, /마인크래프트/i, /minecraft/i, /fortnite/i, /포트나이트/i, /배그/i, /PUBG/i,
    /스타크래프트/i, /리그오브레전드/i, /피파/i, /FIFA/i, /e스포츠/i, /esports/i, /챔피언/i,
    /패치노트/i, /공략/i, /가이드.*게임/i, /게임.*가이드/i, /플레이/i, /실황/i, /방송.*게임/i],
    label: 'gaming', confidence: 0.85 },
  // 엔터테인먼트
  { patterns: [/vlog/i, /브이로그/i, /먹방/i, /mukbang/i, /ASMR/i, /reaction/i, /리액션/i,
    /드라마/i, /예능/i, /웃긴/i, /funny/i, /meme/i, /밈/i, /shorts/i, /숏츠/i, /챌린지/i,
    /challenge/i, /음악/i, /music/i, /MV/i, /뮤직비디오/i, /노래/i, /커버/i, /cover/i,
    /댄스/i, /dance/i, /영화/i, /movie/i, /리뷰.*영화/i, /애니/i, /anime/i],
    label: 'entertainment', confidence: 0.8 },
  // 뉴스/정보
  { patterns: [/뉴스/i, /news/i, /시사/i, /이슈/i, /분석/i, /해설/i, /다큐/i, /documentary/i,
    /경제/i, /정치/i, /사회/i, /국제/i], label: 'news', confidence: 0.8 },
  // 건강/운동
  { patterns: [/운동/i, /workout/i, /exercise/i, /fitness/i, /헬스/i, /요가/i, /yoga/i,
    /스트레칭/i, /다이어트/i, /diet/i, /홈트/i, /루틴/i], label: 'health', confidence: 0.85 },
  // 쇼핑/리뷰
  { patterns: [/언박싱/i, /unboxing/i, /리뷰.*제품/i, /제품.*리뷰/i, /하울/i, /haul/i,
    /쇼핑/i, /구매/i, /추천.*템/i, /가성비/i, /비교/i], label: 'shopping', confidence: 0.75 },
  // 도박 (유튜브에서도 감지)
  { patterns: [/카지노/i, /슬롯/i, /도박/i, /베팅/i, /바카라/i, /토토/i, /배당/i],
    label: 'gambling', confidence: 0.9 },
];

// 카카오톡 우회 감지 패턴
const KAKAO_BYPASS_PATTERNS = [
  /m\.search\.naver\.com/i,    // 카톡 내 네이버 검색
  /link\.kakaotalk/i,          // 카카오 링크
  /open\.kakao\.com/i,         // 오픈채팅 링크
  /pf\.kakao\.com/i,           // 카카오 플러스친구
  /story\.kakao\.com/i,        // 카카오스토리
  /tv\.kakao\.com/i,           // 카카오TV
  /brunch\.co\.kr/i,           // 브런치
];

export const CATEGORY_DISPLAY: Record<ContentClassLabel, { name: string; emoji: string; color: string; isProductive: boolean }> = {
  study:         { name: '공부/학습', emoji: '📚', color: '#10B981', isProductive: true },
  work:          { name: '업무/생산성', emoji: '💼', color: '#3B82F6', isProductive: true },
  entertainment: { name: '엔터테인먼트', emoji: '🎬', color: '#F97316', isProductive: false },
  gaming:        { name: '게임', emoji: '🎮', color: '#EF4444', isProductive: false },
  social:        { name: '소셜/SNS', emoji: '📱', color: '#EC4899', isProductive: false },
  shopping:      { name: '쇼핑', emoji: '🛒', color: '#FBBF24', isProductive: false },
  news:          { name: '뉴스/정보', emoji: '📰', color: '#6366F1', isProductive: true },
  health:        { name: '건강/운동', emoji: '💪', color: '#14B8A6', isProductive: true },
  adult:         { name: '성인', emoji: '🔞', color: '#DC2626', isProductive: false },
  gambling:      { name: '도박', emoji: '🎰', color: '#B91C1C', isProductive: false },
  other:         { name: '기타', emoji: '📄', color: '#6B7280', isProductive: false },
};

export class AIContentClassifier {
  /**
   * URL과 제목을 기반으로 콘텐츠를 분류합니다.
   */
  static classify(url: string, title: string = ''): { label: ContentClassLabel; confidence: number } {
    // 1. 유튜브 특별 처리 - 영상 제목으로 세분화
    if (this.isYouTube(url)) {
      return this.classifyYouTube(title);
    }

    // 2. 도메인 기반 분류
    const domainResult = this.classifyByDomain(url);
    if (domainResult.confidence > 0.7) return domainResult;

    // 3. 제목 기반 분류 (fallback)
    const titleResult = this.classifyByTitle(title);
    if (titleResult.confidence > 0.6) return titleResult;

    return { label: 'other', confidence: 0.3 };
  }

  /**
   * 유튜브 URL인지 확인
   */
  static isYouTube(url: string): boolean {
    return /youtube\.com|youtu\.be|m\.youtube/i.test(url);
  }

  /**
   * 유튜브 영상을 제목 기반으로 세분화 분류
   */
  static classifyYouTube(title: string): { label: ContentClassLabel; confidence: number } {
    if (!title) return { label: 'entertainment', confidence: 0.5 };

    for (const rule of YOUTUBE_TITLE_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(title)) {
          return { label: rule.label, confidence: rule.confidence };
        }
      }
    }

    // 유튜브 기본값은 엔터테인먼트
    return { label: 'entertainment', confidence: 0.6 };
  }

  /**
   * 도메인 기반 분류
   */
  private static classifyByDomain(url: string): { label: ContentClassLabel; confidence: number } {
    for (const rule of DOMAIN_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(url)) {
          return { label: rule.label, confidence: rule.confidence };
        }
      }
    }
    return { label: 'other', confidence: 0.2 };
  }

  /**
   * 제목/텍스트 기반 분류
   */
  private static classifyByTitle(title: string): { label: ContentClassLabel; confidence: number } {
    if (!title) return { label: 'other', confidence: 0.1 };

    const allRules = [...YOUTUBE_TITLE_RULES, ...DOMAIN_RULES];
    for (const rule of allRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(title)) {
          return { label: rule.label, confidence: rule.confidence * 0.8 };
        }
      }
    }
    return { label: 'other', confidence: 0.2 };
  }

  /**
   * 카카오톡 우회 접속인지 감지
   */
  static isKakaoBypass(url: string, sourceApp: string): boolean {
    if (sourceApp.toLowerCase().includes('kakao')) {
      // 카카오톡에서 외부 링크로 이동하는 경우
      for (const pattern of KAKAO_BYPASS_PATTERNS) {
        if (pattern.test(url)) return true;
      }
      // 카카오톡 내 브라우저로 일반 웹사이트 접속
      if (/^https?:\/\//i.test(url) && !url.includes('kakao')) {
        return true;
      }
    }
    return false;
  }

  /**
   * URL이 차단 대상인지 확인 (BlockP 벤치마킹 - 키워드 in URL)
   */
  static shouldBlockURL(url: string, blockedKeywords: string[], blockedDomains: string[]): {
    blocked: boolean;
    reason: string;
    matchedPattern: string;
  } {
    const lowerUrl = url.toLowerCase();

    // 도메인 차단 체크
    for (const domain of blockedDomains) {
      if (lowerUrl.includes(domain.toLowerCase())) {
        return { blocked: true, reason: '차단된 사이트', matchedPattern: domain };
      }
    }

    // URL 내 키워드 차단 체크
    for (const keyword of blockedKeywords) {
      if (lowerUrl.includes(keyword.toLowerCase())) {
        return { blocked: true, reason: 'URL 키워드 감지', matchedPattern: keyword };
      }
    }

    return { blocked: false, reason: '', matchedPattern: '' };
  }

  /**
   * 카테고리별 시간 통계 생성
   */
  static generateCategoryStats(visits: SiteVisit[]): CategoryTimeStats[] {
    const categoryMap = new Map<ContentClassLabel, number>();
    let totalMinutes = 0;

    for (const visit of visits) {
      const minutes = visit.durationSeconds / 60;
      categoryMap.set(visit.classLabel, (categoryMap.get(visit.classLabel) || 0) + minutes);
      totalMinutes += minutes;
    }

    const stats: CategoryTimeStats[] = [];
    for (const [label, minutes] of categoryMap) {
      const display = CATEGORY_DISPLAY[label];
      stats.push({
        label,
        displayName: display.name,
        emoji: display.emoji,
        totalMinutes: Math.round(minutes),
        percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
        color: display.color,
        isProductive: display.isProductive,
      });
    }

    return stats.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }
}
