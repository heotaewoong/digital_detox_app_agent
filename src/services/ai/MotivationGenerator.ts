import { Goal, MotivationContent } from '@/types';

type MotivationContext = 'blocked' | 'daily' | 'morning';

const MOTIVATIONAL_QUOTES: string[] = [
  '작은 변화가 큰 결과를 만듭니다. 오늘도 한 걸음 더!',
  '당신은 이미 충분히 강합니다. 스스로를 믿으세요.',
  '포기하지 않는 한, 실패는 없습니다.',
  '오늘의 노력이 내일의 당신을 만듭니다.',
  '시간은 되돌릴 수 없지만, 지금부터 바꿀 수 있어요.',
  '매 순간 더 나은 선택을 할 수 있는 힘이 있습니다.',
  '당신의 미래는 지금 이 순간에 만들어집니다.',
  '습관이 운명을 바꿉니다. 좋은 습관을 만들어가세요.',
  '어제보다 나은 오늘, 그것이면 충분합니다.',
  '집중은 성공의 열쇠입니다. 지금 이 순간에 집중하세요.',
  '당신이 꿈꾸는 모든 것은 이룰 수 있습니다.',
  '작은 승리를 축하하세요. 큰 변화는 거기서 시작됩니다.',
  '시간을 아끼는 것은 인생을 아끼는 것입니다.',
  '목표를 향해 꾸준히 나아가는 당신이 멋집니다.',
  '지금 이 순간이 새로운 시작입니다.',
  '후회 없는 하루를 만들어가세요.',
  '자기 자신에게 투자하는 시간은 절대 낭비가 아닙니다.',
];

const BLOCKED_TEMPLATES: string[] = [
  "지금 이 순간, '{goal}'을 위해 시간을 아꼈어요.",
  "'{goal}'에 한 걸음 더 다가가는 선택을 했어요!",
  "유혹을 이겨냈어요! '{goal}'을 향한 의지가 대단합니다.",
  "잠깐의 유혹보다 '{goal}'이 더 소중하죠. 잘했어요!",
  "'{goal}'을 위해 현명한 선택을 했어요. 자랑스러워요!",
];

const DAILY_TEMPLATES: string[] = [
  "오늘 하루도 '{goal}'을 향해 노력했어요. 수고했습니다!",
  "'{goal}'을 위한 오늘의 여정이 끝났어요. 내일도 함께해요!",
  "하루를 돌아보며 '{goal}'에 더 가까워진 자신을 칭찬해주세요.",
  "오늘도 '{goal}'을 위해 시간을 지켰어요. 대단해요!",
];

const MORNING_TEMPLATES: string[] = [
  "좋은 아침이에요! 오늘도 '{goal}'을 향해 힘차게 시작해볼까요?",
  "새로운 하루가 시작됐어요. '{goal}'에 한 걸음 더 다가가는 날이 될 거예요!",
  "오늘 하루, '{goal}'을 위해 시간을 소중히 써보아요.",
  "'{goal}'을 향한 여정, 오늘도 응원합니다!",
];

const DREAM_REMINDER_TEMPLATES: string[] = [
  "당신의 꿈인 '{dream}'에 한 걸음 더 가까워졌어요!",
  "'{dream}'을 이루기 위한 여정을 응원해요!",
  "'{dream}'을 향해 오늘도 한 걸음. 당신은 해낼 수 있어요!",
  "잊지 마세요, 당신의 꿈은 '{dream}'이에요. 지금 이 순간도 의미가 있어요.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  return `mot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export class MotivationGenerator {
  /**
   * Generates a personalized motivation message based on user goals and context.
   * In simulation mode, uses pre-defined templates.
   * In production, this would call AWS Bedrock.
   */
  static async generateMessage(
    goals: Goal[],
    context: MotivationContext
  ): Promise<MotivationContent> {
    const goal = goals.length > 0 ? pickRandom(goals) : null;
    const goalTitle = goal?.title ?? '더 나은 나';

    let templates: string[];
    switch (context) {
      case 'blocked':
        templates = BLOCKED_TEMPLATES;
        break;
      case 'daily':
        templates = DAILY_TEMPLATES;
        break;
      case 'morning':
        templates = MORNING_TEMPLATES;
        break;
      default:
        templates = BLOCKED_TEMPLATES;
    }

    const template = pickRandom(templates);
    const content = template.replace('{goal}', goalTitle);

    return {
      id: generateId(),
      type: 'text',
      content,
      relatedGoal: goal?.id,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Returns a random motivational quote in Korean.
   */
  static getQuickMotivation(): string {
    return pickRandom(MOTIVATIONAL_QUOTES);
  }

  /**
   * Creates a personalized reminder based on user's dreams.
   */
  static getDreamReminder(dreams: string[]): string {
    if (dreams.length === 0) {
      return '당신의 꿈을 설정하고, 더 의미 있는 시간을 만들어보세요!';
    }

    const dream = pickRandom(dreams);
    const template = pickRandom(DREAM_REMINDER_TEMPLATES);
    return template.replace('{dream}', dream);
  }
}
