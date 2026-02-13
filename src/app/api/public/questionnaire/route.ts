import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireManager } from '@/storage/database';

interface GetQuestionnaireRequest {
  shareLink: string;
  dayIndex?: number;
}

interface GetQuestionnaireResponse {
  questionnaire?: {
    id: string;
    dayIndex: number;
    testDurationDays: number;
    productName: string;
    questions: Array<{
      id: string;
      theme: string;
      title: string;
      options: string[];
    }>;
  };
  hasSubmittedToday?: boolean;
  canSubmitToday?: boolean;
  message?: string;
}

function getTrustedOrigin(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const hostAllowlist = process.env.APP_HOST_ALLOWLIST || '';
  const allowlist = hostAllowlist
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const isAllowedHost = (host: string) => {
    const hostLower = host.toLowerCase();
    if (allowlist.length > 0) {
      return allowlist.some((allowed) => {
        if (allowed.startsWith('*.')) {
          const suffix = allowed.slice(1);
          return hostLower.endsWith(suffix);
        }
        return hostLower === allowed;
      });
    }
    return hostLower.endsWith('.hosted.app');
  };

  if (
    (forwardedProto === 'https' || forwardedProto === 'http') &&
    forwardedHost &&
    /^(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::\d{1,5})?$/.test(forwardedHost)
  ) {
    if (process.env.NODE_ENV !== 'production' || isAllowedHost(forwardedHost)) {
      return `${forwardedProto}://${forwardedHost}`;
    }
  }

  // Fallback for local/dev and non-proxied requests.
  const fallbackUrl = new URL(request.url);
  if (!['https:', 'http:'].includes(fallbackUrl.protocol) || !fallbackUrl.host) {
    throw new Error('Unable to determine a trusted request origin');
  }

  if (process.env.NODE_ENV === 'production' && !isAllowedHost(fallbackUrl.host)) {
    throw new Error('Request origin is not in the allowlist');
  }

  return `${fallbackUrl.protocol}//${fallbackUrl.host}`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareLink = searchParams.get('shareLink');
    const dayIndex = searchParams.get('dayIndex');

    if (!shareLink) {
      return NextResponse.json(
        { error: 'shareLink is required' },
        { status: 400 }
      );
    }

    // 查找协议
    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 获取或创建问卷
    let questionnaire;
    let targetDayIndex = dayIndex ? parseInt(dayIndex, 10) : 1;

    if (targetDayIndex < 1) {
      targetDayIndex = 1;
    }

    // 查找指定天数的问卷
    questionnaire = await questionnaireManager.getQuestionnaireByProtocolAndDay(
      protocol.id,
      targetDayIndex
    );

    // 如果没有找到，并且是第1天，或者用户指定了天数，则生成新问卷
    if (!questionnaire && targetDayIndex === 1) {
      // 生成第一天问卷
      const appOrigin = getTrustedOrigin(request);
      const generateResponse = await fetch(`${appOrigin}/api/admin/questions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayIndex: 1,
          testDurationDays: 7, // 默认7天
          productName: protocol.title,
        }),
      });

      if (generateResponse.ok) {
        const generateData = await generateResponse.json();
        if (generateData.success && generateData.data) {
          questionnaire = await questionnaireManager.createQuestionnaire({
            protocolId: protocol.id,
            dayIndex: 1,
            testDurationDays: 7,
            productName: protocol.title,
            questions: generateData.data.questions,
          });
        }
      }
    }

    // 检查今天是否已提交
    // 这里需要查询是否有当天的答案记录
    // 由于我们使用新的问卷答案系统，需要检查 questionnaire_answers 表
    // 暂时简化处理，返回问卷信息

    const response: GetQuestionnaireResponse = {
      hasSubmittedToday: false,
      canSubmitToday: true,
    };

    if (questionnaire) {
      response.questionnaire = {
        id: questionnaire.id,
        dayIndex: questionnaire.dayIndex,
        testDurationDays: questionnaire.testDurationDays,
        productName: questionnaire.productName || '',
        questions: questionnaire.questions as Array<{
          id: string;
          theme: string;
          title: string;
          options: string[];
        }>,
      };
    } else {
      response.message = 'Questionnaire not found. Please contact the administrator.';
      response.canSubmitToday = false;
    }

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get questionnaire error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
