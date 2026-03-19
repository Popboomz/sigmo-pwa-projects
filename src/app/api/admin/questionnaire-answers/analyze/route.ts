import { NextRequest, NextResponse } from 'next/server';

import { dailyLogsManager, protocolManager } from '@/storage/database';
import { getLocalProtocolById } from '@/lib/local-admin-store';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { getLocalLogsByProtocol } from '@/lib/local-questionnaire-store';
import { analyzeQuestionnaireAnswers } from '@/lib/questionnaire/answerAnalysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { protocolId } = body;

    if (!protocolId) {
      return NextResponse.json({ error: 'protocolId is required' }, { status: 400 });
    }

    const protocol = isLocalDevDatabaseFallbackEnabled()
      ? await getLocalProtocolById(protocolId)
      : await protocolManager.getProtocolById(protocolId);

    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const answers = isLocalDevDatabaseFallbackEnabled()
      ? await getLocalLogsByProtocol(protocolId)
      : await dailyLogsManager.getLogsByProtocol(protocolId);

    if (answers.length === 0) {
      return NextResponse.json(
        { error: 'No questionnaire answers found', success: false },
        { status: 404 },
      );
    }

    const { analysis } = await analyzeQuestionnaireAnswers(protocol, answers as any[]);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Analyze questionnaire answers error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
