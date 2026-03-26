import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface MotivationRequest {
  goals: string[];
  dreams: string[];
  context: 'blocked' | 'daily' | 'morning';
}

interface MotivationResponse {
  message: string;
  type: 'text' | 'image';
  imageUrl?: string;
}

// Template-based motivation messages
// TODO: Replace with AWS Bedrock integration for AI-generated messages
// Example Bedrock call:
//   import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
//   const client = new BedrockRuntimeClient({ region: 'us-east-1' });
//   const response = await client.send(new InvokeModelCommand({
//     modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
//     body: JSON.stringify({ prompt: `Generate a motivational message for: ${goal}` }),
//   }));

const BLOCKED_TEMPLATES = [
  "지금 이 순간, '{goal}'을(를) 위해 시간을 아꼈어요. 잘했습니다!",
  "'{goal}'에 한 걸음 더 다가가는 선택을 했어요!",
  "유혹을 이겨냈어요! '{goal}'을(를) 향한 의지가 대단합니다.",
  "잠깐의 유혹보다 '{goal}'이(가) 더 소중하죠. 자랑스러워요!",
  "'{goal}'을(를) 위해 현명한 선택을 했어요. 계속 이렇게!",
];

const DAILY_TEMPLATES = [
  "오늘 하루도 '{goal}'을(를) 향해 노력했어요. 수고했습니다!",
  "'{goal}'을(를) 위한 오늘의 여정이 끝났어요. 내일도 함께해요!",
  "하루를 돌아보며 '{goal}'에 더 가까워진 자신을 칭찬해주세요.",
];

const MORNING_TEMPLATES = [
  "좋은 아침이에요! 오늘도 '{goal}'을(를) 향해 힘차게 시작해볼까요?",
  "새로운 하루! '{goal}'에 한 걸음 더 다가가는 날이 될 거예요!",
  "오늘 하루, '{goal}'을(를) 위해 시간을 소중히 써보아요.",
];

const DREAM_TEMPLATES = [
  "당신의 꿈인 '{dream}'을(를) 향해 나아가고 있어요!",
  "'{dream}' - 이 꿈을 항상 기억하세요. 당신은 해낼 수 있습니다.",
];

const GENERIC_QUOTES = [
  '작은 변화가 큰 결과를 만듭니다. 오늘도 한 걸음 더!',
  '당신은 이미 충분히 강합니다. 스스로를 믿으세요.',
  '포기하지 않는 한, 실패는 없습니다.',
  '오늘의 노력이 내일의 당신을 만듭니다.',
  '시간은 되돌릴 수 없지만, 지금부터 바꿀 수 있어요.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMotivation(request: MotivationRequest): MotivationResponse {
  const { goals, dreams, context } = request;

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

  let message: string;

  if (goals.length > 0) {
    const goal = pickRandom(goals);
    message = pickRandom(templates).replace('{goal}', goal);
  } else if (dreams.length > 0) {
    const dream = pickRandom(dreams);
    message = pickRandom(DREAM_TEMPLATES).replace('{dream}', dream);
  } else {
    message = pickRandom(GENERIC_QUOTES);
  }

  return {
    message,
    type: 'text',
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

    const request: MotivationRequest = JSON.parse(event.body);

    if (!request.context) {
      return buildResponse(400, { error: '"context" field is required' });
    }

    const result = generateMotivation({
      goals: request.goals ?? [],
      dreams: request.dreams ?? [],
      context: request.context,
    });

    return buildResponse(200, result);
  } catch (error) {
    console.error('Error generating motivation:', error);
    return buildResponse(500, { error: 'Internal server error' });
  }
};
