import { NextRequest, NextResponse } from 'next/server';
import { protocolManager } from '@/storage/database';
import { eq } from 'drizzle-orm';
import { getDb } from 'coze-coding-dev-sdk';
import { questionnaires, questionnaireAnswers, logs } from '@/storage/database/shared/schema';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { deleteLocalProtocol, getLocalProtocolById } from '@/lib/local-admin-store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json(
        { error: 'No admin permission' },
        { status: 403 }
      );
    }

    const { id: protocolId } = await params;

    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocol = await getLocalProtocolById(protocolId);
      if (!protocol) {
        return NextResponse.json(
          { error: 'Protocol not found' },
          { status: 404 }
        );
      }

      await deleteLocalProtocol(protocolId);

      return NextResponse.json({
        success: true,
        message: 'Protocol deleted successfully',
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

    const db = await getDb();

    await db
      .delete(questionnaireAnswers)
      .where(eq(questionnaireAnswers.protocolId, protocolId));

    await db
      .delete(questionnaires)
      .where(eq(questionnaires.protocolId, protocolId));

    await db
      .delete(logs)
      .where(eq(logs.protocolId, protocolId));

    await protocolManager.deleteProtocol(protocolId);

    return NextResponse.json({
      success: true,
      message: 'Protocol and all related data deleted successfully',
    });
  } catch (error) {
    console.error('Delete protocol error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
