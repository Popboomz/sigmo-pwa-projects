import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireManager, questionnaireAnswerManager } from '@/storage/database';
import type { MaterialState, LogicBranch, LifecyclePhase } from '@/storage/database/dynamicQuestionnaireGenerator';

interface StructuredScores {
  odor: number;
  dust: number;
  clumping: number;
  comfort: number;
  cleanup: number;
}

interface SubmitAnswerRequest {
  shareLink: string;
  dayIndex: number;
  answers: Array<{
    questionId: string;
    score: number;
    question: string;
    theme?: string;
  }>;
  structuredScores?: StructuredScores; // 可选的 5 维度评分
  remark?: string; // 可选的备注字段
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitAnswerRequest = await request.json();
    const { shareLink, dayIndex, answers, structuredScores, remark } = body;

    if (!shareLink) {
      return NextResponse.json(
        { error: 'shareLink is required' },
        { status: 400 }
      );
    }

    if (!dayIndex || dayIndex < 1) {
      return NextResponse.json(
        { error: 'dayIndex is required and must be >= 1' },
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
      const requiredFields: (keyof StructuredScores)[] = ['odor', 'dust', 'clumping', 'comfort', 'cleanup'];
      for (const field of requiredFields) {
        if (typeof structuredScores[field] !== 'number' || structuredScores[field] < 1 || structuredScores[field] > 5) {
          return NextResponse.json(
            { error: `structuredScores.${field} must be a number between 1 and 5` },
            { status: 400 }
          );
        }
      }
    }

    // 查找协议
    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 查找对应的问卷
    const questionnaire = await questionnaireManager.getQuestionnaireByProtocolAndDay(
      protocol.id,
      dayIndex
    );

    if (!questionnaire) {
      return NextResponse.json(
        { error: 'Questionnaire not found for the specified day' },
        { status: 404 }
      );
    }

    // 检查今天是否已提交
    const hasSubmitted = await questionnaireAnswerManager.hasSubmittedToday(
      protocol.id,
      dayIndex
    );

    if (hasSubmitted) {
      return NextResponse.json(
        { error: 'Already submitted for today' },
        { status: 400 }
      );
    }

    // 计算生命周期阶段
    const lifecyclePhase: LifecyclePhase = calculateLifecyclePhase(dayIndex);

    // 从协议获取物料状态
    let materialState: MaterialState = protocol.materialState as MaterialState || 'new_bag';
    let logicBranch: LogicBranch = 'normal';

    // 如果 protocol 有结构化评分，可以用来判断逻辑分支
    const previousAnswers = await questionnaireAnswerManager.getAnswersByProtocol(protocol.id);
    if (previousAnswers.length > 0) {
      const latestAnswer = previousAnswers[previousAnswers.length - 1];
      if (latestAnswer.structuredScores) {
        const scores = latestAnswer.structuredScores as StructuredScores;
        logicBranch = calculateLogicBranch(materialState, dayIndex, scores);
      }
    }

    // 创建答案记录
    const answerRecord = await questionnaireAnswerManager.createAnswer({
      questionnaireId: questionnaire.id,
      protocolId: protocol.id,
      dayIndex,
      answers,
      structuredScores: structuredScores || null,
      materialState,
      lifecyclePhase,
      logicBranch,
      remark: remark || null,
      isLegacy: false,
    });

    // 更新协议的物料状态（不可逆）
    if (materialState !== protocol.materialState) {
      await protocolManager.updateProtocolMaterialState(protocol.id, materialState);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: answerRecord.id,
        dayIndex,
        materialState,
        lifecyclePhase,
        logicBranch,
        submittedAt: answerRecord.submittedAt,
      },
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 计算生命周期阶段
 */
function calculateLifecyclePhase(dayIndex: number): LifecyclePhase {
  if (dayIndex <= 7) {
    return 'early';
  } else if (dayIndex <= 14) {
    return 'mid';
  } else {
    return 'late';
  }
}

/**
 * 计算逻辑分支
 */
function calculateLogicBranch(
  materialState: MaterialState,
  dayIndex: number,
  scores?: StructuredScores,
): LogicBranch {
  // endgame: nearing_end 状态且 day >= 18
  if (materialState === 'nearing_end' && dayIndex >= 18) {
    return 'endgame';
  }

  // retrospective: 第 21 天且除臭或扬尘评分 <= 2
  if (dayIndex === 21 && scores) {
    if (scores.odor <= 2 || scores.dust <= 2) {
      return 'retrospective';
    }
  }

  return 'normal';
}
