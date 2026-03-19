import { NextRequest, NextResponse } from 'next/server';

import {
  dailyLogsManager,
  progressManager,
  protocolManager,
  questionsSnapshotManager,
} from '@/storage/database';
import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';
import { QuestionTemplateManager } from '@/storage/database/questionTemplateManager';
import { normalizeQuestionsTheme } from '@/lib/questionnaire/themes';
import {
  isLocalDevDatabaseFallbackEnabled,
  isLocalDevQuestionnaireMockEnabled,
} from '@/lib/local-dev-db';
import { getLocalProtocolByShareLink } from '@/lib/local-admin-store';
import {
  createLocalSnapshot,
  endLocalTest,
  getCurrentLocalDay,
  getLocalSnapshot,
  getLocalSnapshotsByUser,
  getLocalLogsByUser,
  getOrCreateLocalProgress,
  isLocalProgressEnded,
} from '@/lib/local-questionnaire-store';

function getMockQuestions() {
  return normalizeQuestionsTheme(QuestionTemplateManager.getDay1BaselineQuestions());
}

function mapHistoryFromLogs(logs: any[]) {
  return logs.map((log) => ({
    testDay: log.testDay,
    structuredScores: log.structuredScores as any,
    answers: (log.answers as any[]) || [],
    remark: log.remark,
  }));
}

function mapQuestionHistoryFromSnapshots(snapshots: any[]) {
  return snapshots.flatMap((snapshot) =>
    ((snapshot.questions as any[]) || []).map((question: any) => ({
      testDay: snapshot.testDay,
      id: question.id,
      theme: question.theme,
      title: question.title,
    })),
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareLink = searchParams.get('shareLink');
    const userId = searchParams.get('userId') || 'anonymous';

    if (!shareLink) {
      return NextResponse.json({ error: 'shareLink is required' }, { status: 400 });
    }

    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocol = await getLocalProtocolByShareLink(shareLink);
      if (!protocol) {
        return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
      }

      if (isLocalDevQuestionnaireMockEnabled()) {
        return NextResponse.json({
          success: true,
          state: 'normal',
          questions: getMockQuestions(),
          testDay: 1,
          isGenerated: false,
          materialState: 'new_bag',
          lifecyclePhase: 'early',
          logicBranch: 'normal',
          completedDays: 0,
          testPeriodDays: protocol.testPeriodDays || 21,
          source: 'local-dev-questionnaire-mock',
          generationStrategy: 'baseline',
        });
      }

      const progress = await getOrCreateLocalProgress(userId, protocol.id);
      if (isLocalProgressEnded(progress)) {
        return NextResponse.json({
          success: true,
          state: 'ended',
          message: '测试已结束',
          completedDays: progress.completedDays,
          testPeriodDays: protocol.testPeriodDays,
          questions: [],
        });
      }

      const currentDay = getCurrentLocalDay(progress);
      const testPeriodDays = protocol.testPeriodDays || 21;

      if (currentDay > testPeriodDays) {
        await endLocalTest(userId, protocol.id);
        return NextResponse.json({
          success: true,
          state: 'ended',
          message: '测试已结束',
          completedDays: progress.completedDays,
          testPeriodDays,
          questions: [],
        });
      }

      const existingSnapshot = await getLocalSnapshot(userId, currentDay);
      if (existingSnapshot) {
        return NextResponse.json({
          success: true,
          state: 'normal',
          questions: normalizeQuestionsTheme((existingSnapshot.questions as any[]) || []),
          testDay: currentDay,
          isGenerated: false,
          materialState: progress.materialState,
          lifecyclePhase: progress.lifecyclePhase,
          logicBranch: progress.logicBranch,
          completedDays: progress.completedDays,
          testPeriodDays,
          generationStrategy: 'snapshot',
          source: 'local-dev-store',
        });
      }

      const logs = await getLocalLogsByUser(userId, protocol.id);
      const snapshots = await getLocalSnapshotsByUser(userId);

      const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
        productName: protocol.productName || '测试产品',
        dayIndex: currentDay,
        testDurationDays: testPeriodDays,
        currentMaterialState: (progress.materialState || 'new_bag') as any,
        answerHistory: mapHistoryFromLogs(logs),
        questionHistory: mapQuestionHistoryFromSnapshots(
          snapshots.filter((snapshot) => snapshot.testDay < currentDay),
        ),
      });

      const snapshot = await createLocalSnapshot({
        userId,
        protocolId: protocol.id,
        testDay: currentDay,
        questions: response.questions,
        generationContext: {
          materialState: progress.materialState,
          logicBranch: progress.logicBranch,
          answerHistoryLength: logs.length,
        },
        validation: null,
        source: response.generationStrategy,
        generatedAt: new Date().toISOString(),
      } as any);

      return NextResponse.json({
        success: true,
        state: 'normal',
        questions: normalizeQuestionsTheme((snapshot.questions as any[]) || []),
        testDay: currentDay,
        isGenerated: true,
        materialState: progress.materialState,
        lifecyclePhase: progress.lifecyclePhase,
        logicBranch: progress.logicBranch,
        completedDays: progress.completedDays,
        testPeriodDays,
        generationStrategy: response.generationStrategy,
        questionSourceDetails: response.questionSourceDetails,
        source: 'local-dev-store',
      });
    }

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const progress = await progressManager.getOrCreateProgress(userId, protocol.id);
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

    const currentDay = progressManager.getCurrentDay(progress);
    const testPeriodDays = protocol.testPeriodDays || 21;

    if (currentDay > testPeriodDays) {
      await progressManager.endTest(userId, protocol.id);
      return NextResponse.json({
        success: true,
        state: 'ended',
        message: '测试已结束',
        completedDays: progress.completedDays,
        testPeriodDays,
        questions: [],
      });
    }

    const existingSnapshot = await questionsSnapshotManager.getSnapshot(userId, currentDay);
    if (existingSnapshot) {
      return NextResponse.json({
        success: true,
        state: 'normal',
        questions: normalizeQuestionsTheme((existingSnapshot.questions as any[]) || []),
        testDay: currentDay,
        isGenerated: false,
        materialState: progress.materialState,
        lifecyclePhase: progress.lifecyclePhase,
        logicBranch: progress.logicBranch,
        completedDays: progress.completedDays,
        testPeriodDays,
        generationStrategy: 'snapshot',
      });
    }

    const allLogs = await dailyLogsManager.getLogsByUser(userId);
    const relevantLogs = allLogs.filter((log) => log.protocolId === protocol.id && log.testDay < currentDay);
    const allSnapshots = await questionsSnapshotManager.getSnapshotsByUser(userId);
    const previousSnapshots = allSnapshots.filter((snapshot) => snapshot.testDay < currentDay);

    const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
      productName: protocol.productName || '测试产品',
      dayIndex: currentDay,
      testDurationDays: testPeriodDays,
      currentMaterialState: (progress.materialState || 'new_bag') as any,
      answerHistory: mapHistoryFromLogs(relevantLogs),
      questionHistory: mapQuestionHistoryFromSnapshots(previousSnapshots),
    });

    const snapshot = await questionsSnapshotManager.getOrCreateSnapshot({
      userId,
      protocolId: protocol.id,
      testDay: currentDay,
      questions: response.questions,
      generationContext: {
        materialState: progress.materialState,
        logicBranch: progress.logicBranch,
        answerHistoryLength: relevantLogs.length,
        questionHistoryLength: previousSnapshots.length,
        generationStrategy: response.generationStrategy,
        questionSourceDetails: response.questionSourceDetails,
      },
      generatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      state: 'normal',
      questions: normalizeQuestionsTheme((snapshot.questions as any[]) || []),
      testDay: currentDay,
      isGenerated: true,
      materialState: progress.materialState,
      lifecyclePhase: progress.lifecyclePhase,
      logicBranch: progress.logicBranch,
      completedDays: progress.completedDays,
      testPeriodDays,
      generationStrategy: response.generationStrategy,
      questionSourceDetails: response.questionSourceDetails,
    });
  } catch (error) {
    console.error('Get today questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
