import { ContentCategory, DetectionEvent, KeywordGroup, RiskLevel } from '@/types';
import { KeywordDetector, DetectionResult } from './KeywordDetector';

/**
 * Main monitoring orchestrator (singleton).
 * In the current version the app operates in simulation mode,
 * generating synthetic detection events for demonstration purposes.
 */
export class ContentMonitor {
  private static instance: ContentMonitor | null = null;

  private keywordDetector: KeywordDetector;
  private isRunning: boolean;
  private simulationInterval: NodeJS.Timeout | null;

  private constructor() {
    this.keywordDetector = new KeywordDetector([]);
    this.isRunning = false;
    this.simulationInterval = null;
  }

  static getInstance(): ContentMonitor {
    if (!ContentMonitor.instance) {
      ContentMonitor.instance = new ContentMonitor();
    }
    return ContentMonitor.instance;
  }

  /**
   * (Re-)initializes the detector with the given keyword groups.
   */
  initialize(keywordGroups: KeywordGroup[]): void {
    this.keywordDetector = new KeywordDetector(keywordGroups);
  }

  /**
   * Starts monitoring. In the current build this is a no-op placeholder;
   * call startSimulation() with a callback to begin receiving events.
   */
  startMonitoring(): void {
    this.isRunning = true;
  }

  /**
   * Stops monitoring and any running simulation.
   */
  stopMonitoring(): void {
    this.isRunning = false;
    this.stopSimulation();
  }

  /**
   * Analyzes a piece of text as if it came from a given app.
   * Returns a DetectionEvent if keywords are found, or null otherwise.
   */
  analyzeContent(text: string, appName: string): DetectionEvent | null {
    const matches = this.keywordDetector.detect(text);
    if (matches.length === 0) return null;

    const riskScore = this.keywordDetector.getRiskScore(matches);
    const highestRisk = this.highestRiskLevel(matches);
    const category = this.dominantCategory(matches);

    const action: DetectionEvent['action'] =
      highestRisk === 'critical' ? 'blocked' :
      highestRisk === 'high' ? 'warned' :
      'logged';

    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      appName,
      category,
      matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
      riskScore,
      action,
    };
  }

  /**
   * Starts a simulation loop that generates synthetic browsing snippets
   * at random intervals (10-30 s) and fires the callback when a keyword
   * is detected.
   */
  startSimulation(onDetection: (event: DetectionEvent) => void): void {
    this.stopSimulation();
    this.isRunning = true;

    const scheduleNext = () => {
      if (!this.isRunning) return;
      const delayMs = (Math.random() * 20 + 10) * 1000; // 10-30 seconds
      this.simulationInterval = setTimeout(() => {
        if (!this.isRunning) return;

        const snippet = this.randomSnippet();
        const app = this.randomApp();
        const event = this.analyzeContent(snippet.text, app);

        if (event) {
          onDetection(event);
        }

        scheduleNext();
      }, delayMs);
    };

    scheduleNext();
  }

  /**
   * Stops the simulation timer.
   */
  stopSimulation(): void {
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  private generateId(): string {
    return `det_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private highestRiskLevel(matches: DetectionResult[]): RiskLevel {
    const order: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
    for (const level of order) {
      if (matches.some((m) => m.riskLevel === level)) return level;
    }
    return 'low';
  }

  private dominantCategory(matches: DetectionResult[]): ContentCategory {
    const counts = new Map<ContentCategory, number>();
    for (const m of matches) {
      counts.set(m.category, (counts.get(m.category) || 0) + 1);
    }
    let best: ContentCategory = matches[0].category;
    let bestCount = 0;
    for (const [cat, count] of counts) {
      if (count > bestCount) {
        best = cat;
        bestCount = count;
      }
    }
    return best;
  }

  /**
   * Pool of simulated browsing snippets.
   * Roughly half contain detectable keywords; the rest are benign.
   */
  private randomSnippet(): { text: string } {
    const snippets = [
      // Snippets likely to contain gambling keywords
      { text: '오늘 카지노 슬롯머신에서 대박 터졌다! 배팅 금액을 올려볼까' },
      { text: '스포츠 토토 분석 사이트에서 오늘의 배당률을 확인하세요' },
      { text: '온라인 포커 대회 참가자 모집 중입니다. 상금 1000만원' },
      // Snippets likely to contain gaming keywords
      { text: '롤 챔피언스 리그 결승전 하이라이트 모음. 페이커 미쳤다' },
      { text: '신작 게임 다운로드 무료 쿠폰 코드 공유합니다' },
      { text: '모바일 게임 리세마라 가이드 - 최강 캐릭터 뽑는 법' },
      // Snippets likely to contain adult keywords
      { text: '성인 인증 후 이용 가능한 콘텐츠입니다' },
      { text: '19금 웹툰 추천 리스트 업데이트' },
      // Snippets likely to contain shopping keywords
      { text: '타임세일 특가! 한정수량 90% 할인 놓치지 마세요' },
      { text: '쿠팡 로켓배송 오늘만 무료배송 이벤트' },
      // Benign snippets (no keywords expected)
      { text: 'React Native의 새로운 아키텍처가 성능을 크게 개선했습니다' },
      { text: '내일 날씨는 맑음, 기온은 15도에서 22도 사이입니다' },
      { text: '오늘 점심은 김치찌개로 결정! 맛있는 레시피 공유합니다' },
      { text: '새로운 운동 루틴을 시작했어요. 하루 30분 걷기부터' },
      { text: '독서 모임에서 이번 달 책을 정했습니다. 같이 읽어요' },
      { text: '주말에 가족과 함께 공원에 나들이를 다녀왔습니다' },
    ];

    return snippets[Math.floor(Math.random() * snippets.length)];
  }

  private randomApp(): string {
    const apps = [
      'Chrome',
      'Safari',
      'Samsung Internet',
      'YouTube',
      'Instagram',
      'TikTok',
      'KakaoTalk',
      'Naver',
      'Twitter',
      'Facebook',
    ];
    return apps[Math.floor(Math.random() * apps.length)];
  }
}
