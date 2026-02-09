import { LLMClient, Config } from 'coze-coding-dev-sdk';

export interface Message {
  id: string;
  authorName: string;
  content: string;
  createdBy: string | null;
  createdAt: Date | string;
}

export interface AnalysisReport {
  summary: string;
  keyPoints: string[];
  sentimentAnalysis: string;
  recommendations: string[];
  authorInsights: Array<{
    authorName: string;
    messageCount: number;
    keyThemes: string[];
  }>;
  messages: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
    category: string;
    sentiment: string;
  }>;
}

export async function analyzeMessagesWithAI(messages: Message[]): Promise<AnalysisReport> {
  console.log('Starting message analysis for', messages.length, 'messages');

  // 构建留言数据
  const messagesText = messages.map((msg, index) => {
    const date = new Date(msg.createdAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${index + 1}. 作者: ${msg.authorName}\n   时间: ${date}\n   内容: ${msg.content}\n`;
  }).join('\n');

  console.log('Messages text length:', messagesText.length);

  // 构建系统提示词
  const systemPrompt = `你是专业的留言分析专家。你的任务是对管理员的留言进行深度分析和总结。

【分析维度】
1. 整体总结：概括所有留言的核心主题和关键信息
2. 关键观点：提炼出所有留言中的重要观点和见解
3. 情感倾向：分析留言的整体情感倾向（积极/中性/消极）
4. 改进建议：根据留言内容提出具体的改进建议
5. 作者洞察：分析每位作者的留言特点和关注点
6. 留言分类：将每条留言分类到不同类别
7. 情感分析：分析每条留言的情感倾向

【输出格式】
请以严格的JSON格式输出，不要有任何其他文字。格式如下：

{
  "summary": "整体总结（200-300字）",
  "keyPoints": ["关键观点1", "关键观点2", "关键观点3", "关键观点4"],
  "sentimentAnalysis": "整体情感倾向分析（100-150字）",
  "recommendations": ["建议1", "建议2", "建议3", "建议4"],
  "authorInsights": [
    {
      "authorName": "作者姓名",
      "messageCount": 留言数量,
      "keyThemes": ["关注点1", "关注点2"]
    }
  ],
  "messages": [
    {
      "id": "留言ID",
      "authorName": "作者姓名",
      "content": "留言内容",
      "createdAt": "发布时间",
      "category": "分类",
      "sentiment": "情感倾向（positive/neutral/negative）"
    }
  ]
}

【分类标准】
- 工作建议：关于工作流程、效率、协作的建议
- 产品反馈：关于产品功能、体验的反馈
- 团队建设：关于团队文化、氛围的建议
- 战略思考：关于发展方向、策略的建议
- 技术分享：关于技术实现、优化的分享
- 其他：其他类型的留言

【情感倾向标准】
- positive：积极正面，包含赞扬、肯定、鼓励等
- neutral：中性客观，描述事实、提出建议等
- negative：消极负面，包含抱怨、批评、担忧等

【注意事项】
- 确保JSON格式正确，可以被JSON.parse解析
- 确保每个字段都有值
- 留言ID使用原始ID
- 作者姓名使用原始姓名
- 留言内容使用原始内容
- 发布时间使用原始时间（格式：YYYY-MM-DD HH:mm:ss）`;

  // 构建用户消息
  const userPrompt = `请分析以下管理员留言，并按照要求的JSON格式输出分析结果：\n\n${messagesText}`;

  // 调用豆包大模型 - 使用流式输出以确保获取完整响应
  const config = new Config();
  const client = new LLMClient(config);

  const messages_llm = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ];

  let fullResponse = '';
  let chunkCount = 0;

  try {
    console.log('Starting LLM stream with model: doubao-seed-1-8-251228');
    const stream = client.stream(messages_llm, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.5,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        const content = chunk.content.toString();
        fullResponse += content;
        chunkCount++;

        // 每收到10个chunk输出一次日志
        if (chunkCount % 10 === 0) {
          console.log(`Stream progress: ${fullResponse.length} chars received, ${chunkCount} chunks`);
        }
      }
    }

    console.log('Stream completed. Total chunks:', chunkCount, 'Total chars:', fullResponse.length);
  } catch (streamError) {
    console.error('Stream error, falling back to invoke:', streamError);

    try {
      const response = await client.invoke(messages_llm, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.5,
      });
      fullResponse = response.content || '';
      console.log('Invoke completed. Response length:', fullResponse.length);
    } catch (invokeError) {
      console.error('Invoke also failed:', invokeError);
      throw new Error('Both stream and invoke methods failed');
    }
  }

  const responseText = fullResponse.trim();

  // 检查响应是否为空
  if (!responseText) {
    console.error('AI response is empty');
    throw new Error('AI returned empty response');
  }

  // 检查响应是否太短（可能不完整）
  if (responseText.length < 100) {
    console.error('AI response is too short:', responseText.length, 'chars');
    console.error('Response text:', responseText);
    throw new Error('AI response is too short, likely incomplete');
  }

  console.log('AI Response length:', responseText.length);
  console.log('AI Response preview (first 500 chars):', responseText.substring(0, 500));
  console.log('AI Response ending (last 200 chars):', responseText.substring(responseText.length - 200));

  // 尝试解析JSON
  let analysisResult: AnalysisReport;
  try {
    // 步骤1: 移除可能存在的markdown代码块标记
    let cleanedText = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // 步骤2: 尝试找到JSON对象的开始和结束
    let firstBrace = cleanedText.indexOf('{');
    let lastBrace = cleanedText.lastIndexOf('}');

    console.log('First brace at:', firstBrace, 'Last brace at:', lastBrace);

    // 如果找不到有效的JSON对象，尝试其他方法
    if (firstBrace === -1 || lastBrace === -1) {
      console.error('No valid JSON object found in response');
      throw new Error('No valid JSON object found');
    }

    // 步骤3: 提取JSON字符串
    let jsonStr = cleanedText.substring(firstBrace, lastBrace + 1);

    console.log('Extracted JSON length:', jsonStr.length);

    // 步骤4: 验证括号匹配
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    let closeBraces = (jsonStr.match(/\}/g) || []).length;

    console.log('Brace count - Open:', openBraces, 'Close:', closeBraces);

    if (openBraces !== closeBraces) {
      console.error('Unmatched braces in JSON');
      // 尝试补全
      while (closeBraces < openBraces) {
        jsonStr += '}';
        const newClose = (jsonStr.match(/\}/g) || []).length;
        if (newClose === closeBraces) {
          console.error('Failed to close braces');
          break;
        }
        closeBraces = newClose;
      }
    }

    console.log('Cleaned JSON length after brace fix:', jsonStr.length);
    console.log('Cleaned JSON preview (first 500 chars):', jsonStr.substring(0, 500));

    // 步骤5: 解析JSON
    analysisResult = JSON.parse(jsonStr);

    console.log('JSON parsed successfully');
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full response text:', responseText);
    console.error('Full response length:', responseText.length);

    // 如果解析失败，返回一个基本的结构
    console.log('Returning fallback analysis structure');
    analysisResult = {
      summary: '留言分析生成失败，请稍后重试。',
      keyPoints: ['留言内容分析'],
      sentimentAnalysis: '中性',
      recommendations: ['建议稍后重试'],
      authorInsights: [],
      messages: messages.map(msg => ({
        id: msg.id,
        authorName: msg.authorName,
        content: msg.content,
        createdAt: new Date(msg.createdAt).toLocaleString('zh-CN'),
        category: '其他',
        sentiment: 'neutral',
      })),
    };
  }

  console.log('Analysis completed successfully');
  return analysisResult;
}
