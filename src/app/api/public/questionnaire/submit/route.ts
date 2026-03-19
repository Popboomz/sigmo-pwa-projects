import { NextRequest, NextResponse } from 'next/server';

import {
  protocolManager,
  questionnaireAnswerManager,
  questionnaireManager,
} from '@/storage/database';
import {
  calculateStructuredScoresFromAnswers,
  type StructuredScores,
} from '@/lib/questionnaire/themes';
import type {
  LifecyclePhase,
  LogicBranch,
  MaterialState,
} from '@/storage/database/dynamicQuestionnaireGenerator';

interface SubmitAnswerRequest {
  shareLink: string;
  dayIndex: number;
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
    const body: SubmitAnswerRequest = await request.json();
    const { shareLink, dayIndex, answers, structuredScores, remark } = body;

    if (!shareLink) {
      return NextResponse.json({ error: 'shareLink is required' }, { status: 400 });
    }

    if (!dayIndex || dayIndex < 1) {
      return NextResponse.json(
        { error: 'dayIndex is required and must be >= 1' },
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

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const questionnaire = await questionnaireManager.getQuestionnaireByProtocolAndDay(
      protocol.id,
      dayIndex,
    );

    if (!questionnaire) {
      return NextResponse.json(
        { error: 'Questionnaire not found for the specified day' },
        { status: 404 },
      );
    }

    const hasSubmitted = await questionnaireAnswerManager.hasSubmittedToday(
      protocol.id,
      dayIndex,
    );

    if (hasSubmitted) {
      return NextResponse.json(
        { error: 'Already submitted for today' },
        { status: 400 },
      );
    }

    const lifecyclePhase = calculateLifecyclePhase(dayIndex);
    const materialState = (protocol.materialState as MaterialState) || 'new_bag';
    let logicBranch: LogicBranch = 'normal';

    const previousAnswers = await questionnaireAnswerManager.getAnswersByProtocol(protocol.id);
    if (previousAnswers.length > 0) {
      const latestAnswer = previousAnswers[previousAnswers.length - 1];
      if (latestAnswer.structuredScores) {
        logicBranch = calculateLogicBranch(
          materialState,
          dayIndex,
          latestAnswer.structuredScores as StructuredScores,
        );
      }
    }

    const answerRecord = await questionnaireAnswerManager.createAnswer({
      questionnaireId: questionnaire.id,
      protocolId: protocol.id,
      dayIndex,
      answers,
      structuredScores: structuredScores || calculateStructuredScoresFromAnswers(answers, 3),
      materialState,
      lifecyclePhase,
      logicBranch,
      remark: remark || null,
      isLegacy: false,
    });

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateLifecyclePhase(dayIndex: number): LifecyclePhase {
  if (dayIndex <= 7) {
    return 'early';
  }
  if (dayIndex <= 14) {
    return 'mid';
  }
  return 'late';
}

function calculateLogicBranch(
  materialState: MaterialState,
  dayIndex: number,
  scores?: StructuredScores,
): LogicBranch {
  if (materialState === 'nearing_end' && dayIndex >= 18) {
    return 'endgame';
  }

  if (dayIndex === 21 && scores && (scores.odor <= 2 || scores.dust <= 2)) {
    return 'retrospective';
  }

  return 'normal';
}
