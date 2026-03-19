import { NextRequest, NextResponse } from 'next/server';

import {
  protocolManager,
  questionnaireAnswerManager,
  questionnaireManager,
} from '@/storage/database';
import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';
import { normalizeQuestionsTheme } from '@/lib/questionnaire/themes';

function mapHistoryFromLegacyAnswers(answers: any[]) {
  return answers.map((answer) => ({
    testDay: answer.dayIndex,
    structuredScores: answer.structuredScores as any,
    answers: (answer.answers as any[]) || [],
    remark: answer.remark,
  }));
}

function mapQuestionHistory(questionnaires: any[]) {
  return questionnaires.flatMap((questionnaire) =>
    ((questionnaire.questions as any[]) || []).map((question: any) => ({
      testDay: questionnaire.dayIndex,
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
    const dayIndex = parseInt(searchParams.get('dayIndex') || '1', 10);

    if (!shareLink) {
      return NextResponse.json({ error: 'shareLink is required' }, { status: 400 });
    }

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const existingQuestionnaire = await questionnaireManager.getQuestionnaireByProtocolAndDay(
      protocol.id,
      dayIndex,
    );

    if (existingQuestionnaire) {
      return NextResponse.json({
        success: true,
        data: {
          ...existingQuestionnaire,
          questions: normalizeQuestionsTheme((existingQuestionnaire.questions as any[]) || []),
        },
      });
    }

    const allAnswers = await questionnaireAnswerManager.getAnswersByProtocol(protocol.id);
    const previousQuestionnaires = await questionnaireManager.getQuestionnairesByProtocol(protocol.id);

    const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
      productName: protocol.productName || '测试产品',
      dayIndex,
      testDurationDays: protocol.testPeriodDays || 28,
      currentMaterialState: (protocol.materialState || 'new_bag') as any,
      answerHistory: mapHistoryFromLegacyAnswers(
        allAnswers.filter((answer) => answer.dayIndex < dayIndex),
      ),
      questionHistory: mapQuestionHistory(
        previousQuestionnaires.filter((questionnaire) => questionnaire.dayIndex < dayIndex),
      ),
    });

    const questionnaire = await questionnaireManager.createQuestionnaire({
      protocolId: protocol.id,
      dayIndex,
      testDurationDays: protocol.testPeriodDays || 28,
      productName: protocol.productName || '测试产品',
      questions: response.questions,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...questionnaire,
        questions: normalizeQuestionsTheme((questionnaire.questions as any[]) || []),
      },
    });
  } catch (error) {
    console.error('Get dynamic questionnaire error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
