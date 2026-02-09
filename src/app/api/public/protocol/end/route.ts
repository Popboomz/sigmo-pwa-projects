import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, questionnaireAnswerManager } from '@/storage/database';

interface EndTestRequest {
  shareLink: string;
  endReason: string;
}

// 固定的 UUID 用于标识测试结束记录（36字符，符合数据库约束）
const TEST_ENDED_UUID = '00000000-0000-0000-0000-000000000000';

export async function POST(request: NextRequest) {
  try {
    const body: EndTestRequest = await request.json();
    const { shareLink, endReason } = body;

    if (!shareLink || !endReason?.trim()) {
      return NextResponse.json(
        { error: 'Share link and end reason are required' },
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

    // 获取已提交的答案数量，确定结束的 dayIndex
    const existingAnswers = await questionnaireAnswerManager.getAnswersByProtocol(protocol.id);
    const dayIndex = existingAnswers.length + 1;

    // 创建一个特殊的答案记录，标记测试结束
    // 使用固定 UUID 作为 questionnaireId，在 remark 中记录结束原因
    const endRecord = await questionnaireAnswerManager.createAnswer({
      questionnaireId: TEST_ENDED_UUID, // 固定的 UUID 标识结束记录
      protocolId: protocol.id,
      dayIndex,
      answers: [], // 空答案列表
      remark: `[提前结束测试] ${endReason}`, // 结束原因作为备注，带前缀
    });

    return NextResponse.json({
      success: true,
      data: endRecord,
    });
  } catch (error) {
    console.error('End test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
