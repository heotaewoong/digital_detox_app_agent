import { ContentCategory, DetectionEvent, KeywordGroup } from '@/types';
import { KeywordDetector, DetectionResult } from './KeywordDetector';
import { AIContentClassifier } from '../ai/ContentClassifier';

/**
 * BlockP 벤치마킹 - 실시간 콘텐츠 스캐너
 * 
 * 페이지 콘텐츠를 실시간으로 스캔하여 키워드를 감지합니다.
 * URL + 페이지 제목 + 페이지 본문 텍스트를 모두 분석합니다.
 * 카카오톡 내 브라우저 우회도 감지합니다.
 */

interface ScanResult {
  isBlocked: boolean;
  reason: string;
  matchedKeywords: string[];
  riskScore: number;
  category: ContentCategory;
  source: 'keyword' | 'url' | 'content' | 'app_block' | 'bypass';
  bypassApp?: string;
}

interface PageContent {
  url: string;
  title: string;
  bodyText: string;
  sourceApp: string;
}

// 카카오톡 우회 감지 패턴 (강화)
const BYPASS_PATTERNS: { app: string; patterns: RegExp[] }[] = [
  {
    app: '카카오톡',
    patterns: [
      /kakaocdn\.net/i,
      /talk\.kakao\.com/i,
      /open\.kakao\.com/i,
      /pf\.kakao\.com/i,
      /link\.kakaotalk/i,
      // 카카오톡 내장 브라우저 User-Agent 패턴
      /KAKAOTALK/i,
    ],
  },
  {
    app: '네이버',
    patterns: [
      /m\.search\.naver\.com/i,
      /naver\.me/i,
      /in-app.*naver/i,
    ],
  },
  {
    app: '인스타그램',
    patterns: [
      /l\.instagram\.com/i,
      /instagram.*redirect/i,
    ],
  },
];

// URL 내 위험 키워드 패턴
const URL_DANGER_PATTERNS: { pattern: RegExp; category: ContentCategory; risk: number }[] = [
  { pattern: /casino|gambling|bet365|poker|slot/i, category: 'gambling', risk: 95 },
  { pattern: /porn|xxx|adult|nsfw|hentai/i, category: 'adult', risk: 95 },
  { pattern: /토토|배팅|카지노|바카라/i, category: 'gambling', risk: 95 },
  { pattern: /야동|포르노|성인/i, category: 'adult', risk: 95 },
];

export class RealtimeContentScanner {
  private keywordDetector: KeywordDetector;
  private blockedDomains: string[];
  private scanHistory: ScanResult[];
  private scanCount: number;
  private blockCount: number;

  constructor(keywordGroups: KeywordGroup[], blockedDomains: string[] = []) {
    this.keywordDetector = new KeywordDetector(keywordGroups);
    this.blockedDomains = blockedDomains;
    this.scanHistory = [];
    this.scanCount = 0;
    this.blockCount = 0;
  }

  /**
   * 페이지 콘텐츠를 종합적으로 스캔합니다.
   * 1. URL 위험 패턴 체크
   * 2. 도메인 차단 목록 체크
   * 3. 카카오톡/네이버/인스타 우회 감지
   * 4. 페이지 제목 키워드 스캔
   * 5. 페이지 본문 키워드 스캔
   * 6. AI 콘텐츠 분류
   */
  scanPage(page: PageContent): ScanResult {
    this.scanCount++;

    // 1. URL 위험 패턴
    for (const dp of URL_DANGER_PATTERNS) {
      if (dp.pattern.test(page.url)) {
        const result: ScanResult = {
          isBlocked: true,
          reason: `위험 URL 감지: ${dp.category}`,
          matchedKeywords: [page.url],
          riskScore: dp.risk,
          category: dp.category,
          source: 'url',
        };
        this.recordResult(result);
        return result;
      }
    }

    // 2. 도메인 차단
    const domain = this.extractDomain(page.url);
    if (this.blockedDomains.some((d) => domain.includes(d.toLowerCase()))) {
      const result: ScanResult = {
        isBlocked: true,
        reason: `차단된 사이트: ${domain}`,
        matchedKeywords: [domain],
        riskScore: 90,
        category: 'custom',
        source: 'url',
      };
      this.recordResult(result);
      return result;
    }

    // 3. 카카오톡 우회 감지
    for (const bp of BYPASS_PATTERNS) {
      if (page.sourceApp.includes(bp.app) || bp.patterns.some((p) => p.test(page.url))) {
        // 카카오톡에서 외부 사이트 접속 시 추가 검사
        const externalCheck = this.scanText(page.title + ' ' + page.bodyText);
        if (externalCheck.length > 0) {
          const result: ScanResult = {
            isBlocked: true,
            reason: `${bp.app} 우회 접속 + 키워드 감지`,
            matchedKeywords: externalCheck.map((m) => m.keyword),
            riskScore: 85,
            category: externalCheck[0].category,
            source: 'bypass',
            bypassApp: bp.app,
          };
          this.recordResult(result);
          return result;
        }
      }
    }

    // 4. 제목 키워드 스캔
    const titleMatches = this.scanText(page.title);
    if (titleMatches.length > 0) {
      const riskScore = this.keywordDetector.getRiskScore(titleMatches);
      if (riskScore >= 50) {
        const result: ScanResult = {
          isBlocked: true,
          reason: '페이지 제목에서 차단 키워드 감지',
          matchedKeywords: titleMatches.map((m) => m.keyword),
          riskScore,
          category: titleMatches[0].category,
          source: 'content',
        };
        this.recordResult(result);
        return result;
      }
    }

    // 5. 본문 키워드 스캔
    const bodyMatches = this.scanText(page.bodyText);
    if (bodyMatches.length > 0) {
      const riskScore = this.keywordDetector.getRiskScore(bodyMatches);
      if (riskScore >= 50) {
        const result: ScanResult = {
          isBlocked: true,
          reason: '페이지 콘텐츠에서 차단 키워드 감지',
          matchedKeywords: [...new Set(bodyMatches.map((m) => m.keyword))],
          riskScore,
          category: bodyMatches[0].category,
          source: 'content',
        };
        this.recordResult(result);
        return result;
      }
    }

    // 6. AI 분류 (차단은 아니지만 분류 정보 제공)
    const classification = AIContentClassifier.classify(page.url, page.title);

    return {
      isBlocked: false,
      reason: '',
      matchedKeywords: [],
      riskScore: 0,
      category: 'custom',
      source: 'content',
    };
  }

  /**
   * 텍스트에서 키워드를 스캔합니다.
   */
  private scanText(text: string): DetectionResult[] {
    if (!text || text.length === 0) return [];
    return this.keywordDetector.detect(text);
  }

  private extractDomain(url: string): string {
    try {
      return url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  private recordResult(result: ScanResult): void {
    if (result.isBlocked) this.blockCount++;
    this.scanHistory.push(result);
    if (this.scanHistory.length > 100) this.scanHistory.shift();
  }

  /** 스캔 통계 */
  getStats() {
    return {
      totalScans: this.scanCount,
      totalBlocks: this.blockCount,
      blockRate: this.scanCount > 0 ? Math.round((this.blockCount / this.scanCount) * 100) : 0,
      recentBlocks: this.scanHistory.filter((r) => r.isBlocked).slice(-10),
      bypassDetections: this.scanHistory.filter((r) => r.source === 'bypass').length,
    };
  }

  /** 차단 도메인 업데이트 */
  updateBlockedDomains(domains: string[]): void {
    this.blockedDomains = domains;
  }

  /** 키워드 그룹 업데이트 */
  updateKeywordGroups(groups: KeywordGroup[]): void {
    this.keywordDetector = new KeywordDetector(groups);
  }
}
