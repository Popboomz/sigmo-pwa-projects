import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, logManager } from '@/storage/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareLink, content } = body;

    if (!shareLink || !content) {
      return NextResponse.json(
        { error: 'Share link and content are required' },
        { status: 400 }
      );
    }

    // 查找对应的协议
    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 创建日志
    const log = await logManager.createLog({
      protocolId: protocol.id,
      content,
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    console.error('Submit log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
