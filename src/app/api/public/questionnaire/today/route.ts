import { NextRequest, NextResponse } from 'next/server';
import {
  protocolManager,
  progressManager,
  questionsSnapshotManager,
  dailyLogsManager,
} from '@/storage/database';
import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';

/**
 * 获取今日问卷
 *
 * 流程：
 * 1. 验证协议是否存在
 * 2. 获取或创建用户进度记录
 * 3. 检查物料状态是否为 ended
 * 4. 计算 currentDay = lastSubmittedDay + 1
 * 5. 检查 currentDay 是否超过测试周期
 * 6. 查询 questions_snapshot 是否存在快照
 * 7. 如果快照存在，返回快照中的问题
 * 8. 如果快照不存在：
 *    a. 获取前一天答案
 *    b. 调用 LLM 生成问题
 *    c. 写入 questions_snapshot 快照
 * 9. 返回问题列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareLink = searchParams.get('shareLink');
    const userId = searchParams.get('userId') || 'anonymous';

    if (!shareLink) {
      return NextResponse.json(
        { error: 'shareLink is required' },
        { status: 400 }
      );
    }

    // 1. 验证协议
    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 2. 获取或创建进度
    const progress = await progressManager.getOrCreateProgress(
      userId,
      protocol.id
    );

    // 3. 检查是否已结束
    if (progressManager.isEnded(progress)) {
      return NextResponse.json({
        success: true,
        state: 'ended',
        message: '测试已结束',
        completedDays: progress.completedDays,
        testPeriodDays: protocol.testPeriodDays,
        questions: [],
      });
    }

    // 4. 计算 currentDay
    const currentDay = progressManager.getCurrentDay(progress);
    const testPeriodDays = protocol.testPeriodDays || 21;

    // 5. 检查是否超过测试周期
    if (currentDay > testPeriodDays) {
      // 自动标记为结束
      await progressManager.endTest(userId, protocol.id);

      return NextResponse.json({
        success: true,
        state: 'ended',
        message: '测试已结束',
        completedDays: progress.completedDays,
        testPeriodDays: testPeriodDays,
        questions: [],
      });
    }

    // 6. 查询快照
    const existingSnapshot = await questionsSnapshotManager.getSnapshot(
      userId,
      currentDay
    );

    if (existingSnapshot) {
      // 返回快照中的问题
      return NextResponse.json({
        success: true,
        state: 'normal',
        questions: existingSnapshot.questions,
        testDay: currentDay,
        isGenerated: false,
        materialState: progress.materialState,
        lifecyclePhase: progress.lifecyclePhase,
        logicBranch: progress.logicBranch,
        completedDays: progress.completedDays,
        testPeriodDays: testPeriodDays,
      });
    }

    // 7. 获取前一天答案（用于生成新问题）
    let previousAnswers: any[] = [];

    if (currentDay > 1) {
      const previousLog = await dailyLogsManager.getPreviousLog(
        userId,
        currentDay
      );

      if (previousLog && previousLog.answers) {
        previousAnswers = previousLog.answers as any[];
      }
    }

    // 获取历史问题列表（用于避免重复）
    let historyQuestions: string[] = [];

    if (currentDay > 1) {
      const allSnapshots = await questionsSnapshotManager.getSnapshotsByUser(userId);

      // 提取之前所有的问题标题
      if (allSnapshots && allSnapshots.length > 0) {
        historyQuestions = allSnapshots
          .filter((s) => s.testDay < currentDay)
          .flatMap((s) =>
            (s.questions as any[] || []).map((q: any) => q.title)
          );
      }
    }

    // 8. 调用 LLM 生成问题
    const productName = protocol.productName || '测试产品';

    console.log(`[GetTodayQuestions] Generating questions for day ${currentDay} with ${previousAnswers.length} previous answers`);

    const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
      productName,
      dayIndex: currentDay,
      testDurationDays: testPeriodDays,
      currentMaterialState: (progress.materialState || 'new_bag') as any,
      previousAnswers,
      historyQuestions,
    });

    const questionsArray = response.questions;

    // 9. 写入快照
    const snapshot = await questionsSnapshotManager.createSnapshot({
      userId,
      protocolId: protocol.id,
      testDay: currentDay,
      questions: questionsArray,
      generationContext: {
        materialState: progress.materialState,
        logicBranch: progress.logicBranch,
        previousAnswers,
        historyQuestions,
      },
      generatedAt: new Date().toISOString(),
    });

    // 10. 返回问题
    return NextResponse.json({
      success: true,
      state: 'normal',
      questions: snapshot.questions,
      testDay: currentDay,
      isGenerated: true,
      materialState: progress.materialState,
      lifecyclePhase: progress.lifecyclePhase,
      logicBranch: progress.logicBranch,
      completedDays: progress.completedDays,
      testPeriodDays: testPeriodDays,
    });
  } catch (error) {
    console.error('Get today questions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
