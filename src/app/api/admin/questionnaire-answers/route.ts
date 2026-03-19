import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, dailyLogsManager } from '@/storage/database';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { getLocalProtocolById } from '@/lib/local-admin-store';
import { getLocalLogsByProtocol } from '@/lib/local-questionnaire-store';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const protocolId = searchParams.get('protocolId');

    if (!protocolId) {
      return NextResponse.json(
        { error: 'protocolId is required' },
        { status: 400 }
      );
    }

    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocol = await getLocalProtocolById(protocolId);
      if (!protocol) {
        return NextResponse.json(
          { error: 'Protocol not found' },
          { status: 404 }
        );
      }

      const localLogs = await getLocalLogsByProtocol(protocolId);
      const localAnswers = localLogs.map((log) => ({
        id: log.id,
        questionnaireId: log.id,
        protocolId: log.protocolId,
        dayIndex: log.testDay,
        answers: log.answers,
        remark: log.remark,
        submittedAt: log.submittedAt,
        structuredScores: log.structuredScores,
        materialState: log.materialState,
        lifecyclePhase: log.lifecyclePhase,
        logicBranch: log.logicBranch,
        isLegacy: false,
      }));

      return NextResponse.json({
        success: true,
        data: localAnswers,
        source: 'local-dev-store',
      });
    }

    const protocol = await protocolManager.getProtocolById(protocolId);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    const dailyLogs = await dailyLogsManager.getLogsByProtocol(protocolId);

    const answers = dailyLogs.map((log) => ({
      id: log.id,
      questionnaireId: log.id,
      protocolId: log.protocolId,
      dayIndex: log.testDay,
      answers: log.answers,
      remark: log.remark,
      submittedAt: log.submittedAt,
      structuredScores: log.structuredScores,
      materialState: log.materialState,
      lifecyclePhase: log.lifecyclePhase,
      logicBranch: log.logicBranch,
      isLegacy: false,
    }));

    return NextResponse.json({
      success: true,
      data: answers,
    });
  } catch (error) {
    console.error('Get questionnaire answers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
