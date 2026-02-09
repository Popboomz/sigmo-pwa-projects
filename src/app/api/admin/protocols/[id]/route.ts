import { NextRequest, NextResponse } from 'next/server';
import { protocolManager } from '@/storage/database';
import { eq } from 'drizzle-orm';
import { getDb } from 'coze-coding-dev-sdk';
import { questionnaires, questionnaireAnswers, logs } from '@/storage/database/shared/schema';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证token
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

    // 验证协议是否存在
    const protocol = await protocolManager.getProtocolById(protocolId);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    const db = await getDb();

    // 级联删除协议相关的数据
    // 1. 删除问卷答案
    await db
      .delete(questionnaireAnswers)
      .where(eq(questionnaireAnswers.protocolId, protocolId));

    // 2. 删除问卷
    await db
      .delete(questionnaires)
      .where(eq(questionnaires.protocolId, protocolId));

    // 3. 删除日志
    await db
      .delete(logs)
      .where(eq(logs.protocolId, protocolId));

    // 4. 删除协议本身
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
