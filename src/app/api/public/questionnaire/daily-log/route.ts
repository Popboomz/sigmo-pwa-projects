import { NextRequest, NextResponse } from 'next/server';

import {
  dailyLogsManager,
  progressManager,
  protocolManager,
} from '@/storage/database';
import { getLocalProtocolByShareLink } from '@/lib/local-admin-store';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import {
  advanceLocalProgress,
  createLocalDailyLog,
  getCurrentLocalDay,
  getOrCreateLocalProgress,
  hasLocalSubmitted,
  isLocalProgressEnded,
} from '@/lib/local-questionnaire-store';
import {
  calculateStructuredScoresFromAnswers,
  type StructuredScores,
} from '@/lib/questionnaire/themes';
import type {
  LifecyclePhase,
  LogicBranch,
  MaterialState,
} from '@/storage/database/dynamicQuestionnaireGenerator';

interface SubmitDailyLogRequest {
  shareLink: string;
  testDay: number;
  userId?: string;
  answers: Array<{
    questionId: string;
    score: number;
    question: string;
    theme?: string;
  }>;
  structuredScores?: StructuredScores;
  remark?: string;
}

function validateStructuredScores(structuredScores: StructuredScores | undefined) {
  if (!structuredScores) {
    return null;
  }

  const requiredFields: (keyof StructuredScores)[] = [
    'odor',
    'dust',
    'clumping',
    'comfort',
    'cleanup',
  ];

  for (const field of requiredFields) {
    if (
      typeof structuredScores[field] !== 'number' ||
      structuredScores[field] < 1 ||
      structuredScores[field] > 5
    ) {
      return `structuredScores.${field} must be a number between 1 and 5`;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitDailyLogRequest = await request.json();
    const { shareLink, testDay, answers, structuredScores, remark } = body;
    const userId = body.userId || 'anonymous';

    if (!shareLink) {
      return NextResponse.json({ error: 'shareLink is required' }, { status: 400 });
    }

    if (!testDay || testDay < 1) {
      return NextResponse.json(
        { error: 'testDay is required and must be >= 1' },
        { status: 400 },
      );
    }

    if (!Array.isArray(answers) || answers.length !== 5) {
      return NextResponse.json(
        { error: 'Must provide exactly 5 answers' },
        { status: 400 },
      );
    }

    for (const answer of answers) {
      if (!answer.questionId || answer.score === undefined || !answer.question) {
        return NextResponse.json(
          { error: 'Each answer must have questionId, score, and question' },
          { status: 400 },
        );
      }

      if (answer.score < 1 || answer.score > 5) {
        return NextResponse.json({ error: 'Score must be between 1 and 5' }, { status: 400 });
      }
    }

    const structuredScoreError = validateStructuredScores(structuredScores);
    if (structuredScoreError) {
      return NextResponse.json({ error: structuredScoreError }, { status: 400 });
    }

    const scores = structuredScores || calculateStructuredScoresFromAnswers(answers, 3);

    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocol = await getLocalProtocolByShareLink(shareLink);
      if (!protocol) {
        return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
      }

      const progress = await getOrCreateLocalProgress(userId, protocol.id);
      if (isLocalProgressEnded(progress)) {
        return NextResponse.json({ error: '测试已结束，无法继续提交' }, { status: 400 });
      }

      const expectedDay = getCurrentLocalDay(progress);
      if (testDay !== expectedDay) {
        return NextResponse.json(
          {
            error: `今天应该提交第 ${expectedDay} 天，不能提交第 ${testDay} 天`,
            expectedDay,
          },
          { status: 400 },
        );
      }

      if (await hasLocalSubmitted(userId, testDay, protocol.id)) {
        return NextResponse.json(
          { error: `第 ${testDay} 天已提交，请勿重复提交` },
          { status: 400 },
        );
      }

      const nextState = calculateNewState(
        scores,
        testDay,
        protocol.testPeriodDays || 21,
        progress.materialState as MaterialState,
      );

      await createLocalDailyLog({
        userId,
        protocolId: protocol.id,
        testDay,
        answers,
        remark: remark || null,
        structuredScores: scores,
        materialState: nextState.materialState,
        logicBranch: nextState.logicBranch,
        lifecyclePhase: nextState.lifecyclePhase,
        submittedAt: new Date().toISOString(),
      });

      await advanceLocalProgress(userId, protocol.id, testDay, {
        materialState: nextState.materialState,
        logicBranch: nextState.logicBranch,
        lifecyclePhase: nextState.lifecyclePhase,
      });

      return NextResponse.json({
        success: true,
        data: {
          testDay,
          completedDays: progress.completedDays + 1,
          materialState: nextState.materialState,
          lifecyclePhase: nextState.lifecyclePhase,
          logicBranch: nextState.logicBranch,
          submittedAt: new Date().toISOString(),
          source: 'local-dev-store',
        },
      });
    }

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const progress = await progressManager.getOrCreateProgress(userId, protocol.id);
    if (progressManager.isEnded(progress)) {
      return NextResponse.json({ error: '测试已结束，无法继续提交' }, { status: 400 });
    }

    const expectedDay = progressManager.getCurrentDay(progress);
    if (testDay !== expectedDay) {
      return NextResponse.json(
        {
          error: `今天应该提交第 ${expectedDay} 天，不能提交第 ${testDay} 天`,
          expectedDay,
        },
        { status: 400 },
      );
    }

    const existingLog = await dailyLogsManager.hasSubmitted(userId, testDay, protocol.id);
    if (existingLog) {
      return NextResponse.json(
        { error: `第 ${testDay} 天已提交，请勿重复提交` },
        { status: 400 },
      );
    }

    const nextState = calculateNewState(
      scores,
      testDay,
      protocol.testPeriodDays || 21,
      progress.materialState as MaterialState,
    );

    try {
      await dailyLogsManager.createLog({
        userId,
        protocolId: protocol.id,
        testDay,
        answers,
        remark: remark || null,
        structuredScores: scores,
        materialState: nextState.materialState,
        logicBranch: nextState.logicBranch,
        lifecyclePhase: nextState.lifecyclePhase,
        submittedAt: new Date().toISOString(),
      });

      await progressManager.advanceProgress(userId, protocol.id, testDay, {
        materialState: nextState.materialState,
        logicBranch: nextState.logicBranch,
        lifecyclePhase: nextState.lifecyclePhase,
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        return NextResponse.json(
          { error: '今日已提交，请勿重复提交' },
          { status: 400 },
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        testDay,
        completedDays: progress.completedDays + 1,
        materialState: nextState.materialState,
        lifecyclePhase: nextState.lifecyclePhase,
        logicBranch: nextState.logicBranch,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Submit daily log error:', error);
    if (error?.code === '23505') {
      return NextResponse.json({ error: '今日已提交，请勿重复提交' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateNewState(
  scores: StructuredScores,
  currentDay: number,
  testPeriodDays: number,
  currentMaterialState: MaterialState,
): {
  materialState: MaterialState;
  lifecyclePhase: LifecyclePhase;
  logicBranch: LogicBranch;
} {
  let lifecyclePhase: LifecyclePhase;
  if (currentDay <= 7) {
    lifecyclePhase = 'early';
  } else if (currentDay <= 14) {
    lifecyclePhase = 'mid';
  } else {
    lifecyclePhase = 'late';
  }

  let materialState = currentMaterialState;
  if (currentDay === 1) {
    materialState = 'normal';
  } else if (currentDay >= testPeriodDays - 2) {
    materialState = 'nearing_end';
  }

  let logicBranch: LogicBranch = 'normal';
  if (materialState === 'nearing_end' && currentDay >= 18) {
    logicBranch = 'endgame';
  }

  if (currentDay === testPeriodDays && (scores.odor <= 2 || scores.dust <= 2)) {
    logicBranch = 'retrospective';
  }

  return {
    materialState,
    lifecyclePhase,
    logicBranch,
  };
}
