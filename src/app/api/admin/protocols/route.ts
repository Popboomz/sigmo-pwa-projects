import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireManager } from '@/storage/database';
import { dynamicQuestionnaireGenerator } from '@/storage/database/dynamicQuestionnaireGenerator';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { createLocalProtocol, listLocalProtocols } from '@/lib/local-admin-store';
import { verifyAdmin } from '@/app/api/middleware';

export async function GET(_request: NextRequest) {
  try {
    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocols = await listLocalProtocols();
      return NextResponse.json({
        success: true,
        data: protocols,
        source: 'local-dev-store',
      });
    }

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
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.success || !adminCheck.userId) {
      return NextResponse.json(
        { error: adminCheck.error || 'No admin permission' },
        { status: adminCheck.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      productName = '测试产品',
      testPeriodDays = 28,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const shareLink = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocol = await createLocalProtocol({
        title,
        description: description ?? null,
        shareLink,
        productName,
        testPeriodDays,
        createdBy: adminCheck.userId,
      });

      return NextResponse.json({
        success: true,
        data: protocol,
        source: 'local-dev-store',
      });
    }

    const protocol = await protocolManager.createProtocol({
      title,
      description,
      shareLink,
      productName,
      testPeriodDays,
      createdBy: adminCheck.userId,
    });

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

async function generateQuestionnairesAsync(
  protocolId: string,
  productName: string,
  testPeriodDays: number
) {
  try {
    console.log(`[Async] Starting questionnaire generation for protocol ${protocolId}`);

    const response = await dynamicQuestionnaireGenerator.generateDailyQuestionnaire({
      productName,
      dayIndex: 1,
      testDurationDays: testPeriodDays,
      currentMaterialState: 'new_bag',
      previousAnswers: [],
      historyQuestions: [],
    });

    const questionsArray = response.questions;

    await questionnaireManager.createQuestionnaire({
      protocolId,
      dayIndex: 1,
      testDurationDays: testPeriodDays,
      productName,
      questions: questionsArray,
    });

    console.log(`[Async] Generated questionnaire for day 1/${testPeriodDays}`);
    console.log(
      `[Async] Subsequent questionnaires (Day 2-${testPeriodDays}) will be generated on-demand based on previous day's answers`
    );
  } catch (error) {
    console.error(`[Async] Failed to generate questionnaire for protocol ${protocolId}:`, error);
  }
}
