import { NextRequest, NextResponse } from 'next/server';

import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';

interface GenerateQuestionsRequest {
  dayIndex: number;
  testDurationDays: number;
  productName?: string;
  prevDayAnswers?: {
    q1Score?: number;
    q2Score?: number;
    q3Score?: number;
    q4Score?: number;
    q5Score?: number;
  };
  history?: Array<{
    dayIndex: number;
    questions: Array<{
      id: string;
      theme?: string;
      title: string;
    }>;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuestionsRequest = await request.json();
    const { dayIndex, testDurationDays, productName, prevDayAnswers, history } = body;

    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      return NextResponse.json({ error: 'dayIndex must be >= 1' }, { status: 400 });
    }

    const answerHistory =
      dayIndex > 1 && prevDayAnswers
        ? [
            {
              testDay: dayIndex - 1,
              structuredScores: {
                odor: prevDayAnswers.q1Score ?? 3,
                dust: prevDayAnswers.q2Score ?? 3,
                clumping: prevDayAnswers.q3Score ?? 3,
                cleanup: prevDayAnswers.q4Score ?? 3,
                comfort: prevDayAnswers.q5Score ?? 3,
              },
              remark: null,
            },
          ]
        : [];

    const questionHistory =
      history?.flatMap((item) =>
        item.questions.map((question) => ({
          testDay: item.dayIndex,
          id: question.id,
          theme: question.theme,
          title: question.title,
        })),
      ) || [];

    const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
      productName: productName || '猫砂',
      dayIndex,
      testDurationDays,
      currentMaterialState: 'new_bag',
      answerHistory,
      questionHistory,
    });

    return NextResponse.json({
      success: true,
      data: {
        dayIndex,
        questions: response.questions,
        avoidRepeatCheck: response.avoidRepeatCheck,
        generationStrategy: response.generationStrategy,
      },
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
