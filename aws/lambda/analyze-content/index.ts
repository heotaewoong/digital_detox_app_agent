import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface AnalyzeRequest {
  text: string;
  userId?: string;
  appName?: string;
}

interface AnalyzeResponse {
  category: string;
  riskScore: number;
  keywords: string[];
  action: 'logged' | 'warned' | 'blocked';
}

// Keyword-based classification maps
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  gambling: [
    '도박', '베팅', '카지노', '슬롯', '포커', '바카라', '토토', '배당',
    '잭팟', 'bet', 'casino', 'gambling', 'poker', 'slot',
  ],
  gaming: [
    '게임', '롤', '오버워치', '배그', '피파', '리니지', '메이플',
    'game', 'lol', 'steam', 'twitch', 'gaming',
  ],
  adult: [
    '성인', '야동', '포르노', '19금', 'adult', 'porn', 'xxx',
  ],
  social_media: [
    '인스타', '틱톡', '트위터', '페이스북', '유튜브', '릴스', '쇼츠',
    'instagram', 'tiktok', 'twitter', 'facebook', 'reels', 'shorts',
  ],
  shopping: [
    '쇼핑', '할인', '세일', '쿠팡', '네이버쇼핑', '11번가', '특가',
    '구매', 'shopping', 'sale', 'discount', 'deal',
  ],
  news: [
    '속보', '뉴스', '기사', '연예', '가십', '루머',
    'breaking', 'news', 'gossip',
  ],
};

const RISK_THRESHOLDS = {
  low: 0.3,
  medium: 0.6,
  high: 0.8,
};

function analyzeText(text: string): AnalyzeResponse {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  const categoryScores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }
    if (matchCount > 0) {
      categoryScores[category] = matchCount / keywords.length;
    }
  }

  // Find the category with the highest score
  let topCategory = 'unknown';
  let topScore = 0;
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > topScore) {
      topScore = score;
      topCategory = category;
    }
  }

  // Normalize risk score to 0-1 range, with a boost for high-risk categories
  const categoryMultiplier =
    topCategory === 'gambling' || topCategory === 'adult' ? 1.5 : 1.0;
  const riskScore = Math.min(1.0, topScore * categoryMultiplier);

  // Determine action
  let action: 'logged' | 'warned' | 'blocked';
  if (riskScore >= RISK_THRESHOLDS.high) {
    action = 'blocked';
  } else if (riskScore >= RISK_THRESHOLDS.medium) {
    action = 'warned';
  } else {
    action = 'logged';
  }

  return {
    category: topCategory,
    riskScore: Math.round(riskScore * 100) / 100,
    keywords: matchedKeywords,
    action,
  };
}

function buildResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return buildResponse(400, { error: 'Request body is required' });
    }

    const request: AnalyzeRequest = JSON.parse(event.body);

    if (!request.text || typeof request.text !== 'string') {
      return buildResponse(400, { error: '"text" field is required and must be a string' });
    }

    const result = analyzeText(request.text);

    return buildResponse(200, result);
  } catch (error) {
    console.error('Error analyzing content:', error);
    return buildResponse(500, { error: 'Internal server error' });
  }
};
