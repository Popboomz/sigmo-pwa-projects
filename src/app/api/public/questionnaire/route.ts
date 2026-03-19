import { NextRequest, NextResponse } from 'next/server';

import { protocolManager, questionnaireManager } from '@/storage/database';
import { normalizeQuestionsTheme } from '@/lib/questionnaire/themes';

interface GetQuestionnaireResponse {
  questionnaire?: {
    id: string;
    dayIndex: number;
    testDurationDays: number;
    productName: string;
    questions: Array<{
      id: string;
      theme?: string;
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
          return hostLower.endsWith(allowed.slice(1));
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
      return NextResponse.json({ error: 'shareLink is required' }, { status: 400 });
    }

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    let targetDayIndex = dayIndex ? parseInt(dayIndex, 10) : 1;
    if (targetDayIndex < 1) {
      targetDayIndex = 1;
    }

    let questionnaire = await questionnaireManager.getQuestionnaireByProtocolAndDay(
      protocol.id,
      targetDayIndex,
    );

    if (!questionnaire) {
      const appOrigin = getTrustedOrigin(request);
      const dynamicResponse = await fetch(
        `${appOrigin}/api/public/questionnaire/dynamic?shareLink=${encodeURIComponent(
          shareLink,
        )}&dayIndex=${targetDayIndex}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      if (dynamicResponse.ok) {
        const dynamicData = await dynamicResponse.json();
        if (dynamicData.success && dynamicData.data) {
          questionnaire = dynamicData.data;
        }
      }
    }

    const response: GetQuestionnaireResponse = {
      hasSubmittedToday: false,
      canSubmitToday: Boolean(questionnaire),
    };

    if (questionnaire) {
      response.questionnaire = {
        id: questionnaire.id,
        dayIndex: questionnaire.dayIndex,
        testDurationDays: questionnaire.testDurationDays,
        productName: questionnaire.productName || '',
        questions: normalizeQuestionsTheme((questionnaire.questions as any[]) || []) as Array<{
          id: string;
          theme?: string;
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
