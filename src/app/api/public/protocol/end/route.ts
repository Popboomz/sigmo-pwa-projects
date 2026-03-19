import { NextRequest, NextResponse } from 'next/server';

import { protocolManager, questionnaireAnswerManager } from '@/storage/database';
import { getLocalProtocolByShareLink } from '@/lib/local-admin-store';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import {
  endLocalTest,
  getLocalLogsByUser,
  getOrCreateLocalProgress,
} from '@/lib/local-questionnaire-store';

interface EndTestRequest {
  shareLink: string;
  endReason: string;
}

const TEST_ENDED_UUID = '00000000-0000-0000-0000-000000000000';

export async function POST(request: NextRequest) {
  try {
    const body: EndTestRequest = await request.json();
    const { shareLink, endReason } = body;

    if (!shareLink || !endReason?.trim()) {
      return NextResponse.json(
        { error: 'Share link and end reason are required' },
        { status: 400 },
      );
    }

    if (isLocalDevDatabaseFallbackEnabled()) {
      const userId = 'anonymous';
      const protocol = await getLocalProtocolByShareLink(shareLink);

      if (!protocol) {
        return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
      }

      await getOrCreateLocalProgress(userId, protocol.id);
      const progress = await endLocalTest(userId, protocol.id);

      if (!progress) {
        return NextResponse.json({ error: 'Failed to end test' }, { status: 500 });
      }

      const existingLogs = await getLocalLogsByUser(userId, protocol.id);

      return NextResponse.json({
        success: true,
        data: {
          id: TEST_ENDED_UUID,
          questionnaireId: TEST_ENDED_UUID,
          protocolId: protocol.id,
          dayIndex: existingLogs.length + 1,
          answers: [],
          remark: `[提前结束测试] ${endReason.trim()}`,
          submittedAt: new Date().toISOString(),
        },
      });
    }

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);

    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const existingAnswers = await questionnaireAnswerManager.getAnswersByProtocol(protocol.id);
    const dayIndex = existingAnswers.length + 1;

    const endRecord = await questionnaireAnswerManager.createAnswer({
      questionnaireId: TEST_ENDED_UUID,
      protocolId: protocol.id,
      dayIndex,
      answers: [],
      remark: `[提前结束测试] ${endReason.trim()}`,
    });

    return NextResponse.json({
      success: true,
      data: endRecord,
    });
  } catch (error) {
    console.error('End test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
