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
      const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/admin/questions/generate`, {
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
