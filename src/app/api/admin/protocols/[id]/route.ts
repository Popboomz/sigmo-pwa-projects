import { NextRequest, NextResponse } from 'next/server';
import { protocolManager } from '@/storage/database';
import { eq } from 'drizzle-orm';
import { getDb } from 'coze-coding-dev-sdk';
import { questionnaires, questionnaireAnswers, logs } from '@/storage/database/shared/schema';
import { verifyAdmin } from '@/app/api/middleware';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { deleteLocalProtocol, getLocalProtocolById } from '@/lib/local-admin-store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || 'No admin permission' },
        { status: adminCheck.error === 'Unauthorized' ? 401 : 403 }
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
