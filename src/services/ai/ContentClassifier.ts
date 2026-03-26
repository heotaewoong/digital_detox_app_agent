import { ContentCategory } from '@/types';

export interface ClassificationResult {
  category: ContentCategory;
  confidence: number;
  subcategories: string[];
}

interface CategoryRule {
  category: ContentCategory;
  indicators: string[];
  subcategoryMap: Record<string, string[]>;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'gambling',
    indicators: [
      '도박', '베팅', '카지노', '슬롯', '포커', '바카라',
      '토토', '배당', '잭팟', '룰렛', '블랙잭', '경마',
      '로또', '복권', '스포츠베팅', '온라인카지노', '배팅',
      'bet', 'casino', 'poker', 'gambling', 'slot', 'jackpot',
    ],
    subcategoryMap: {
      '온라인카지노': ['카지노', '슬롯', '바카라', '룰렛', '블랙잭', 'casino', 'slot'],
      '스포츠베팅': ['토토', '배당', '스포츠베팅', '배팅', 'bet'],
      '복권': ['로또', '복권', '잭팟', 'jackpot'],
      '경마': ['경마'],
    },
  },
  {
    category: 'gaming',
    indicators: [
      '게임', '리그오브레전드', '오버워치', '배틀그라운드',
      '롤', 'LOL', '발로란트', '메이플', '리니지', '던전',
      'game', 'gaming', 'esport', 'steam', 'twitch',
      '스트리머', '트위치', '아프리카', '방송', '겜',
      '모바일게임', '가챠', '뽑기', '강화',
    ],
    subcategoryMap: {
      'PC게임': ['리그오브레전드', '오버워치', '배틀그라운드', '롤', 'LOL', '발로란트', '메이플', '리니지', '던전', 'steam'],
      '모바일게임': ['모바일게임', '가챠', '뽑기'],
      '게임방송': ['스트리머', '트위치', '아프리카', '방송', 'twitch'],
      'e스포츠': ['esport', '대회', '챔피언십'],
    },
  },
  {
    category: 'adult',
    indicators: [
      '성인', '야동', '포르노', '19금', 'adult', 'porn',
      'xxx', '야한', '섹스', '노출', '음란',
      '성인사이트', '채팅', '만남',
    ],
    subcategoryMap: {
      '성인컨텐츠': ['성인', '야동', '포르노', '19금', 'adult', 'porn', 'xxx'],
      '성인채팅': ['채팅', '만남'],
    },
  },
  {
    category: 'social_media',
    indicators: [
      '인스타그램', '페이스북', '틱톡', '트위터', '유튜브',
      'instagram', 'facebook', 'tiktok', 'twitter', 'youtube',
      '좋아요', '팔로우', '팔로워', '릴스', '쇼츠',
      '피드', '스토리', '댓글', 'SNS', '소셜',
    ],
    subcategoryMap: {
      '동영상': ['유튜브', 'youtube', '릴스', '쇼츠', '틱톡', 'tiktok'],
      '사진공유': ['인스타그램', 'instagram', '피드', '스토리'],
      '마이크로블로그': ['트위터', 'twitter', '페이스북', 'facebook'],
    },
  },
  {
    category: 'shopping',
    indicators: [
      '쇼핑', '구매', '할인', '세일', '쿠폰', '배송',
      '장바구니', '결제', '카드', '포인트', '적립',
      '쿠팡', '네이버쇼핑', '11번가', 'shopping',
      '최저가', '리뷰', '상품', '주문',
    ],
    subcategoryMap: {
      '온라인쇼핑': ['쿠팡', '네이버쇼핑', '11번가', '장바구니', '결제'],
      '할인정보': ['할인', '세일', '쿠폰', '최저가'],
      '리뷰': ['리뷰', '상품', '후기'],
    },
  },
  {
    category: 'news',
    indicators: [
      '뉴스', '속보', '기사', '언론', '신문',
      '정치', '경제', '사회', '연예', '스포츠뉴스',
      'news', 'breaking', '헤드라인', '보도',
    ],
    subcategoryMap: {
      '정치': ['정치'],
      '경제': ['경제'],
      '연예': ['연예'],
      '스포츠': ['스포츠뉴스'],
    },
  },
];

export class ContentClassifier {
  /**
   * Classifies text content into a content category using rule-based matching.
   */
  static classify(text: string): ClassificationResult {
    const normalizedText = text.toLowerCase();
    let bestResult: ClassificationResult = {
      category: 'custom',
      confidence: 0,
      subcategories: [],
    };

    for (const rule of CATEGORY_RULES) {
      const matchedIndicators = rule.indicators.filter((indicator) =>
        normalizedText.includes(indicator.toLowerCase())
      );

      const confidence =
        rule.indicators.length > 0
          ? matchedIndicators.length / rule.indicators.length
          : 0;

      if (confidence > bestResult.confidence) {
        const subcategories: string[] = [];
        for (const [subcat, keywords] of Object.entries(rule.subcategoryMap)) {
          const hasMatch = keywords.some((kw) =>
            normalizedText.includes(kw.toLowerCase())
          );
          if (hasMatch) {
            subcategories.push(subcat);
          }
        }

        bestResult = {
          category: rule.category,
          confidence: Math.round(confidence * 100) / 100,
          subcategories,
        };
      }
    }

    return bestResult;
  }

  /**
   * Classifies an array of text contents in batch.
   */
  static classifyBatch(texts: string[]): ClassificationResult[] {
    return texts.map((text) => ContentClassifier.classify(text));
  }
}
