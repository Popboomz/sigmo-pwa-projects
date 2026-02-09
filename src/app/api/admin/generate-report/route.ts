import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { protocolManager, questionnaireAnswerManager } from '@/storage/database';
import * as XLSX from 'xlsx';

interface Answer {
  questionId: string;
  score: number;
  question: string;
}

interface QuestionnaireAnswer {
  id: string;
  questionnaireId: string;
  protocolId: string;
  dayIndex: number;
  answers: Answer[];
  remark: string | null;
  submittedAt: Date | string;
}

interface GenerateReportResponse {
  protocolId: string;
  protocolTitle: string;
  totalDays: number;
  submittedDays: number;
  report: string;
  dailySummaries: Array<{
    dayIndex: number;
    date: string;
    averageScore: number;
    summary: string;
  }>;
  overallSummary: string;
  recommendations: string[];
}

// 周期总结接口（每个7天周期）
interface CycleSummary {
  cycleNumber: number;
  startDay: number;
  endDay: number;
  days: QuestionnaireAnswer[];
  averageScore: number;
  summary: string;
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { protocolId, format } = body;

    if (!protocolId) {
      return NextResponse.json(
        { error: 'Protocol ID is required' },
        { status: 400 }
      );
    }

    // 获取协议信息
    const protocol = await protocolManager.getProtocolById(protocolId);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 获取所有问卷答案
    const questionnaireAnswers = await questionnaireAnswerManager.getAnswersByProtocol(protocolId);

    if (questionnaireAnswers.length === 0) {
      return NextResponse.json(
        { error: 'No questionnaire answers found' },
        { status: 404 }
      );
    }

    // 按天排序
    questionnaireAnswers.sort((a, b) => a.dayIndex - b.dayIndex);

    // 如果需要Excel格式，直接返回Excel文件
    if (format === 'excel') {
      return generateExcelReport(protocol, questionnaireAnswers as QuestionnaireAnswer[]);
    }

    // 生成AI报告
    const report = await generateAIReport(protocol, questionnaireAnswers as QuestionnaireAnswer[]);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAIReport(
  protocol: any,
  questionnaireAnswers: QuestionnaireAnswer[]
): Promise<GenerateReportResponse> {
  // 构建4个周期的数据（每个周期7天）
  const cycles: CycleSummary[] = [];
  const TOTAL_CYCLES = 4;
  const DAYS_PER_CYCLE = 7;

  for (let cycle = 0; cycle < TOTAL_CYCLES; cycle++) {
    const startDay = cycle * DAYS_PER_CYCLE + 1;
    const endDay = (cycle + 1) * DAYS_PER_CYCLE;

    const cycleDays = questionnaireAnswers.filter(
      qa => qa.dayIndex >= startDay && qa.dayIndex <= endDay
    );

    if (cycleDays.length === 0) continue;

    // 计算平均分
    let totalScore = 0;
    let totalQuestions = 0;
    cycleDays.forEach(qa => {
      qa.answers.forEach(answer => {
        totalScore += answer.score;
        totalQuestions++;
      });
    });
    const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

    // 生成周期总结
    const cycleSummaryData = await generateCycleSummary(
      cycle + 1,
      startDay,
      endDay,
      cycleDays,
      averageScore,
      protocol.title
    );

    cycles.push(cycleSummaryData);
  }

  // 生成整体总结
  const overallSummary = await generateOverallSummary(protocol, questionnaireAnswers, cycles);

  // 生成每日总结
  const dailySummaries = questionnaireAnswers.map(qa => {
    const avgScore = qa.answers.reduce((sum, a) => sum + a.score, 0) / qa.answers.length;
    return {
      dayIndex: qa.dayIndex,
      date: new Date(qa.submittedAt).toLocaleDateString('zh-CN'),
      averageScore: parseFloat(avgScore.toFixed(2)),
      summary: `第${qa.dayIndex}天平均评分${avgScore.toFixed(2)}分`,
    };
  });

  return {
    protocolId: protocol.id,
    protocolTitle: protocol.title,
    totalDays: DAYS_PER_CYCLE * TOTAL_CYCLES,
    submittedDays: questionnaireAnswers.length,
    report: overallSummary.fullReport,
    dailySummaries,
    overallSummary: overallSummary.summary,
    recommendations: overallSummary.recommendations,
  };
}

async function generateCycleSummary(
  cycleNumber: number,
  startDay: number,
  endDay: number,
  cycleDays: QuestionnaireAnswer[],
  averageScore: number,
  productName: string
): Promise<CycleSummary> {
  // 构建周期数据文本
  let cycleData = `周期${cycleNumber}（第${startDay}-${endDay}天）\n`;
  cycleData += `平均评分：${averageScore.toFixed(2)}分\n\n`;
  
  cycleDays.forEach(qa => {
    cycleData += `第${qa.dayIndex}天：\n`;
    qa.answers.forEach((answer, idx) => {
      cycleData += `  ${idx + 1}. ${answer.question} - ${answer.score}分\n`;
    });
    if (qa.remark) {
      cycleData += `  备注：${qa.remark}\n`;
    }
    cycleData += '\n';
  });

  // 调用AI生成周期总结
  const config = new Config();
  const client = new LLMClient(config);

  const systemPrompt = `你是产品测试分析专家。你的任务是分析一个7天测试周期的数据，生成专业的周期总结报告。

【分析维度】
1. 评分趋势：分析这7天的评分变化趋势（上升、下降、稳定）
2. 问题领域：识别评分较低的维度
3. 优势领域：识别评分较高的维度
4. 异常波动：指出评分突然升高或降低的天数
5. 用户反馈：分析用户的备注内容

【输出格式】
以简洁明了的方式输出，包括以下部分：
1. 周期概况（1-2句话）
2. 评分分析（趋势、高低分领域）
3. 问题发现（具体问题点）
4. 改进建议（针对产品优化的建议）

【重要】
- 输出必须是纯文本，不要使用Markdown格式
- 保持专业、客观的语气
- 建议要具体、可操作`;

  const userPrompt = `请分析以下测试周期数据，生成周期总结报告：

产品：${productName}
${cycleData}

请从评分趋势、问题领域、优势领域、异常波动和用户反馈五个维度进行分析。`;

  const response = await client.invoke([
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt }
  ], {
    model: 'doubao-seed-1-8-251228',
    temperature: 0.7,
  });

  // 提取建议
  const recommendations = extractRecommendations(response.content);

  return {
    cycleNumber,
    startDay,
    endDay,
    days: cycleDays,
    averageScore,
    summary: response.content,
    recommendations,
  };
}

async function generateOverallSummary(
  protocol: any,
  questionnaireAnswers: QuestionnaireAnswer[],
  cycles: CycleSummary[]
): Promise<{
  summary: string;
  fullReport: string;
  recommendations: string[];
}> {
  // 计算总体平均分
  let totalScore = 0;
  let totalQuestions = 0;
  questionnaireAnswers.forEach(qa => {
    qa.answers.forEach(answer => {
      totalScore += answer.score;
      totalQuestions++;
    });
  });
  const overallAverageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

  // 构建完整报告文本
  let fullReportText = `产品测试完整报告\n`;
  fullReportText += `===================\n\n`;
  fullReportText += `测试产品：${protocol.title}\n`;
  fullReportText += `测试周期：${cycles.length}个周期，共${questionnaireAnswers.length}天\n`;
  fullReportText += `总体平均评分：${overallAverageScore.toFixed(2)}分\n\n`;
  
  fullReportText += `各周期总结\n`;
  fullReportText += `============\n\n`;
  cycles.forEach(cycle => {
    fullReportText += `周期${cycle.cycleNumber}（第${cycle.startDay}-${cycle.endDay}天）\n`;
    fullReportText += `平均评分：${cycle.averageScore.toFixed(2)}分\n`;
    fullReportText += `${cycle.summary}\n\n`;
  });

  // 调用AI生成整体总结
  const config = new Config();
  const client = new LLMClient(config);

  const systemPrompt = `你是产品测试分析专家。你的任务是分析完整的4个周期（28天）测试数据，生成整体测试总结报告。

【分析维度】
1. 整体表现：总体平均评分、完成度
2. 周期对比：对比4个周期的评分变化，找出趋势
3. 核心问题：识别在整个测试过程中持续存在的问题
4. 产品优势：识别产品的核心优势
5. 改进方向：基于4个周期的变化，提出产品优化方向

【输出格式】
以专业、简洁的方式输出，包括以下部分：
1. 测试概况（1-2句话）
2. 整体评分分析
3. 周期对比分析（4个周期的趋势）
4. 核心问题总结
5. 产品优势总结
6. 改进建议（3-5条具体、可操作的建议）

【重要】
- 输出必须是纯文本，不要使用Markdown格式
- 保持专业、客观的语气
- 建议要具体、可操作`;

  const userPrompt = `请生成完整的测试总结报告：

产品：${protocol.title}
测试天数：${questionnaireAnswers.length}天
总体平均评分：${overallAverageScore.toFixed(2)}分

各周期数据：
${cycles.map(c => `周期${c.cycleNumber}（${c.averageScore.toFixed(2)}分）：${c.summary.substring(0, 100)}...`).join('\n')}

请基于以上信息生成完整的测试总结报告。`;

  const response = await client.invoke([
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt }
  ], {
    model: 'doubao-seed-1-8-251228',
    temperature: 0.7,
  });

  // 提取建议
  const recommendations = extractRecommendations(response.content);

  return {
    summary: response.content,
    fullReport: fullReportText,
    recommendations,
  };
}

function extractRecommendations(text: string): string[] {
  // 简单提取建议（实际可以使用更复杂的NLP）
  const recommendations: string[] = [];
  const lines = text.split('\n');
  
  let inRecommendationsSection = false;
  for (const line of lines) {
    if (line.includes('建议') || line.includes('建议：')) {
      inRecommendationsSection = true;
    }
    if (inRecommendationsSection && (line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim()))) {
      recommendations.push(line.trim().replace(/^[-•\d.]\s*/, '').trim());
    }
  }
  
  return recommendations.slice(0, 5); // 最多返回5条建议
}

function generateExcelReport(protocol: any, questionnaireAnswers: QuestionnaireAnswer[]) {
  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建数据表
  const data: any[] = [];

  questionnaireAnswers.forEach(qa => {
    qa.answers.forEach((answer, idx) => {
      data.push({
        '日期': new Date(qa.submittedAt).toLocaleDateString('zh-CN'),
        '天数': qa.dayIndex,
        '问题序号': idx + 1,
        '问题': answer.question,
        '评分': answer.score,
        '评分描述': getScoreDescription(answer.score),
        '备注': qa.remark || '',
      });
    });
  });

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 15 }, // 日期
    { wch: 8 },  // 天数
    { wch: 10 }, // 问题序号
    { wch: 40 }, // 问题
    { wch: 8 },  // 评分
    { wch: 12 }, // 评分描述
    { wch: 30 }, // 备注
  ];

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '问卷数据');

  // 创建汇总表
  const summaryData = [
    ['产品名称', protocol.title],
    ['测试天数', questionnaireAnswers.length],
    ['开始日期', new Date(questionnaireAnswers[0]?.submittedAt).toLocaleDateString('zh-CN')],
    ['结束日期', new Date(questionnaireAnswers[questionnaireAnswers.length - 1]?.submittedAt).toLocaleDateString('zh-CN')],
    [''],
    ['天数', '平均评分', '最高评分', '最低评分', '备注'],
  ];

  // 计算每天的数据
  const daysData: { [key: number]: { scores: number[]; remark: string } } = {};
  questionnaireAnswers.forEach(qa => {
    const scores = qa.answers.map(a => a.score);
    daysData[qa.dayIndex] = {
      scores,
      remark: qa.remark || '',
    };
  });

  Object.keys(daysData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
    const dayData = daysData[parseInt(day)];
    const avgScore = dayData.scores.reduce((sum, s) => sum + s, 0) / dayData.scores.length;
    summaryData.push([
      `第${day}天`,
      avgScore.toFixed(2),
      Math.max(...dayData.scores),
      Math.min(...dayData.scores),
      dayData.remark,
    ]);
  });

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [
    { wch: 10 }, // 天数
    { wch: 12 }, // 平均评分
    { wch: 10 }, // 最高评分
    { wch: 10 }, // 最低评分
    { wch: 40 }, // 备注
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '汇总数据');

  // 生成Excel文件
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // 返回文件
  const fileName = `${protocol.title}_测试报告.xlsx`;
  return new NextResponse(new Uint8Array(excelBuffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

function getScoreDescription(score: number): string {
  switch (score) {
    case 1:
      return '很差';
    case 2:
      return '差';
    case 3:
      return '可以接受';
    case 4:
      return '好';
    case 5:
      return '很好';
    default:
      return '';
  }
}
