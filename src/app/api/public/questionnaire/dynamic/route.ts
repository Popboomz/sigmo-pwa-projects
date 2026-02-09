import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireManager, questionnaireAnswerManager } from '@/storage/database';
import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareLink = searchParams.get('shareLink');
    const dayIndex = parseInt(searchParams.get('dayIndex') || '1');

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

    // 检查该问卷是否已经存在
    const existingQuestionnaire = await questionnaireManager.getQuestionnaireByProtocolAndDay(
      protocol.id,
      dayIndex
    );

    // 检查是否需要重新生成（如果是默认问题且dayIndex > 1）
    let shouldRegenerate = false;
    if (existingQuestionnaire && dayIndex > 1) {
      const questions = (existingQuestionnaire as any).questions || [];
      const hasDefaultQuestions = Array.isArray(questions) && questions.some(
        (q: any) => q.followupRule === '默认问题'
      );
      if (hasDefaultQuestions) {
        console.log(`[Dynamic] Questionnaire for day ${dayIndex} has default questions, will regenerate`);
        shouldRegenerate = true;
      }
    }

    if (existingQuestionnaire && !shouldRegenerate) {
      // 返回已存在的问卷
      return NextResponse.json({
        success: true,
        data: existingQuestionnaire,
      });
    }

    // 问卷不存在或需要重新生成，需要动态生成
    const productName = (protocol as any).productName || '测试产品';
    const testDurationDays = (protocol as any).testPeriodDays || 28;

    // 获取前一天的答案（如果有）
    let previousAnswers: any[] = [];

    if (dayIndex > 1) {
      const previousDayAnswers = await questionnaireAnswerManager.getAnswersByProtocolAndDay(
        protocol.id,
        dayIndex - 1
      );

      if (previousDayAnswers && previousDayAnswers.length > 0) {
        // 取最新的答案中的answers数组
        const latestAnswer = previousDayAnswers[0];
        if (latestAnswer.answers && Array.isArray(latestAnswer.answers)) {
          previousAnswers = latestAnswer.answers;
          console.log(`[Dynamic] Found ${previousAnswers.length} answers from day ${dayIndex - 1}`);
        }
      }
    }

    // 获取历史问题列表（用于避免重复）
    let historyQuestions: string[] = [];

    if (dayIndex > 1) {
      // 获取所有之前生成的问卷
      const allQuestionnaires = await questionnaireManager.getQuestionnairesByProtocol(protocol.id);

      // 提取之前所有的问题标题
      historyQuestions = allQuestionnaires
        .filter(q => q.dayIndex < dayIndex)
        .flatMap(q => (q.questions as any[] || []).map((question: any) => question.title));

      console.log(`[Dynamic] Found ${historyQuestions.length} historical questions`);
    }

    // 生成动态问卷
    console.log(`[Dynamic] Generating questionnaire for day ${dayIndex} with ${previousAnswers.length} previous answers`);
    const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
      productName,
      dayIndex,
      testDurationDays,
      currentMaterialState: (protocol as any).materialState || 'new_bag',
      previousAnswers,
      historyQuestions,
    });

    // 只提取 questions 数组用于存储（元数据可以在返回时添加）
    const questionsArray = response.questions;

    // 如果是重新生成，先删除旧问卷
    if (shouldRegenerate) {
      console.log(`[Dynamic] Deleting old questionnaire for day ${dayIndex}`);
      await questionnaireManager.deleteQuestionnaireByProtocolAndDay(protocol.id, dayIndex);
    }

    // 保存问卷到数据库
    const questionnaire = await questionnaireManager.createQuestionnaire({
      protocolId: protocol.id,
      dayIndex,
      testDurationDays,
      productName,
      questions: questionsArray, // 只存储 questions 数组
    });

    return NextResponse.json({
      success: true,
      data: questionnaire,
    });
  } catch (error) {
    console.error('Get dynamic questionnaire error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
