import { NextRequest, NextResponse } from 'next/server';

import { generateText } from '@/lib/ai/chatgpt';
import { sanitizeRemarkForAnalysis } from '@/lib/questionnaire/remarkSanitizer';

interface OptimizeRemarkRequest {
  originalText: string;
  productType?: string;
  context?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRemarkRequest = await request.json();
    const { originalText, productType = '猫砂', context = '' } = body;

    if (!originalText || originalText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Original text is required' },
        { status: 400 },
      );
    }

    const sanitized = sanitizeRemarkForAnalysis(originalText);
    const sourceText = sanitized?.relevantText || originalText.trim();

    const optimizedText = await generateText({
      systemPrompt: [
        '你是产品测试备注整理助手。',
        '请把用户原始备注整理成更专业、更客观、更适合进入分析报告的中文表述。',
        '只输出润色后的结果，不要解释，不要加标题，不要使用 Markdown。',
        '如果原备注没有有效产品信息，请输出“未提取到有效产品反馈”。',
      ].join(' '),
      userPrompt: [
        `产品类型：${productType}`,
        context ? `测试场景：${context}` : '',
        `原始备注：${sourceText}`,
      ]
        .filter(Boolean)
        .join('\n'),
      temperature: 0.3,
    });

    return NextResponse.json({
      success: true,
      data: {
        originalText,
        optimizedText: optimizedText.trim(),
      },
    });
  } catch (error) {
    console.error('Optimize remark error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
