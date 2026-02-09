import { NextRequest, NextResponse } from 'next/server';
import { dailyLogsManager, protocolManager } from '@/storage/database';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface AnalysisReport {
  summary: string;
  keyPoints: string[];
  sentimentAnalysis: string;
  recommendations: string[];
  dayByDayAnalysis: Array<{
    day: number;
    avgScore: number;
    mainConcerns: string[];
    positiveFeedback: string[];
  }>;
  overallTrends: string[];
  userEngagement: {
    totalSubmissions: number;
    averageResponseQuality: string;
    mostCommonIssue: string;
  };
}

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

    const { protocolId } = body;

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

    // 获取问卷答案
    const answers = await dailyLogsManager.getLogsByProtocol(protocolId);

    if (answers.length === 0) {
      return NextResponse.json(
        { error: 'No questionnaire answers found', success: false },
        { status: 404 }
      );
    }

    console.log(`Starting analysis for ${answers.length} questionnaire answers`);

    // 准备数据摘要用于 AI 分析
    const dataSummary = answers.map(answer => ({
      day: answer.testDay,
      answers: (answer.answers as any[]).map((a: any) => ({
        question: a.question,
        score: a.score
      })),
      remark: answer.remark,
      submittedAt: answer.submittedAt,
      materialState: answer.materialState,
      lifecyclePhase: answer.lifecyclePhase
    }));

    // 计算统计数据
    const dayStats: Record<number, { total: number; count: number; scores: number[] }> = {};
    answers.forEach(answer => {
      const day = answer.testDay;
      if (!dayStats[day]) {
        dayStats[day] = { total: 0, count: 0, scores: [] };
      }
      (answer.answers as any[]).forEach((a: any) => {
        dayStats[day].total += a.score;
        dayStats[day].count += 1;
        dayStats[day].scores.push(a.score);
      });
    });

    const dayAnalysis = Object.entries(dayStats).map(([day, stats]) => ({
      day: parseInt(day),
      avgScore: Math.round((stats.total / stats.count) * 100) / 100,
      count: stats.count,
      minScore: Math.min(...stats.scores),
      maxScore: Math.max(...stats.scores)
    }));

    // 调用豆包大模型分析问卷答案
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config);

    const systemPrompt = `你是一个专业的产品测试数据分析专家。你的任务是分析用户提交的产品测试问卷答案，提供深入、客观的分析报告。

请分析以下问卷数据：
- 测试协议：${protocol.title}
- 产品名称：${protocol.productName || '未指定'}
- 测试周期：${protocol.testPeriodDays || '未指定'}天
- 收到的问卷数量：${answers.length}份

请从以下维度进行分析：
1. 整体表现总结
2. 关键发现（至少5条）
3. 用户情感分析
4. 改进建议（至少5条具体建议）
5. 每日分析（评分变化趋势、主要问题、正面反馈）
6. 整体趋势分析
7. 用户参与度评估

请以JSON格式返回分析结果，格式如下：
{
  "summary": "整体表现总结（100-200字）",
  "keyPoints": ["关键发现1", "关键发现2", ...],
  "sentimentAnalysis": "用户情感分析（100-150字）",
  "recommendations": ["改进建议1", "改进建议2", ...],
  "dayByDayAnalysis": [
    {
      "day": 1,
      "avgScore": 4.2,
      "mainConcerns": ["主要问题1", "主要问题2"],
      "positiveFeedback": ["正面反馈1", "正面反馈2"]
    }
  ],
  "overallTrends": ["趋势1", "趋势2", ...],
  "userEngagement": {
    "totalSubmissions": ${answers.length},
    "averageResponseQuality": "总体评价",
    "mostCommonIssue": "最常见的问题"
  }
}

注意：
- 保持客观、专业的语气
- 基于实际数据进行分析，不要编造
- 评分趋势要体现变化
- 建议要具体、可操作`;

    const userPrompt = `请分析以下问卷数据摘要：

${JSON.stringify(dayAnalysis, null, 2)}

数据说明：
- day: 测试天数
- avgScore: 该日平均评分（1-5分）
- count: 该日提交的问卷数量
- minScore: 该日最低评分
- maxScore: 该日最高评分

问卷答案详情：
${JSON.stringify(dataSummary.slice(0, 10), null, 2)}
${dataSummary.length > 10 ? `...（共 ${dataSummary.length} 份答案）` : ''}

备注内容：
${answers.filter(a => a.remark).map(a => `第${a.testDay}天: ${a.remark}`).join('\n') || '无备注'}

请根据以上数据进行分析，返回JSON格式的分析报告。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    console.log('Calling LLM for questionnaire analysis...');
    const response = await client.invoke(messages, { temperature: 0.7 }, undefined, customHeaders);
    const content = response.content.trim();

    console.log('LLM response received:', content.substring(0, 200));

    // 尝试解析 JSON
    let analysisResult: AnalysisReport;
    try {
      // 尝试直接解析
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      // 如果直接解析失败，尝试提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    console.log('Analysis completed successfully');

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('Analyze questionnaire answers error:', error);
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
