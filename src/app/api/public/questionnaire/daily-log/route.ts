import { NextRequest, NextResponse } from 'next/server';
import {
  protocolManager,
  progressManager,
  dailyLogsManager,
} from '@/storage/database';
import type { MaterialState, LogicBranch, LifecyclePhase } from '@/storage/database/dynamicQuestionnaireGenerator';

interface StructuredScores {
  odor: number;
  dust: number;
  clumping: number;
  comfort: number;
  cleanup: number;
}

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

/**
 * 提交每日日志
 *
 * 流程：
 * 1. 验证协议是否存在
 * 2. 获取用户进度记录
 * 3. 检查物料状态是否为 ended
 * 4. 计算 expectedDay = lastSubmittedDay + 1
 * 5. 检查 daily_logs 是否已存在（testDay = expectedDay）
 * 6. 计算新状态（materialState, logicBranch, lifecyclePhase）
 * 7. 开始事务
 * 8. 插入 daily_logs 记录
 * 9. 更新 progress 记录
 * 10. 提交事务
 * 11. 返回提交成功
 */
export async function POST(request: NextRequest) {
  try {
    const body: SubmitDailyLogRequest = await request.json();
    const { shareLink, testDay, answers, structuredScores, remark } = body;

    if (!shareLink) {
      return NextResponse.json(
        { error: 'shareLink is required' },
        { status: 400 }
      );
    }

    if (!testDay || testDay < 1) {
      return NextResponse.json(
        { error: 'testDay is required and must be >= 1' },
        { status: 400 }
      );
    }

    if (!answers || !Array.isArray(answers) || answers.length !== 5) {
      return NextResponse.json(
        { error: 'Must provide exactly 5 answers' },
        { status: 400 }
      );
    }

    // 验证每个答案
    for (const answer of answers) {
      if (!answer.questionId || answer.score === undefined || !answer.question) {
        return NextResponse.json(
          { error: 'Each answer must have questionId, score, and question' },
          { status: 400 }
        );
      }

      if (answer.score < 1 || answer.score > 5) {
        return NextResponse.json(
          { error: 'Score must be between 1 and 5' },
          { status: 400 }
        );
      }
    }

    // 验证 5 维度评分（如果提供）
    if (structuredScores) {
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
          return NextResponse.json(
            {
              error: `structuredScores.${field} must be a number between 1 and 5`,
            },
            { status: 400 }
          );
        }
      }
    }

    const userId = body.userId || 'anonymous';

    // 1. 验证协议
    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // 2. 获取进度
    const progress = await progressManager.getOrCreateProgress(
      userId,
      protocol.id
    );

    // 3. 检查是否已结束
    if (progressManager.isEnded(progress)) {
      return NextResponse.json(
        { error: '测试已结束，无法继续提交' },
        { status: 400 }
      );
    }

    // 4. 计算 expectedDay
    const expectedDay = progressManager.getCurrentDay(progress);

    // 5. 检查是否已提交（幂等）
    if (testDay !== expectedDay) {
      return NextResponse.json(
        {
          error: `今天应该提交第 ${expectedDay} 天，不能提交第 ${testDay} 天`,
          expectedDay,
        },
        { status: 400 }
      );
    }

    const existingLog = await dailyLogsManager.hasSubmitted(userId, testDay, protocol.id);
    if (existingLog) {
      return NextResponse.json(
        { error: `第 ${testDay} 天已提交，请勿重复提交` },
        { status: 400 }
      );
    }

    // 6. 计算结构化评分和新状态
    const scores = structuredScores || calculateStructuredScores(answers);

    const testPeriodDays = protocol.testPeriodDays || 21;

    const newState = calculateNewState(
      scores,
      testDay,
      testPeriodDays,
      progress.materialState as MaterialState
    );

    // 7. 开始事务（通过 Manager 方法实现）
    try {
      // 8. 插入 daily_logs
      await dailyLogsManager.createLog({
        userId,
        protocolId: protocol.id,
        testDay,
        answers,
        remark: remark || null,
        structuredScores: scores,
        materialState: newState.materialState,
        logicBranch: newState.logicBranch,
        lifecyclePhase: newState.lifecyclePhase,
        submittedAt: new Date().toISOString(),
      });

      // 9. 更新 progress
      await progressManager.advanceProgress(
        userId,
        protocol.id,
        testDay,
        {
          materialState: newState.materialState,
          logicBranch: newState.logicBranch,
          lifecyclePhase: newState.lifecyclePhase,
        }
      );
    } catch (error: any) {
      // 检查是否是唯一约束冲突（重复提交）
      if (error?.code === '23505') {
        return NextResponse.json(
          { error: '今日已提交，请勿重复提交' },
          { status: 400 }
        );
      }
      throw error; // 重新抛出其他错误
    }

    // 11. 返回成功
    return NextResponse.json({
      success: true,
      data: {
        testDay,
        completedDays: progress.completedDays + 1,
        materialState: newState.materialState,
        lifecyclePhase: newState.lifecyclePhase,
        logicBranch: newState.logicBranch,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Submit daily log error:', error);

    // 检查是否是唯一约束冲突（重复提交）
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: '今日已提交，请勿重复提交' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 从答案数组计算结构化评分（如果没有提供）
 */
function calculateStructuredScores(
  answers: Array<{ score: number; theme?: string }>
): StructuredScores {
  // 默认使用前 5 个答案的评分
  const scores: StructuredScores = {
    odor: 5,
    dust: 5,
    clumping: 5,
    comfort: 5,
    cleanup: 5,
  };

  const themeMap: Record<string, keyof StructuredScores> = {
    odor: 'odor',
    dust: 'dust',
    clumping: 'clumping',
    comfort: 'comfort',
    cleanup: 'cleanup',
  };

  answers.forEach((answer, index) => {
    const theme = answer.theme;
    if (theme && themeMap[theme]) {
      scores[themeMap[theme]] = answer.score;
    } else if (index < 5) {
      // 如果没有 theme，按顺序分配
      const themes: (keyof StructuredScores)[] = [
        'odor',
        'dust',
        'clumping',
        'comfort',
        'cleanup',
      ];
      scores[themes[index]] = answer.score;
    }
  });

  return scores;
}

/**
 * 计算新状态
 */
function calculateNewState(
  scores: StructuredScores,
  currentDay: number,
  testPeriodDays: number,
  currentMaterialState: MaterialState
): {
  materialState: MaterialState;
  lifecyclePhase: LifecyclePhase;
  logicBranch: LogicBranch;
} {
  // 计算生命周期阶段
  let lifecyclePhase: LifecyclePhase;

  if (currentDay <= 7) {
    lifecyclePhase = 'early';
  } else if (currentDay <= 14) {
    lifecyclePhase = 'mid';
  } else {
    lifecyclePhase = 'late';
  }

  // 计算物料状态
  let materialState = currentMaterialState;

  if (currentDay === 1) {
    materialState = 'normal';
  } else if (currentDay >= testPeriodDays - 2) {
    materialState = 'nearing_end';
  }

  // 计算逻辑分支
  let logicBranch: LogicBranch = 'normal';

  // endgame: nearing_end 状态且 day >= 18
  if (materialState === 'nearing_end' && currentDay >= 18) {
    logicBranch = 'endgame';
  }

  // retrospective: 最后一天且除臭或扬尘评分 <= 2
  if (currentDay === testPeriodDays) {
    if (scores.odor <= 2 || scores.dust <= 2) {
      logicBranch = 'retrospective';
    }
  }

  return {
    materialState,
    lifecyclePhase,
    logicBranch,
  };
}
