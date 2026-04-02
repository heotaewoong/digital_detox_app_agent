import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const USAGE_DATA_TABLE = process.env.USAGE_DATA_TABLE ?? 'ContentGuardian-UsageData';

interface ReportRequest {
  userId: string;
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
}

interface CategoryBreakdown {
  category: string;
  minutes: number;
  percentage: number;
}

interface Insight {
  type: 'positive' | 'warning' | 'info';
  message: string;
}

interface ReportResponse {
  totalScreenTime: number;
  categoryBreakdown: CategoryBreakdown[];
  blockedCount: number;
  insights: Insight[];
}

interface UsageRecord {
  userId: string;
  timestamp: string;
  date: string;
  category: string;
  durationMinutes: number;
  action: 'logged' | 'warned' | 'blocked';
  appName?: string;
}

async function queryUsageData(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<UsageRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: USAGE_DATA_TABLE,
      IndexName: 'DateIndex',
      KeyConditionExpression: 'userId = :uid AND #d BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: {
        ':uid': userId,
        ':start': startDate,
        ':end': endDate,
      },
    }),
  );

  return (result.Items ?? []) as UsageRecord[];
}

function generateInsights(
  totalMinutes: number,
  blockedCount: number,
  breakdown: CategoryBreakdown[],
): Insight[] {
  const insights: Insight[] = [];

  // Screen time insight
  const hoursPerDay = totalMinutes / 60;
  if (hoursPerDay < 2) {
    insights.push({
      type: 'positive',
      message: '스크린 타임이 적정 수준입니다. 잘 관리하고 계세요!',
    });
  } else if (hoursPerDay < 4) {
    insights.push({
      type: 'info',
      message: '스크린 타임이 보통 수준입니다. 조금 더 줄여보는 건 어떨까요?',
    });
  } else {
    insights.push({
      type: 'warning',
      message: '스크린 타임이 많습니다. 디지털 디톡스를 시도해보세요.',
    });
  }

  // Blocked content insight
  if (blockedCount > 0) {
    insights.push({
      type: 'positive',
      message: `${blockedCount}건의 유해 콘텐츠를 차단했습니다. ContentGuardian이 당신을 지켜주고 있어요!`,
    });
  } else {
    insights.push({
      type: 'positive',
      message: '유해 콘텐츠 차단 기록이 없습니다. 건강한 디지털 생활을 하고 계세요!',
    });
  }

  // Category-specific insights
  const topCategory = breakdown.length > 0 ? breakdown[0] : null;
  if (topCategory && topCategory.percentage > 50) {
    insights.push({
      type: 'warning',
      message: `'${topCategory.category}' 카테고리가 전체 사용 시간의 ${Math.round(topCategory.percentage)}%를 차지하고 있습니다.`,
    });
  }

  return insights;
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

    const request: ReportRequest = JSON.parse(event.body);

    if (!request.userId || !request.dateRange?.start || !request.dateRange?.end) {
      return buildResponse(400, {
        error: '"userId" and "dateRange" (with start and end) are required',
      });
    }

    const records = await queryUsageData(
      request.userId,
      request.dateRange.start,
      request.dateRange.end,
    );

    // Aggregate data
    let totalScreenTime = 0;
    let blockedCount = 0;
    const categoryMinutes: Record<string, number> = {};

    for (const record of records) {
      totalScreenTime += record.durationMinutes ?? 0;

      if (record.action === 'blocked') {
        blockedCount++;
      }

      const cat = record.category ?? 'unknown';
      categoryMinutes[cat] = (categoryMinutes[cat] ?? 0) + (record.durationMinutes ?? 0);
    }

    // Build category breakdown sorted by minutes descending
    const categoryBreakdown: CategoryBreakdown[] = Object.entries(categoryMinutes)
      .map(([category, minutes]) => ({
        category,
        minutes,
        percentage: totalScreenTime > 0 ? (minutes / totalScreenTime) * 100 : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const insights = generateInsights(totalScreenTime, blockedCount, categoryBreakdown);

    const report: ReportResponse = {
      totalScreenTime,
      categoryBreakdown,
      blockedCount,
      insights,
    };

    return buildResponse(200, report);
  } catch (error) {
    console.error('Error generating report:', error);
    return buildResponse(500, { error: 'Internal server error' });
  }
};
