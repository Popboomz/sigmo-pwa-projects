import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const config = new Config();
    const client = new LLMClient(config);

    const messages = [
      {
        role: 'system' as const,
        content: '你是一个JSON生成器。请以严格的JSON格式输出，不要有任何其他文字。',
      },
      {
        role: 'user' as const,
        content: '请生成一个JSON对象，包含字段：name（字符串）、age（数字）、active（布尔值）',
      },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.5,
    });

    return NextResponse.json({
      success: true,
      response: response.content,
    });
  } catch (error) {
    console.error('Test LLM error:', error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
