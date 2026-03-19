import { generateJson } from '@/lib/ai/chatgpt';

import { collectRelevantRemarkSignals, sanitizeRemarkForAnalysis } from './remarkSanitizer';
import {
  CANONICAL_THEME_ORDER,
  calculateStructuredScoresFromAnswers,
  createStructuredScores,
  getThemeDisplayName,
  type CanonicalTheme,
  type StructuredScores,
} from './themes';

type Priority = 'high' | 'medium' | 'low';
type Confidence = 'high' | 'medium' | 'low';

export interface AnalysisDayItem {
  questionId?: string;
  question: string;
  score: number;
  theme?: string | null;
}

export interface AnalysisAnswerEntry {
  id: string;
  protocolId: string;
  submittedAt: string | Date;
  remark?: string | null;
  answers?: AnalysisDayItem[];
  structuredScores?: Partial<StructuredScores> | null;
  dayIndex?: number;
  testDay?: number;
  materialState?: string | null;
  lifecyclePhase?: string | null;
  logicBranch?: string | null;
}

export interface ThemeFinding {
  theme: CanonicalTheme;
  displayName: string;
  averageScore: number;
  firstScore: number | null;
  latestScore: number | null;
  lowestScore: number | null;
  highestScore: number | null;
  trendStatus: string;
  issueSummary: string;
  evidence: string[];
  relevantRemarks: string[];
  suggestedDirection: string;
}

export interface ActionPlanItem {
  priority: Priority;
  theme: CanonicalTheme;
  displayName: string;
  problem: string;
  likelyCause: string;
  materialAdjustments: string[];
  ratioAdjustments: string[];
  processAdjustments: string[];
  validationPlan: string[];
  expectedImpact: string;
  confidence: Confidence;
}

export interface QuestionnaireAnalysisReport {
  source?: 'ai' | 'fallback';
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
  themeFindings: ThemeFinding[];
  actionPlan: ActionPlanItem[];
  caution?: string;
}

interface ThemeSnapshot {
  theme: CanonicalTheme;
  displayName: string;
  averageScore: number;
  firstScore: number | null;
  latestScore: number | null;
  lowestScore: number | null;
  highestScore: number | null;
  lowScoreDays: number[];
  trendStatus: string;
  relevantRemarks: string[];
}

interface AnalysisInputSummary {
  protocol: {
    id: string;
    title: string;
    productName: string;
    testPeriodDays: number;
  };
  answerCount: number;
  submittedDays: number[];
  themeSnapshots: ThemeSnapshot[];
  daySnapshots: Array<{
    day: number;
    avgScore: number;
    mainConcerns: string[];
    positiveFeedback: string[];
    remarkSignal: string | null;
  }>;
  rawDays: Array<{
    day: number;
    submittedAt: string;
    answers: Array<{ theme: string; question: string; score: number }>;
    remarkSignal: string | null;
    materialState?: string | null;
    lifecyclePhase?: string | null;
    logicBranch?: string | null;
  }>;
  remarkSignals: string[];
}

interface AIThemeInsight {
  theme: CanonicalTheme;
  issueSummary: string;
  evidenceHighlights: string[];
  suggestedDirection: string;
}

interface AIAnalysisPayload {
  summary: string;
  keyPoints: string[];
  sentimentAnalysis: string;
  overallTrends: string[];
  recommendations?: string[];
  themeInsights: AIThemeInsight[];
  actionPlan: Array<{
    priority: Priority;
    theme: CanonicalTheme;
    problem: string;
    likelyCause: string;
    materialAdjustments: string[];
    ratioAdjustments: string[];
    processAdjustments: string[];
    validationPlan: string[];
    expectedImpact: string;
    confidence: Confidence;
  }>;
  caution?: string;
}

const THEME_HINTS: Record<
  CanonicalTheme,
  {
    issueSummary: string;
    direction: string;
    problem: string;
    materials: string[];
    ratios: string[];
    process: string[];
    validation: string[];
  }
> = {
  odor: {
    issueSummary: '除臭维度偏低，说明异味控制仍是用户最敏感的痛点之一。',
    direction: '优先验证高尿量和夜间场景下的压味持续性。',
    problem: '除臭表现不稳或高负荷场景下压味不足',
    materials: [
      '建议试验活性炭、沸石或复合除臭矿物体系，增强氨味和潮湿异味吸附能力。',
      '如有明显刺激味，可尝试低刺激型气味屏蔽材料，并同步验证猫咪接受度。',
    ],
    ratios: [
      '可尝试将主除臭组分总占比上调约 3% 到 8%，并联动观察真实压味表现。',
      '若香氛体系过强，建议先下调约 10% 到 20%。',
    ],
    process: [
      '优化除臭组分在颗粒中的分布均匀性，避免前期强后期掉得快。',
      '检查干燥和封装流程，减少活性材料受潮失效。',
    ],
    validation: [
      '增加高尿量静置 8 到 12 小时后的异味盲测。',
      '对比开封首日与连续使用后的压味衰减曲线。',
    ],
  },
  dust: {
    issueSummary: '粉尘维度会直接影响环境感受，也容易联动拉低猫咪接受度。',
    direction: '优先控制倒砂、铲砂和剧烈搅拌场景的瞬时扬尘。',
    problem: '细粉较多或连续使用后灰尘控制下滑',
    materials: [
      '建议试验更稳定的颗粒骨架材料或低粉化辅料，减少细粉生成。',
      '如已有包覆体系，可评估是否增加抑尘包覆或表面致密化材料。',
    ],
    ratios: [
      '可尝试将大颗粒或中颗粒骨料比例提高约 5% 到 12%。',
      '建议下调最易扬尘粒径段的细粉回添比例。',
    ],
    process: [
      '补做筛分和除粉工序，重点控制出厂前细粉残留。',
      '检查造粒强度和干燥曲线，避免颗粒运输中二次产尘。',
    ],
    validation: [
      '增加标准化倒砂扬尘测试和铲砂扰动测试。',
      '追踪开封首日与连续使用后的细粉累积量。',
    ],
  },
  clumping: {
    issueSummary: '结团维度偏低说明核心功能还没有建立稳定信任。',
    direction: '优先解决高尿量、连续使用和边缘区域散团问题。',
    problem: '结团不够紧实，易散团或高尿量时失稳',
    materials: [
      '建议试验更强的吸液-成团体系，如优化膨润土活性等级或复配植物胶方案。',
      '可评估辅助成膜或缓释吸液材料以提升团块完整性。',
    ],
    ratios: [
      '可尝试将关键结团组分上调约 4% 到 10%。',
      '若细粉过多导致团块松散，建议适度下调易糊化细粉比例。',
    ],
    process: [
      '优化混料均匀度和颗粒含水率窗口，避免局部成团力差异过大。',
      '检查粒径分布，过多极小颗粒容易造成团块松散。',
    ],
    validation: [
      '增加高尿量冲击和连续使用场景下的散团率测试。',
      '记录团块铲起完整率和静置后回散情况。',
    ],
  },
  cleanup: {
    issueSummary: '清理维度偏低意味着用户实际使用负担高，复购风险会上升。',
    direction: '优先降低粘底并提升团块与盆底分离的稳定性。',
    problem: '粘底、难铲或清理便利性衰减明显',
    materials: [
      '建议评估表面疏水或抗粘底辅助材料，减少湿团与盆底粘连。',
      '如结团过软，可联动提升支撑颗粒比例以帮助铲起完整。',
    ],
    ratios: [
      '可尝试下调导致糊底的高吸液细粉比例约 3% 到 6%。',
      '若团块支撑不足，可小幅上调成团支撑组分约 2% 到 5%。',
    ],
    process: [
      '优化颗粒表面致密度和干燥终点，避免湿团外层过软。',
      '检查配方吸液峰值，避免局部泥化造成粘底。',
    ],
    validation: [
      '增加盆底粘附面积和铲起完整率测试。',
      '对比新砂与连续使用后的清理时间差。',
    ],
  },
  comfort: {
    issueSummary: '接受度偏低会直接影响测试稳定性，也会放大其他功能问题。',
    direction: '优先排查气味刺激、脚感不适和粉尘对猫咪的综合影响。',
    problem: '猫咪接受度不足，存在抗拒或使用频率波动',
    materials: [
      '建议减少刺激性香精或尖锐气味来源，必要时切换更中性的除味路线。',
      '可试验更圆润的颗粒或更柔和的触感材料，改善脚感适应。',
    ],
    ratios: [
      '香氛或强气味组分建议先下调约 10% 到 30%。',
      '若颗粒偏硬或偏粗，可逐步提高中粒径占比约 5% 到 10%。',
    ],
    process: [
      '控制出厂批次气味波动，避免不同批次接受度大幅变化。',
      '检查粉尘和颗粒摩擦噪声，必要时优化表面处理。',
    ],
    validation: [
      '观察更换环境或新旧砂切换时的首次使用反应。',
      '记录使用频率、停留时长和回避行为是否改善。',
    ],
  },
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundScore(value: number): number {
  return Number(value.toFixed(2));
}

function getDay(entry: AnalysisAnswerEntry): number {
  return entry.dayIndex ?? entry.testDay ?? 0;
}

function resolveStructuredScores(entry: AnalysisAnswerEntry): StructuredScores {
  if (entry.structuredScores && Object.keys(entry.structuredScores).length > 0) {
    return {
      ...createStructuredScores(3),
      ...entry.structuredScores,
    };
  }

  return calculateStructuredScoresFromAnswers(
    (entry.answers || []).map((item) => ({
      score: item.score,
      theme: item.theme,
    })),
    3,
  );
}

function getTrendStatus(scores: number[]): string {
  if (scores.length === 0) {
    return '数据不足';
  }
  const first = scores[0];
  const latest = scores[scores.length - 1];
  const avg = average(scores);
  const spread = Math.max(...scores) - Math.min(...scores);

  if (spread >= 2 && Math.abs(latest - first) < 1) {
    return '波动明显';
  }
  if (latest - first >= 1) {
    return avg >= 3.8 ? '改善后趋稳' : '明显改善';
  }
  if (latest - first <= -1) {
    return '逐步恶化';
  }
  if (avg >= 4) {
    return '高分稳定';
  }
  if (avg <= 2.4) {
    return '低分持续';
  }
  return '中位稳定';
}

function getResponseQuality(rawDays: AnalysisInputSummary['rawDays']): string {
  const avgQuestions = average(rawDays.map((item) => item.answers.length));
  const usefulRemarkRatio =
    rawDays.length > 0 ? rawDays.filter((item) => item.remarkSignal).length / rawDays.length : 0;

  if (avgQuestions >= 5 && usefulRemarkRatio >= 0.5) {
    return '高';
  }
  if (avgQuestions >= 4 && usefulRemarkRatio >= 0.2) {
    return '中';
  }
  return '低';
}

function buildInputSummary(protocol: any, answers: AnalysisAnswerEntry[]): AnalysisInputSummary {
  const normalized = answers
    .map((entry) => {
      const day = getDay(entry);
      const sanitizedRemark = sanitizeRemarkForAnalysis(entry.remark);
      return {
        day,
        submittedAt: new Date(entry.submittedAt).toISOString(),
        answers: Array.isArray(entry.answers) ? entry.answers : [],
        structuredScores: resolveStructuredScores(entry),
        remarkSignal: sanitizedRemark?.relevantText || null,
        remarkThemes: sanitizedRemark?.themes || [],
        materialState: entry.materialState || null,
        lifecyclePhase: entry.lifecyclePhase || null,
        logicBranch: entry.logicBranch || null,
      };
    })
    .filter((item) => item.day > 0)
    .sort((a, b) => a.day - b.day);

  const themeSnapshots = CANONICAL_THEME_ORDER.map((theme) => {
    const history = normalized.map((item) => ({
      day: item.day,
      score: item.structuredScores[theme] ?? 3,
    }));
    const scores = history.map((item) => item.score);

    return {
      theme,
      displayName: getThemeDisplayName(theme),
      averageScore: roundScore(average(scores)),
      firstScore: scores[0] ?? null,
      latestScore: scores[scores.length - 1] ?? null,
      lowestScore: scores.length > 0 ? Math.min(...scores) : null,
      highestScore: scores.length > 0 ? Math.max(...scores) : null,
      lowScoreDays: history.filter((item) => item.score <= 2).map((item) => item.day),
      trendStatus: getTrendStatus(scores),
      relevantRemarks: normalized
        .filter((item) => item.remarkSignal && item.remarkThemes.includes(theme))
        .map((item) => item.remarkSignal as string)
        .slice(0, 4),
    };
  });

  const daySnapshots = normalized.map((item) => {
    const scores = CANONICAL_THEME_ORDER.map((theme) => ({
      displayName: getThemeDisplayName(theme),
      score: item.structuredScores[theme] ?? 3,
    }));
    const low = [...scores].sort((a, b) => a.score - b.score).slice(0, 2);
    const high = [...scores].sort((a, b) => b.score - a.score).slice(0, 2);

    return {
      day: item.day,
      avgScore: roundScore(average(scores.map((score) => score.score))),
      mainConcerns: low.map((score) => `${score.displayName}${score.score}分`),
      positiveFeedback: high.map((score) => `${score.displayName}${score.score}分`),
      remarkSignal: item.remarkSignal,
    };
  });

  const rawDays = normalized.map((item) => ({
    day: item.day,
    submittedAt: item.submittedAt,
    answers: item.answers.map((answer) => ({
      theme: answer.theme || 'unknown',
      question: answer.question,
      score: answer.score,
    })),
    remarkSignal: item.remarkSignal,
    materialState: item.materialState,
    lifecyclePhase: item.lifecyclePhase,
    logicBranch: item.logicBranch,
  }));

  return {
    protocol: {
      id: protocol.id,
      title: protocol.title,
      productName: protocol.productName || protocol.title || '未命名产品',
      testPeriodDays: protocol.testPeriodDays || normalized.length,
    },
    answerCount: normalized.length,
    submittedDays: normalized.map((item) => item.day),
    themeSnapshots,
    daySnapshots,
    rawDays,
    remarkSignals: collectRelevantRemarkSignals(answers.map((item) => item.remark)),
  };
}

function buildFallbackAnalysis(summary: AnalysisInputSummary): QuestionnaireAnalysisReport {
  const weakestThemes = [...summary.themeSnapshots]
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 3);

  const themeFindings: ThemeFinding[] = summary.themeSnapshots.map((snapshot) => {
    const hint = THEME_HINTS[snapshot.theme];
    return {
      theme: snapshot.theme,
      displayName: snapshot.displayName,
      averageScore: snapshot.averageScore,
      firstScore: snapshot.firstScore,
      latestScore: snapshot.latestScore,
      lowestScore: snapshot.lowestScore,
      highestScore: snapshot.highestScore,
      trendStatus: snapshot.trendStatus,
      issueSummary: hint.issueSummary,
      evidence: [
        `平均分 ${snapshot.averageScore}`,
        `首日 ${snapshot.firstScore ?? '-'} 分，最近 ${snapshot.latestScore ?? '-'} 分`,
        snapshot.lowScoreDays.length > 0
          ? `低分日集中在第 ${snapshot.lowScoreDays.join('、')} 天`
          : '暂无明显低分集中日',
      ],
      relevantRemarks: snapshot.relevantRemarks,
      suggestedDirection: hint.direction,
    };
  });

  const actionPlan: ActionPlanItem[] = weakestThemes.map((snapshot, index) => {
    const hint = THEME_HINTS[snapshot.theme];
    return {
      priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
      theme: snapshot.theme,
      displayName: snapshot.displayName,
      problem: hint.problem,
      likelyCause: `${snapshot.displayName}呈现“${snapshot.trendStatus}”，需要结合评分趋势和备注继续验证根因。`,
      materialAdjustments: hint.materials,
      ratioAdjustments: hint.ratios,
      processAdjustments: hint.process,
      validationPlan: hint.validation,
      expectedImpact: `目标是提升${snapshot.displayName}维度评分稳定性，并减少其对总体体验的拖累。`,
      confidence: snapshot.averageScore <= 2.5 ? 'high' : 'medium',
    };
  });

  return {
    source: 'fallback',
    summary: `本次共分析 ${summary.answerCount} 份问卷，当前最需要优先处理的维度是${weakestThemes
      .map((item) => item.displayName)
      .join('、')}。这些维度表现为持续低分、波动明显或改善不稳定，说明核心体验还没有形成稳定认可。`,
    keyPoints: weakestThemes.map(
      (item) =>
        `${item.displayName}平均分 ${item.averageScore}，趋势为“${item.trendStatus}”，需要围绕实际低分场景做针对性优化。`,
    ),
    sentimentAnalysis:
      summary.remarkSignals.length > 0
        ? '用户备注里既有具体体验反馈，也有明显不满信号，说明产品有感知点，但痛点仍会影响整体评价。'
        : '当前用户文本反馈较少，建议继续引导填写具体使用场景，以提升分析精度。',
    recommendations: actionPlan.map(
      (item) =>
        `${item.displayName}优先处理：${item.materialAdjustments[0]} ${item.ratioAdjustments[0]}`,
    ),
    dayByDayAnalysis: summary.daySnapshots.map((item) => ({
      day: item.day,
      avgScore: item.avgScore,
      mainConcerns: item.mainConcerns,
      positiveFeedback: item.positiveFeedback,
    })),
    overallTrends: [
      `整体最弱维度为${weakestThemes[0]?.displayName || '暂无明显单一问题'}，说明该功能最影响用户总体体验。`,
      weakestThemes[0]
        ? `${weakestThemes[0].displayName}建议优先做配方和工艺联动优化，再观察分数是否连续 3 天回升。`
        : '当前数据量有限，建议继续积累更多天数后再复盘。',
    ],
    userEngagement: {
      totalSubmissions: summary.answerCount,
      averageResponseQuality: getResponseQuality(summary.rawDays),
      mostCommonIssue: weakestThemes[0]?.displayName || '暂无明显单一问题',
    },
    themeFindings,
    actionPlan,
    caution: '本次结果由规则兜底生成，建议在 AI 可用时重新生成更细化的配方建议。',
  };
}

function mergeAiAnalysis(
  base: QuestionnaireAnalysisReport,
  ai: AIAnalysisPayload,
): QuestionnaireAnalysisReport {
  const aiThemeMap = new Map(
    (Array.isArray(ai.themeInsights) ? ai.themeInsights : []).map((item) => [item.theme, item]),
  );
  const baseActionMap = new Map(base.actionPlan.map((item) => [item.theme, item]));

  const themeFindings = base.themeFindings.map((item) => {
    const insight = aiThemeMap.get(item.theme);
    if (!insight) {
      return item;
    }

    return {
      ...item,
      issueSummary: insight.issueSummary || item.issueSummary,
      evidence: [...(insight.evidenceHighlights || []), ...item.evidence].slice(0, 5),
      suggestedDirection: insight.suggestedDirection || item.suggestedDirection,
    };
  });

  const actionPlan =
    Array.isArray(ai.actionPlan) && ai.actionPlan.length > 0
      ? ai.actionPlan.map((item) => {
          const baseAction = baseActionMap.get(item.theme);
          return {
            priority: item.priority || baseAction?.priority || 'medium',
            theme: item.theme,
            displayName: getThemeDisplayName(item.theme),
            problem: item.problem || baseAction?.problem || '',
            likelyCause: item.likelyCause || baseAction?.likelyCause || '',
            materialAdjustments:
              Array.isArray(item.materialAdjustments) && item.materialAdjustments.length > 0
                ? item.materialAdjustments
                : baseAction?.materialAdjustments || [],
            ratioAdjustments:
              Array.isArray(item.ratioAdjustments) && item.ratioAdjustments.length > 0
                ? item.ratioAdjustments
                : baseAction?.ratioAdjustments || [],
            processAdjustments:
              Array.isArray(item.processAdjustments) && item.processAdjustments.length > 0
                ? item.processAdjustments
                : baseAction?.processAdjustments || [],
            validationPlan:
              Array.isArray(item.validationPlan) && item.validationPlan.length > 0
                ? item.validationPlan
                : baseAction?.validationPlan || [],
            expectedImpact: item.expectedImpact || baseAction?.expectedImpact || '',
            confidence: item.confidence || baseAction?.confidence || 'medium',
          };
        })
      : base.actionPlan;

  return {
    ...base,
    source: 'ai',
    summary: ai.summary || base.summary,
    keyPoints: Array.isArray(ai.keyPoints) && ai.keyPoints.length > 0 ? ai.keyPoints : base.keyPoints,
    sentimentAnalysis: ai.sentimentAnalysis || base.sentimentAnalysis,
    overallTrends:
      Array.isArray(ai.overallTrends) && ai.overallTrends.length > 0
        ? ai.overallTrends
        : base.overallTrends,
    recommendations:
      Array.isArray(ai.recommendations) && ai.recommendations.length > 0
        ? ai.recommendations
        : actionPlan.map(
            (item) =>
              `${item.displayName}优先处理：${item.materialAdjustments[0] || item.problem} ${item.ratioAdjustments[0] || ''}`.trim(),
          ),
    themeFindings,
    actionPlan,
    caution: ai.caution || undefined,
  };
}

export async function analyzeQuestionnaireAnswers(
  protocol: any,
  answers: AnalysisAnswerEntry[],
): Promise<{ analysis: QuestionnaireAnalysisReport; inputSummary: AnalysisInputSummary }> {
  const inputSummary = buildInputSummary(protocol, answers);
  const fallbackAnalysis = buildFallbackAnalysis(inputSummary);

  try {
    const aiAnalysis = await generateJson<AIAnalysisPayload>({
      systemPrompt: [
        '你是宠物猫砂产品的高级配方、工艺与用户体验分析顾问。',
        '必须使用简体中文输出，并且只能输出严格 JSON。',
        '你只负责真正需要推理的部分，不要重复生成均分、逐日表格等统计字段。',
        '只能依据给定数据推理，不得编造未提供的实验结果或用户反馈。',
        '每条结论都要绑定实际证据，例如低分主题、备注信号、首日和最近分数、持续低分天数。',
        '建议必须具体、可执行，并优先覆盖材料建议、比例调整、工艺动作、验证方案。',
        '严禁空话；如果证据不足，请直接写“证据不足”，并说明还缺什么验证。',
        'theme 字段必须使用 odor、dust、clumping、cleanup、comfort 之一。',
      ].join(' '),
      userPrompt: JSON.stringify(
        {
          productContext: '猫砂/宠物垫料类问卷，固定维度为除臭、粉尘、结团、清理、猫咪接受度。',
          analysisGoal:
            '输出真正能指导产品升级的诊断结果，尤其是低分和波动背后的可能根因，以及材料、比例、工艺和验证层面的动作。',
          data: {
            protocol: inputSummary.protocol,
            answerCount: inputSummary.answerCount,
            submittedDays: inputSummary.submittedDays,
            weakestThemes: inputSummary.themeSnapshots
              .slice()
              .sort((a, b) => a.averageScore - b.averageScore)
              .slice(0, 3),
            strongestThemes: inputSummary.themeSnapshots
              .slice()
              .sort((a, b) => b.averageScore - a.averageScore)
              .slice(0, 2),
            daySnapshots: inputSummary.daySnapshots,
            remarkSignals: inputSummary.remarkSignals,
            rawDays: inputSummary.rawDays,
          },
          outputSchema: {
            summary: '不超过160字',
            keyPoints: ['最多4条'],
            sentimentAnalysis: '不超过120字',
            overallTrends: ['最多4条'],
            recommendations: ['最多4条'],
            themeInsights: [
              {
                theme: 'odor|dust|clumping|cleanup|comfort',
                issueSummary: 'string',
                evidenceHighlights: ['最多3条'],
                suggestedDirection: 'string',
              },
            ],
            actionPlan: [
              {
                priority: 'high|medium|low',
                theme: 'odor|dust|clumping|cleanup|comfort',
                problem: 'string',
                likelyCause: 'string',
                materialAdjustments: ['最多2条'],
                ratioAdjustments: ['最多2条'],
                processAdjustments: ['最多2条'],
                validationPlan: ['最多2条'],
                expectedImpact: 'string',
                confidence: 'high|medium|low',
              },
            ],
            caution: 'string',
          },
        },
        null,
        2,
      ),
      temperature: 0.1,
      maxTokens: 1200,
    });

    return {
      analysis: mergeAiAnalysis(fallbackAnalysis, aiAnalysis),
      inputSummary,
    };
  } catch (error) {
    console.error('AI questionnaire analysis failed, using fallback:', error);
    return {
      analysis: fallbackAnalysis,
      inputSummary,
    };
  }
}
