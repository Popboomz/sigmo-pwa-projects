import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireManager } from '@/storage/database';
import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';

// 固定的管理员用户 ID
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(request: NextRequest) {
  try {
    const protocols = await protocolManager.getAllProtocols();
    return NextResponse.json({ success: true, data: protocols });
  } catch (error) {
    console.error('Get protocols error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, productName = '测试产品', testPeriodDays = 28 } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // 生成分享链接
    const shareLink = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // 创建协议
    const protocol = await protocolManager.createProtocol({
      title,
      description,
      shareLink,
      productName,
      testPeriodDays,
      createdBy: ADMIN_USER_ID,
    });

    // 异步生成问卷（不等待完成，直接返回）
    // 这样用户可以立即看到协议创建成功，问卷在后台生成
    generateQuestionnairesAsync(protocol.id, productName, testPeriodDays);

    return NextResponse.json({ success: true, data: protocol });
  } catch (error) {
    console.error('Create protocol error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 异步生成问卷（后台任务）
 * 只生成第一天的问卷，后续问卷在用户提交前一天答案后才动态生成
 * 这样可以确保第2天及以后的问卷是基于前一天答案的AI分析结果
 */
async function generateQuestionnairesAsync(
  protocolId: string,
  productName: string,
  testPeriodDays: number
) {
  try {
    console.log(`[Async] Starting questionnaire generation for protocol ${protocolId}`);

    // 只生成第一天的问卷（基线问题，不需要AI分析）
    const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
      productName,
      dayIndex: 1,
      testDurationDays: testPeriodDays,
      currentMaterialState: 'new_bag',
      previousAnswers: [],
      historyQuestions: [],
    });

    // 只提取 questions 数组用于存储
    const questionsArray = response.questions;

    // 保存问卷
    await questionnaireManager.createQuestionnaire({
      protocolId,
      dayIndex: 1,
      testDurationDays: testPeriodDays,
      productName,
      questions: questionsArray,
    });

    console.log(`[Async] Generated questionnaire for day 1/${testPeriodDays}`);
    console.log(`[Async] Subsequent questionnaires (Day 2-${testPeriodDays}) will be generated on-demand based on previous day's answers`);
  } catch (error) {
    console.error(`[Async] Failed to generate questionnaire for protocol ${protocolId}:`, error);
  }
}
