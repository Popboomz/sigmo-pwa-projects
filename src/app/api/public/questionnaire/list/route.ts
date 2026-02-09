import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireManager } from '@/storage/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareLink = searchParams.get('shareLink');

    if (!shareLink) {
      return NextResponse.json(
        { error: 'shareLink is required' },
        { status: 400 }
      );
    }

    // 查找协议
    const protocol = await protocolManager.getProtocolByShareLink(shareLink);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 获取该协议的所有问卷
    const questionnaires = await questionnaireManager.getQuestionnairesByProtocol(protocol.id);

    return NextResponse.json({
      success: true,
      data: questionnaires,
    });
  } catch (error) {
    console.error('Get questionnaires error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
