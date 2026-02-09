import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

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
        { status: 400 }
      );
    }

    // 构建系统提示词
    const systemPrompt = `你是产品测试备注优化专家。你的任务是将测试者填写的原始备注转换为更专业、更完善的测试反馈。

【优化目标】
1. 提升语言专业性：使用产品测试领域的专业术语
2. 补充细节：根据上下文推断并补充关键细节
3. 结构化表达：将零散的描述整理成条理清晰的段落
4. 客观准确：保持客观态度，去除情绪化表达
5. 专业评分：如果合适，添加1-5分的专业评分

【输出格式】
仅输出优化后的文字，不要有任何解释、前言或后缀。

【优化原则】
- 保留原始反馈的核心内容
- 使用产品测试专业术语（如：结团性、吸水性、除臭效果、扬尘控制等）
- 补充具体的测试场景（如：使用7天后的效果、多次清理后的表现等）
- 将口语化表达转换为书面语
- 如果原备注包含问题，添加改进建议
- 保持简洁，避免冗余

【禁止】
- 不要改变原始反馈的核心观点
- 不要添加原备注中没有的测试结果
- 不要使用Markdown格式
- 不要输出任何解释性文字`;

    // 构建用户消息
    let userPrompt = `请优化以下测试备注，使其更专业、更完善：\n\n`;
    userPrompt += `产品类型：${productType}\n`;
    if (context) {
      userPrompt += `测试场景：${context}\n`;
    }
    userPrompt += `原始备注：${originalText}`;

    // 调用豆包大模型
    const config = new Config();
    const client = new LLMClient(config);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
    });

    const optimizedText = response.content.trim();

    return NextResponse.json({
      success: true,
      data: {
        originalText,
        optimizedText,
      },
    });
  } catch (error) {
    console.error('Optimize remark error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
