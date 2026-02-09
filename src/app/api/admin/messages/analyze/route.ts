import { NextRequest, NextResponse } from 'next/server';
import { messageManager } from '@/storage/database';
import { analyzeMessagesWithAI, AnalysisReport } from '@/lib/utils/messageAnalysis';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Failed to parse JSON' },
        { status: 400 }
      );
    }

    const { format } = body;

    // 获取所有留言
    const messages = await messageManager.getAllMessages();

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found', success: false },
        { status: 404 }
      );
    }

    console.log(`Starting analysis for ${messages.length} messages`);

    // 调用豆包大模型分析留言
    const analysisResult = await analyzeMessagesWithAI(messages);

    if (!analysisResult) {
      return NextResponse.json(
        { error: 'Analysis returned empty result', success: false },
        { status: 500 }
      );
    }

    console.log('Analysis completed successfully');

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('Analyze messages error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
