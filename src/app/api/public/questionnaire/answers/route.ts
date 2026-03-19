import { NextRequest, NextResponse } from 'next/server';

import { protocolManager, questionnaireAnswerManager } from '@/storage/database';
import { getLocalProtocolByShareLink } from '@/lib/local-admin-store';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import {
  getLocalLogsByUser,
  getLocalProgressByProtocol,
} from '@/lib/local-questionnaire-store';

const TEST_ENDED_UUID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareLink = searchParams.get('shareLink');

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link is required' }, { status: 400 });
    }

    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocol = await getLocalProtocolByShareLink(shareLink);

      if (!protocol) {
        return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
      }

      const userId = 'anonymous';
      const logs = await getLocalLogsByUser(userId, protocol.id);
      const progressRecords = await getLocalProgressByProtocol(protocol.id);
      const progress = progressRecords.find((item) => item.userId === userId) || null;

      return NextResponse.json({
        success: true,
        data: logs.map((log) => ({
          id: log.id,
          questionnaireId: `local-day-${log.testDay}`,
          protocolId: log.protocolId,
          dayIndex: log.testDay,
          answers: log.answers,
          submittedAt: log.submittedAt,
          remark: log.remark,
          structuredScores: log.structuredScores,
          materialState: log.materialState,
          lifecyclePhase: log.lifecyclePhase,
          logicBranch: log.logicBranch,
          isLegacy: false,
        })),
        hasEndedTest: progress?.materialState === 'ended',
      });
    }

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);

    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const answers = await questionnaireAnswerManager.getAnswersByProtocol(protocol.id);
    const validAnswers = answers.filter((answer) => answer.questionnaireId !== TEST_ENDED_UUID);
    const hasEndedTest = answers.some((answer) => answer.questionnaireId === TEST_ENDED_UUID);

    return NextResponse.json({
      success: true,
      data: validAnswers,
      hasEndedTest,
    });
  } catch (error) {
    console.error('Get answers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
