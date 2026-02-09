import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireAnswerManager } from '@/storage/database';

// 提前结束测试的固定 UUID
const TEST_ENDED_UUID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareLink = searchParams.get('shareLink');

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link is required' },
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

    // 获取已提交的答案
    const answers = await questionnaireAnswerManager.getAnswersByProtocol(protocol.id);

    // 过滤掉结束记录（使用固定的 UUID 标识结束记录）
    const validAnswers = answers.filter(a => a.questionnaireId !== TEST_ENDED_UUID);

    // 检查是否已提前结束测试
    const hasEndedTest = answers.some(a => a.questionnaireId === TEST_ENDED_UUID);

    return NextResponse.json({
      success: true,
      data: validAnswers,
      hasEndedTest, // 返回是否已提前结束测试的标志
    });
  } catch (error) {
    console.error('Get answers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
