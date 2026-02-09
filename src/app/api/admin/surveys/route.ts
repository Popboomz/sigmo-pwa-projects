import { NextRequest, NextResponse } from 'next/server';
import { surveyManager } from '@/storage/database';

interface Question {
  id: string;
  theme: string;
  title: string;
  options: string[];
  followupRule: string;
}

interface CreateSurveyRequest {
  protocolId: string;
  dayIndex: number;
  questions: Question[];
  testDurationDays?: number;
  productName?: string;
}

export async function GET(request: NextRequest) {
  try {
    const surveys = await surveyManager.getAllSurveys();
    return NextResponse.json({ success: true, data: surveys });
  } catch (error) {
    console.error('Get surveys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSurveyRequest = await request.json();
    const { protocolId, dayIndex, questions, testDurationDays = 7, productName = '' } = body;

    if (!protocolId || dayIndex === undefined || !questions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 验证协议是否存在
    const { protocolManager, questionnaireManager } = await import('@/storage/database');
    const protocol = await protocolManager.getProtocolById(protocolId);

    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 创建问卷（使用 questionnaireManager）
    const questionnaire = await questionnaireManager.createQuestionnaire({
      protocolId,
      dayIndex,
      testDurationDays,
      productName,
      questions,
    });

    return NextResponse.json({
      success: true,
      data: questionnaire,
    });
  } catch (error) {
    console.error('Create survey error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
