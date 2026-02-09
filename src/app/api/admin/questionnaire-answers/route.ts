import { NextRequest, NextResponse } from 'next/server';
import { protocolManager, dailyLogsManager } from '@/storage/database';

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

    // 验证协议是否存在
    const protocol = await protocolManager.getProtocolById(protocolId);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 获取所有每日日志（新的架构）
    const dailyLogs = await dailyLogsManager.getLogsByProtocol(protocolId);

    // 将 daily_logs 转换为问卷答案格式（兼容管理后台）
    const answers = dailyLogs.map(log => ({
      id: log.id,
      questionnaireId: log.id, // 使用 log.id 作为 questionnaireId
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
