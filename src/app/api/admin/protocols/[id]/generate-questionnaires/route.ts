import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireManager } from '@/storage/database';
import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取协议
    const protocol = await protocolManager.getProtocolById(id);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 检查是否已经存在问卷
    const existingQuestionnaires = await questionnaireManager.getQuestionnairesByProtocol(protocol.id);
    if (existingQuestionnaires.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Questionnaires already exist for this protocol',
          existingCount: existingQuestionnaires.length
        },
        { status: 400 }
      );
    }

    // 获取测试周期天数
    const testPeriodDays = (protocol as any).testPeriodDays || 28;
    const productName = (protocol as any).productName || '测试产品';

    // 使用新的动态问卷生成器生成测试周期的问卷
    const historyQuestions: string[] = [];
    const previousAnswers: any[] = [];

    for (let day = 1; day <= testPeriodDays; day++) {
      // 使用动态生成器生成每日问卷
      const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
        productName,
        dayIndex: day,
        testDurationDays: testPeriodDays,
        currentMaterialState: 'new_bag', // 默认状态
        previousAnswers,
        historyQuestions,
      });

      const questions = response.questions;

      // 保存问卷
      await questionnaireManager.createQuestionnaire({
        protocolId: protocol.id,
        dayIndex: day,
        testDurationDays: testPeriodDays,
        productName,
        questions,
      });

      // 更新历史问题列表（用于后续生成）
      questions.forEach((q: any) => {
        historyQuestions.push(q.title);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        protocolId: protocol.id,
        generatedCount: testPeriodDays
      }
    });
  } catch (error) {
    console.error('Generate questionnaires error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
