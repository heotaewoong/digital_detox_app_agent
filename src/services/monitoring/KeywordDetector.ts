import { ContentCategory, KeywordGroup, RiskLevel } from '@/types';

export interface DetectionResult {
  keyword: string;
  category: ContentCategory;
  riskLevel: RiskLevel;
  position: number;
  context: string;
}

/**
 * Keyword detection engine using multi-pattern matching.
 * Supports Korean text (ignoring spaces) and fuzzy matching via Levenshtein distance.
 */
export class KeywordDetector {
  private keywordGroups: KeywordGroup[];
  private patternMap: Map<string, { category: ContentCategory; riskLevel: RiskLevel }>;

  constructor(keywordGroups: KeywordGroup[]) {
    this.keywordGroups = keywordGroups;
    this.patternMap = new Map();
    this.buildPatternMap();
  }

  /**
   * Builds a lookup map from all enabled keyword groups.
   * Keys are lowercased keywords; values carry category and risk metadata.
   */
  buildPatternMap(): void {
    this.patternMap.clear();

    for (const group of this.keywordGroups) {
      if (!group.enabled) continue;

      for (const keyword of group.keywords) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (normalizedKeyword.length === 0) continue;

        // If duplicate keyword exists, keep the higher risk level
        const existing = this.patternMap.get(normalizedKeyword);
        if (existing && this.riskLevelValue(existing.riskLevel) >= this.riskLevelValue(group.riskLevel)) {
          continue;
        }

        this.patternMap.set(normalizedKeyword, {
          category: group.category,
          riskLevel: group.riskLevel,
        });
      }
    }
  }

  /**
   * Detects all keyword matches within the given text.
   * Performs exact substring matching on normalized text.
   * For Korean content, also matches with whitespace removed.
   */
  detect(text: string): DetectionResult[] {
    const results: DetectionResult[] = [];
    const normalizedText = text.toLowerCase();
    // Korean-aware: strip all whitespace for a secondary search pass
    const noSpaceText = normalizedText.replace(/\s+/g, '');
    const seenPositions = new Set<string>();

    for (const [keyword, meta] of this.patternMap) {
      // --- Pass 1: normal text ---
      let searchFrom = 0;
      while (true) {
        const pos = normalizedText.indexOf(keyword, searchFrom);
        if (pos === -1) break;

        const key = `${keyword}:${pos}`;
        if (!seenPositions.has(key)) {
          seenPositions.add(key);
          results.push({
            keyword,
            category: meta.category,
            riskLevel: meta.riskLevel,
            position: pos,
            context: this.extractContext(text, pos, keyword.length),
          });
        }
        searchFrom = pos + 1;
      }

      // --- Pass 2: whitespace-stripped text (Korean support) ---
      const keywordNoSpace = keyword.replace(/\s+/g, '');
      if (keywordNoSpace !== keyword && keywordNoSpace.length > 0) {
        let nsSearchFrom = 0;
        while (true) {
          const nsPos = noSpaceText.indexOf(keywordNoSpace, nsSearchFrom);
          if (nsPos === -1) break;

          // Map position back to approximate original position
          const approxPos = this.mapNoSpacePosition(normalizedText, nsPos);
          const key = `${keyword}:ns:${nsPos}`;
          if (!seenPositions.has(key)) {
            seenPositions.add(key);
            results.push({
              keyword,
              category: meta.category,
              riskLevel: meta.riskLevel,
              position: approxPos,
              context: this.extractContext(text, approxPos, keyword.length + 4),
            });
          }
          nsSearchFrom = nsPos + 1;
        }
      }

      // Also detect the keyword itself without spaces against the no-space text
      if (keywordNoSpace.length > 0 && keywordNoSpace === keyword) {
        let nsSearchFrom = 0;
        while (true) {
          const nsPos = noSpaceText.indexOf(keywordNoSpace, nsSearchFrom);
          if (nsPos === -1) break;

          const approxPos = this.mapNoSpacePosition(normalizedText, nsPos);
          const key = `${keyword}:ns:${nsPos}`;
          if (!seenPositions.has(key)) {
            seenPositions.add(key);
            results.push({
              keyword,
              category: meta.category,
              riskLevel: meta.riskLevel,
              position: approxPos,
              context: this.extractContext(text, approxPos, keyword.length + 4),
            });
          }
          nsSearchFrom = nsPos + 1;
        }
      }
    }

    // Sort by position for consistent ordering
    results.sort((a, b) => a.position - b.position);
    return results;
  }

  /**
   * Fuzzy match using Levenshtein distance.
   * @param threshold Maximum edit distance to consider a match (default: 2)
   */
  fuzzyMatch(text: string, keyword: string, threshold: number = 2): boolean {
    const normalizedText = text.toLowerCase();
    const normalizedKeyword = keyword.toLowerCase();
    const keyLen = normalizedKeyword.length;

    // Slide a window of keyword-length (+/- threshold) across the text
    for (let winSize = Math.max(1, keyLen - threshold); winSize <= keyLen + threshold; winSize++) {
      for (let i = 0; i <= normalizedText.length - winSize; i++) {
        const window = normalizedText.substring(i, i + winSize);
        if (this.levenshteinDistance(window, normalizedKeyword) <= threshold) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculates an overall risk score (0-100) from a set of detection results.
   * Scoring: critical=25, high=15, medium=10, low=5 per match.
   */
  getRiskScore(matches: DetectionResult[]): number {
    let score = 0;
    for (const match of matches) {
      score += this.riskPoints(match.riskLevel);
    }
    return Math.min(score, 100);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private riskPoints(level: RiskLevel): number {
    switch (level) {
      case 'critical': return 25;
      case 'high': return 15;
      case 'medium': return 10;
      case 'low': return 5;
    }
  }

  private riskLevelValue(level: RiskLevel): number {
    switch (level) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  /**
   * Extracts surrounding context around a match position.
   */
  private extractContext(text: string, position: number, matchLength: number): string {
    const contextRadius = 30;
    const start = Math.max(0, position - contextRadius);
    const end = Math.min(text.length, position + matchLength + contextRadius);
    let context = text.substring(start, end).trim();

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  /**
   * Maps a position in whitespace-stripped text back to an approximate position
   * in the original text.
   */
  private mapNoSpacePosition(originalText: string, noSpacePos: number): number {
    let stripped = 0;
    for (let i = 0; i < originalText.length; i++) {
      if (!/\s/.test(originalText[i])) {
        if (stripped === noSpacePos) return i;
        stripped++;
      }
    }
    return originalText.length;
  }

  /**
   * Standard Levenshtein distance between two strings.
   */
  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // Quick exits
    if (m === 0) return n;
    if (n === 0) return m;

    // Use single-row DP for memory efficiency
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);

    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,       // deletion
          curr[j - 1] + 1,   // insertion
          prev[j - 1] + cost, // substitution
        );
      }
      [prev, curr] = [curr, prev];
    }

    return prev[n];
  }
}
