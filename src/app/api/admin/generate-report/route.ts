import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { protocolManager, questionnaireAnswerManager } from '@/storage/database';
import { generateText } from '@/lib/ai/chatgpt';
import { getLocalProtocolById } from '@/lib/local-admin-store';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { getLocalLogsByProtocol } from '@/lib/local-questionnaire-store';
import { collectRelevantRemarkSignals } from '@/lib/questionnaire/remarkSanitizer';

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
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }

    const protocol = isLocalDevDatabaseFallbackEnabled()
      ? await getLocalProtocolById(protocolId)
      : await protocolManager.getProtocolById(protocolId);
    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const questionnaireAnswers = isLocalDevDatabaseFallbackEnabled()
      ? (await getLocalLogsByProtocol(protocolId)).map((log) => ({
          id: log.id,
          questionnaireId: log.id,
          protocolId: log.protocolId,
          dayIndex: log.testDay,
          answers: (log.answers as Answer[]) || [],
          remark: log.remark,
          submittedAt: log.submittedAt,
        }))
      : await questionnaireAnswerManager.getAnswersByProtocol(protocolId);
    if (questionnaireAnswers.length === 0) {
      return NextResponse.json(
        { error: 'No questionnaire answers found' },
        { status: 404 },
      );
    }

    questionnaireAnswers.sort((a, b) => a.dayIndex - b.dayIndex);

    if (format === 'excel') {
      return generateExcelReport(protocol, questionnaireAnswers as QuestionnaireAnswer[]);
    }

    const report = await generateAIReport(protocol, questionnaireAnswers as QuestionnaireAnswer[]);
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateAIReport(
  protocol: any,
  questionnaireAnswers: QuestionnaireAnswer[],
): Promise<GenerateReportResponse> {
  const cycles: CycleSummary[] = [];
  const daysPerCycle = 7;
  const totalCycles = Math.ceil((protocol.testPeriodDays || 21) / daysPerCycle);

  for (let cycle = 0; cycle < totalCycles; cycle += 1) {
    const startDay = cycle * daysPerCycle + 1;
    const endDay = Math.min((cycle + 1) * daysPerCycle, protocol.testPeriodDays || 21);
    const cycleDays = questionnaireAnswers.filter(
      (item) => item.dayIndex >= startDay && item.dayIndex <= endDay,
    );

    if (cycleDays.length === 0) {
      continue;
    }

    let totalScore = 0;
    let totalQuestions = 0;
    cycleDays.forEach((day) => {
      day.answers.forEach((answer) => {
        totalScore += answer.score;
        totalQuestions += 1;
      });
    });
    const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

    cycles.push(
      await generateCycleSummary(
        cycle + 1,
        startDay,
        endDay,
        cycleDays,
        averageScore,
        protocol.title,
      ),
    );
  }

  const overallSummary = await generateOverallSummary(protocol, questionnaireAnswers, cycles);

  const dailySummaries = questionnaireAnswers.map((day) => {
    const avgScore =
      day.answers.reduce((sum, answer) => sum + answer.score, 0) / day.answers.length;
    return {
      dayIndex: day.dayIndex,
      date: new Date(day.submittedAt).toLocaleDateString('zh-CN'),
      averageScore: Number(avgScore.toFixed(2)),
      summary: `第 ${day.dayIndex} 天平均评分 ${avgScore.toFixed(2)} 分`,
    };
  });

  return {
    protocolId: protocol.id,
    protocolTitle: protocol.title,
    totalDays: protocol.testPeriodDays || questionnaireAnswers.length,
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
  productName: string,
): Promise<CycleSummary> {
  const cycleData = cycleDays.map((day) => ({
    dayIndex: day.dayIndex,
    answers: day.answers,
    remark: day.remark,
  }));

  const summary = await generateText({
    systemPrompt: [
      '你是产品测试周报分析助手。',
      '请根据 7 天左右的问卷数据输出简洁、专业、客观的中文周期总结。',
      '请覆盖评分走势、主要问题、主要亮点、可执行建议。',
      '只输出正文，不要 Markdown。',
    ].join(' '),
    userPrompt: JSON.stringify(
      {
        cycleNumber,
        startDay,
        endDay,
        productName,
        averageScore: Number(averageScore.toFixed(2)),
        cycleData,
        remarkSignals: collectRelevantRemarkSignals(cycleDays.map((day) => day.remark)),
      },
      null,
      2,
    ),
    temperature: 0.3,
  });

  return {
    cycleNumber,
    startDay,
    endDay,
    days: cycleDays,
    averageScore,
    summary,
    recommendations: extractRecommendations(summary),
  };
}

async function generateOverallSummary(
  protocol: any,
  questionnaireAnswers: QuestionnaireAnswer[],
  cycles: CycleSummary[],
): Promise<{
  summary: string;
  fullReport: string;
  recommendations: string[];
}> {
  let totalScore = 0;
  let totalQuestions = 0;
  questionnaireAnswers.forEach((day) => {
    day.answers.forEach((answer) => {
      totalScore += answer.score;
      totalQuestions += 1;
    });
  });
  const overallAverageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

  const summary = await generateText({
    systemPrompt: [
      '你是产品测试总结报告助手。',
      '请根据完整周期的问卷数据输出专业、客观的中文总报告摘要。',
      '必须覆盖整体表现、周期对比、核心问题、主要优势、产品优化建议。',
      '只输出正文，不要 Markdown。',
    ].join(' '),
    userPrompt: JSON.stringify(
      {
        productTitle: protocol.title,
        testPeriodDays: protocol.testPeriodDays || questionnaireAnswers.length,
        overallAverageScore: Number(overallAverageScore.toFixed(2)),
        cycleSummaries: cycles.map((cycle) => ({
          cycleNumber: cycle.cycleNumber,
          averageScore: Number(cycle.averageScore.toFixed(2)),
          summary: cycle.summary,
        })),
        remarkSignals: collectRelevantRemarkSignals(
          questionnaireAnswers.map((answer) => answer.remark),
        ),
      },
      null,
      2,
    ),
    temperature: 0.3,
  });

  const fullReport = [
    `产品测试完整报告`,
    `产品：${protocol.title}`,
    `测试天数：${questionnaireAnswers.length} 天`,
    `整体平均评分：${overallAverageScore.toFixed(2)} 分`,
    '',
    '各周期总结：',
    ...cycles.map(
      (cycle) =>
        `周期 ${cycle.cycleNumber}（第 ${cycle.startDay}-${cycle.endDay} 天，均分 ${cycle.averageScore.toFixed(
          2,
        )}）：${cycle.summary}`,
    ),
    '',
    '整体结论：',
    summary,
  ].join('\n');

  return {
    summary,
    fullReport,
    recommendations: extractRecommendations(summary),
  };
}

function extractRecommendations(text: string): string[] {
  const results = text
    .split(/[\n。；]/)
    .map((line) => line.trim())
    .filter((line) => line.includes('建议') || line.includes('应') || line.includes('可'))
    .slice(0, 5);

  return results.length > 0 ? results : ['建议结合低分主题优先优化异味、结团和清理体验。'];
}

function generateExcelReport(protocol: any, questionnaireAnswers: QuestionnaireAnswer[]) {
  const workbook = XLSX.utils.book_new();
  const data: any[] = [];

  questionnaireAnswers.forEach((day) => {
    day.answers.forEach((answer, index) => {
      data.push({
        日期: new Date(day.submittedAt).toLocaleDateString('zh-CN'),
        天数: day.dayIndex,
        题目序号: index + 1,
        题目: answer.question,
        评分: answer.score,
        评分描述: getScoreDescription(answer.score),
        备注: day.remark || '',
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 8 },
    { wch: 10 },
    { wch: 40 },
    { wch: 8 },
    { wch: 12 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, '问卷数据');

  const summaryData: any[] = [
    ['产品名称', protocol.title],
    ['测试天数', questionnaireAnswers.length],
    ['开始日期', new Date(questionnaireAnswers[0]?.submittedAt).toLocaleDateString('zh-CN')],
    [
      '结束日期',
      new Date(
        questionnaireAnswers[questionnaireAnswers.length - 1]?.submittedAt,
      ).toLocaleDateString('zh-CN'),
    ],
    [],
    ['天数', '平均评分', '最高评分', '最低评分', '备注'],
  ];

  const daysData: { [key: number]: { scores: number[]; remark: string } } = {};
  questionnaireAnswers.forEach((day) => {
    daysData[day.dayIndex] = {
      scores: day.answers.map((answer) => answer.score),
      remark: day.remark || '',
    };
  });

  Object.keys(daysData)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .forEach((day) => {
      const current = daysData[parseInt(day, 10)];
      const avgScore = current.scores.reduce((sum, score) => sum + score, 0) / current.scores.length;
      summaryData.push([
        `第 ${day} 天`,
        avgScore.toFixed(2),
        Math.max(...current.scores),
        Math.min(...current.scores),
        current.remark,
      ]);
    });

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '汇总数据');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const fileName = `${protocol.title}_测试报告.xlsx`;
  return new NextResponse(new Uint8Array(excelBuffer as ArrayBuffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

function getScoreDescription(score: number): string {
  switch (score) {
    case 1:
      return '很差';
    case 2:
      return '较差';
    case 3:
      return '可以接受';
    case 4:
      return '较好';
    case 5:
      return '很好';
    default:
      return '';
  }
}
