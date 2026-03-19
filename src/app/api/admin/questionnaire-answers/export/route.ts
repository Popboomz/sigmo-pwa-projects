import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { dailyLogsManager, protocolManager } from '@/storage/database';
import { getLocalProtocolById } from '@/lib/local-admin-store';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { getLocalLogsByProtocol } from '@/lib/local-questionnaire-store';
import {
  analyzeQuestionnaireAnswers,
  type QuestionnaireAnalysisReport,
} from '@/lib/questionnaire/answerAnalysis';

function buildAnswerRows(protocol: any, answers: any[]) {
  const rows: any[] = [
    {
      报告标题: '产品测试问卷答案导出',
      协议标题: protocol.title,
      产品名称: protocol.productName || '未指定',
      测试周期: `${protocol.testPeriodDays || '未指定'}天`,
      总提交数: answers.length,
      导出时间: new Date().toLocaleString('zh-CN'),
    },
    {},
    {
      提交日期: '',
      测试天数: '',
      问题: '',
      评分: '',
      备注: '',
      物料状态: '',
      生命周期: '',
      逻辑分支: '',
    },
  ];

  answers.forEach((answer) => {
    const submittedDate = new Date(answer.submittedAt).toLocaleString('zh-CN');
    const items = Array.isArray(answer.answers) ? answer.answers : [];

    if (items.length === 0) {
      rows.push({
        提交日期: submittedDate,
        测试天数: answer.dayIndex ?? answer.testDay ?? '',
        问题: '无题目明细',
        评分: '',
        备注: answer.remark || '',
        物料状态: answer.materialState || '',
        生命周期: answer.lifecyclePhase || '',
        逻辑分支: answer.logicBranch || '',
      });
      rows.push({});
      return;
    }

    items.forEach((item: any, index: number) => {
      rows.push({
        提交日期: index === 0 ? submittedDate : '',
        测试天数: index === 0 ? answer.dayIndex ?? answer.testDay ?? '' : '',
        问题: item.question,
        评分: item.score,
        备注: index === 0 ? answer.remark || '' : '',
        物料状态: index === 0 ? answer.materialState || '' : '',
        生命周期: index === 0 ? answer.lifecyclePhase || '' : '',
        逻辑分支: index === 0 ? answer.logicBranch || '' : '',
      });
    });

    rows.push({});
  });

  return rows;
}

function buildAnalysisSheet(report: QuestionnaireAnalysisReport) {
  const rows: any[][] = [
    ['AI分析报告'],
    ['分析来源', report.source === 'fallback' ? '规则兜底' : 'AI'],
    ['整体结论', report.summary || ''],
    ['用户情绪判断', report.sentimentAnalysis || ''],
    ['注意事项', report.caution || ''],
    [],
    ['关键发现'],
  ];

  (report.keyPoints || []).forEach((item) => {
    rows.push(['- ' + item]);
  });

  rows.push([]);
  rows.push(['总体趋势']);
  (report.overallTrends || []).forEach((item) => {
    rows.push(['- ' + item]);
  });

  rows.push([]);
  rows.push(['用户参与度']);
  rows.push(['总提交数', report.userEngagement?.totalSubmissions ?? '']);
  rows.push(['响应质量', report.userEngagement?.averageResponseQuality ?? '']);
  rows.push(['最常见问题', report.userEngagement?.mostCommonIssue ?? '']);

  rows.push([]);
  rows.push(['主题诊断']);
  rows.push([
    '主题',
    '平均分',
    '首日分',
    '最近分',
    '最低分',
    '最高分',
    '趋势',
    '问题总结',
    '建议方向',
    '证据',
    '相关备注',
  ]);
  (report.themeFindings || []).forEach((item) => {
    rows.push([
      item.displayName,
      item.averageScore,
      item.firstScore ?? '',
      item.latestScore ?? '',
      item.lowestScore ?? '',
      item.highestScore ?? '',
      item.trendStatus,
      item.issueSummary,
      item.suggestedDirection,
      (item.evidence || []).join('；'),
      (item.relevantRemarks || []).join('；'),
    ]);
  });

  rows.push([]);
  rows.push(['具体改进动作']);
  rows.push([
    '优先级',
    '主题',
    '问题',
    '可能根因',
    '材料建议',
    '比例建议',
    '工艺建议',
    '验证方案',
    '预期效果',
    '置信度',
  ]);
  (report.actionPlan || []).forEach((item) => {
    rows.push([
      item.priority,
      item.displayName,
      item.problem,
      item.likelyCause,
      (item.materialAdjustments || []).join('；'),
      (item.ratioAdjustments || []).join('；'),
      (item.processAdjustments || []).join('；'),
      (item.validationPlan || []).join('；'),
      item.expectedImpact,
      item.confidence,
    ]);
  });

  rows.push([]);
  rows.push(['简明建议']);
  (report.recommendations || []).forEach((item) => {
    rows.push(['- ' + item]);
  });

  rows.push([]);
  rows.push(['逐日分析']);
  rows.push(['天数', '平均分', '主要问题', '正向反馈']);
  (report.dayByDayAnalysis || []).forEach((item) => {
    rows.push([
      item.day,
      item.avgScore,
      (item.mainConcerns || []).join('；'),
      (item.positiveFeedback || []).join('；'),
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 36 },
    { wch: 36 },
    { wch: 48 },
    { wch: 48 },
  ];

  return sheet;
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Failed to parse JSON' },
        { status: 400 },
      );
    }

    const { protocolId, analysis } = body;

    if (!protocolId) {
      return NextResponse.json({ error: 'protocolId is required' }, { status: 400 });
    }

    const protocol = isLocalDevDatabaseFallbackEnabled()
      ? await getLocalProtocolById(protocolId)
      : await protocolManager.getProtocolById(protocolId);

    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const answers = isLocalDevDatabaseFallbackEnabled()
      ? await getLocalLogsByProtocol(protocolId)
      : await dailyLogsManager.getLogsByProtocol(protocolId);

    if (answers.length === 0) {
      return NextResponse.json(
        { error: 'No questionnaire answers found', success: false },
        { status: 404 },
      );
    }

    const resolvedAnalysis: QuestionnaireAnalysisReport = analysis
      ? analysis
      : (await analyzeQuestionnaireAnswers(protocol, answers as any[])).analysis;

    const workbook = XLSX.utils.book_new();

    const answersSheet = XLSX.utils.json_to_sheet(buildAnswerRows(protocol, answers as any[]));
    answersSheet['!cols'] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 42 },
      { wch: 8 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, answersSheet, '问卷答案');
    XLSX.utils.book_append_sheet(workbook, buildAnalysisSheet(resolvedAnalysis), 'AI分析报告');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const response = new NextResponse(excelBuffer, { status: 200 });
    const filename = `问卷答案_AI分析报告_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    response.headers.set(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    return response;
  } catch (error) {
    console.error('Export questionnaire answers error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
