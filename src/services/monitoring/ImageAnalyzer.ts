import { ContentCategory } from '@/types';

export interface ImageAnalysisResult {
  isHarmful: boolean;
  confidence: number;
  categories: { category: ContentCategory; score: number }[];
  detectedText: string[];
}

/**
 * Image analysis service.
 * Currently operates in simulation mode; designed as a placeholder
 * for future TensorFlow Lite / on-device ML integration.
 */
export class ImageAnalyzer {
  /**
   * Analyzes an image and returns a simulated result.
   * In a production build this would delegate to TFLite or a cloud vision API.
   *
   * @param _imageUri - URI of the image to analyze (unused in simulation mode)
   */
  static async analyzeImage(_imageUri: string): Promise<ImageAnalysisResult> {
    // Simulate async processing delay (200-800 ms)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 600 + 200));

    const allCategories: ContentCategory[] = [
      'gambling',
      'gaming',
      'adult',
      'social_media',
      'shopping',
      'news',
    ];

    // Generate random category scores
    const categories = allCategories.map((category) => ({
      category,
      score: Math.round(Math.random() * 100) / 100,
    }));

    // Sort descending by score
    categories.sort((a, b) => b.score - a.score);

    // Determine overall confidence from the top-scoring category
    const topScore = categories[0].score;
    const confidence = Math.round(topScore * 100) / 100;

    // Consider harmful if top score exceeds 0.7
    const isHarmful = topScore > 0.7;

    // Simulate OCR-detected text fragments
    const ocrPool = [
      '지금 가입하세요',
      'FREE BONUS',
      '100% 당첨',
      '한정 세일',
      '회원가입',
      '다운로드',
      'CLICK HERE',
      '무료 체험',
    ];
    const detectedText: string[] = [];
    const textCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < textCount; i++) {
      detectedText.push(ocrPool[Math.floor(Math.random() * ocrPool.length)]);
    }

    return {
      isHarmful,
      confidence,
      categories,
      detectedText,
    };
  }

  /**
   * Indicates whether on-device image analysis (TFLite) is available.
   * Returns false in the current simulation-only build.
   */
  static isAvailable(): boolean {
    return false;
  }
}
