import { generateJson } from '@/lib/ai/chatgpt';
import { sanitizeRemarkForAnalysis } from '@/lib/questionnaire/remarkSanitizer';
import {
  CANONICAL_THEME_ORDER,
  createStructuredScores,
  normalizeTheme,
  type CanonicalTheme,
  type StructuredScores,
} from '@/lib/questionnaire/themes';

import {
  FocusAngle,
  QuestionTemplate,
  QuestionTemplateManager,
  RiskLevel,
  TrendStatus,
} from './questionTemplateManager';
import { QuestionTextValidator } from './questionTextValidator';

export interface Question {
  id: string;
  theme: CanonicalTheme;
  title: string;
  options: string[];
  followupRule: string;
  validation?: import('./questionTextValidator').ValidationResult;
  source?: 'model' | 'fallback';
}

interface PreviousDayAnswer {
  questionId: string;
  score: number;
  question: string;
  theme?: string;
  structuredScores?: StructuredScores;
}

export interface HistoricalAnswerEntry {
  testDay: number;
  structuredScores?: Partial<StructuredScores> | null;
  answers?: PreviousDayAnswer[];
  remark?: string | null;
}

export interface HistoricalQuestionEntry {
  testDay: number;
  id: string;
  theme?: string | null;
  title: string;
}

interface ThemeHistorySnapshot {
  theme: CanonicalTheme;
  baselineScore: number;
  latestScore: number;
  recentScores: number[];
  scoreHistory: Array<{ testDay: number; score: number }>;
  minScore: number;
  maxScore: number;
  averageScore: number;
  questionTitles: string[];
  recentRemarkSignals: string[];
}

export interface ThemeTrendDiagnosis {
  theme: CanonicalTheme;
  trendStatus: TrendStatus;
  riskLevel: RiskLevel;
  focusAngle: FocusAngle;
  evidence: string;
  remarkSignal: string;
}

interface DailyQuestionnaireResponse {
  globalDayIndex: number;
  cycleIndex: number;
  dayInCycle: number;
  questions: Question[];
  materialState: MaterialState;
  logicBranch: LogicBranch;
  lifecyclePhase: LifecyclePhase;
  avoidRepeatCheck: string;
  generationStrategy: 'baseline' | 'ai-diagnosis' | 'rule-fallback';
  questionSourceDetails?: string[];
}

export type MaterialState = 'new_bag' | 'normal' | 'nearing_end' | 'ended';
export type LogicBranch = 'normal' | 'endgame' | 'retrospective';
export type LifecyclePhase = 'early' | 'mid' | 'late';

interface DynamicQuestionnaireConfig {
  productName: string;
  dayIndex: number;
  testDurationDays: number;
  currentMaterialState?: MaterialState;
  previousAnswers?: PreviousDayAnswer[];
  historyQuestions?: string[];
  answerHistory?: HistoricalAnswerEntry[];
  questionHistory?: HistoricalQuestionEntry[];
}

const MATERIAL_STATE_TRANSITIONS: Record<
  MaterialState,
  { canTransitionTo: MaterialState[]; thresholdDays: number }
> = {
  new_bag: {
    canTransitionTo: ['normal'],
    thresholdDays: 3,
  },
  normal: {
    canTransitionTo: ['nearing_end'],
    thresholdDays: 14,
  },
  nearing_end: {
    canTransitionTo: ['ended'],
    thresholdDays: 21,
  },
  ended: {
    canTransitionTo: [],
    thresholdDays: Number.POSITIVE_INFINITY,
  },
};

const AI_TREND_VALUES: TrendStatus[] = [
  'worsening',
  'improving',
  'stable_good',
  'fluctuating',
  'accepted',
];

const AI_RISK_VALUES: RiskLevel[] = ['high', 'medium', 'low'];
const AI_FOCUS_VALUES: FocusAngle[] = [
  'severity',
  'frequency',
  'spread',
  'stability',
  'durability',
  'scenario',
  'impact',
];

const ACCEPTANCE_PATTERNS = [
  /能接受/,
  /还可以用/,
  /还能用/,
  /习惯/,
  /凑合/,
  /将就/,
  /问题不大/,
  /可接受/,
];

export class DynamicQuestionnaireGenerator {
  private readonly TOTAL_DAYS = 21;
  private readonly DAYS_PER_CYCLE = 7;

  async generateDailyQuestionnaire(
    config: DynamicQuestionnaireConfig,
  ): Promise<DailyQuestionnaireResponse> {
    const {
      productName,
      dayIndex,
      testDurationDays,
      currentMaterialState,
      previousAnswers,
      historyQuestions,
      answerHistory,
      questionHistory,
    } = config;

    const cycleIndex = Math.ceil(dayIndex / this.DAYS_PER_CYCLE);
    const dayInCycle = ((dayIndex - 1) % this.DAYS_PER_CYCLE) + 1;
    const lifecyclePhase = this.calculateLifecyclePhase(dayIndex);
    const materialState = this.calculateMaterialState(
      currentMaterialState || 'new_bag',
      dayIndex,
    );
    const structuredScores = this.extractStructuredScores(previousAnswers);
    const logicBranch = this.calculateLogicBranch(materialState, dayIndex, structuredScores);

    if (dayIndex === 1) {
      return {
        questions: this.validateTemplates(
          QuestionTemplateManager.getDay1BaselineQuestions(),
          '建立 5 维基线评分',
          'fallback',
        ),
        globalDayIndex: dayIndex,
        cycleIndex,
        dayInCycle,
        materialState,
        logicBranch,
        lifecyclePhase,
        avoidRepeatCheck: 'Day 1 固定基线题',
        generationStrategy: 'baseline',
        questionSourceDetails: ['baseline:fixed'],
      };
    }

    const themeSnapshots = this.buildThemeSnapshots({
      dayIndex,
      answerHistory,
      previousAnswers,
      questionHistory,
      historyQuestions,
    });

    const localDiagnoses = themeSnapshots.map((snapshot) =>
      this.deriveLocalDiagnosis(snapshot, dayIndex),
    );

    let diagnoses = localDiagnoses;
    let generationStrategy: DailyQuestionnaireResponse['generationStrategy'] = 'rule-fallback';
    let detailPrefix = 'diagnosis:fallback';

    try {
      const aiDiagnoses = await this.diagnoseThemeTrendsWithAI({
        productName,
        dayIndex,
        testDurationDays,
        themeSnapshots,
        localDiagnoses,
      });

      diagnoses = this.mergeDiagnoses(localDiagnoses, aiDiagnoses);
      generationStrategy = 'ai-diagnosis';
      detailPrefix = 'diagnosis:model';
    } catch (error) {
      console.warn('[DynamicQuestionnaireGenerator] AI diagnosis failed, using local fallback', error);
    }

    const rawQuestions = diagnoses.map((diagnosis) =>
      QuestionTemplateManager.buildFollowUpQuestion({
        theme: diagnosis.theme,
        trendStatus: diagnosis.trendStatus,
        focusAngle: diagnosis.focusAngle,
        dayIndex,
      }),
    );

    const questions = this.validateTemplates(
      rawQuestions,
      '基于历史趋势生成追问',
      generationStrategy === 'ai-diagnosis' ? 'model' : 'fallback',
    );

    const questionnaireValidation = QuestionTextValidator.validateQuestionnaire(questions);
    if (!questionnaireValidation.valid) {
      console.warn(
        '[DynamicQuestionnaireGenerator] Questionnaire validation failed, using local diagnosis templates',
        questionnaireValidation.errors,
      );

      const fallbackQuestions = this.validateTemplates(
        localDiagnoses.map((diagnosis) =>
          QuestionTemplateManager.buildFollowUpQuestion({
            theme: diagnosis.theme,
            trendStatus: diagnosis.trendStatus,
            focusAngle: diagnosis.focusAngle,
            dayIndex,
          }),
        ),
        '基于本地规则兜底生成追问',
        'fallback',
      );

      return {
        questions: fallbackQuestions,
        globalDayIndex: dayIndex,
        cycleIndex,
        dayInCycle,
        materialState,
        logicBranch,
        lifecyclePhase,
        avoidRepeatCheck: 'AI 诊断或题目校验失败，已回退到规则模板',
        generationStrategy: 'rule-fallback',
        questionSourceDetails: localDiagnoses.map(
          (diagnosis) =>
            `diagnosis:fallback:${diagnosis.theme}:${diagnosis.trendStatus}:${diagnosis.focusAngle}`,
        ),
      };
    }

    return {
      questions,
      globalDayIndex: dayIndex,
      cycleIndex,
      dayInCycle,
      materialState,
      logicBranch,
      lifecyclePhase,
      avoidRepeatCheck: '按主题趋势诊断生成，已避免同日重复主题',
      generationStrategy,
      questionSourceDetails: diagnoses.map(
        (diagnosis) =>
          `${detailPrefix}:${diagnosis.theme}:${diagnosis.trendStatus}:${diagnosis.focusAngle}`,
      ),
    };
  }

  private calculateLifecyclePhase(dayIndex: number): LifecyclePhase {
    if (dayIndex <= 7) {
      return 'early';
    }

    if (dayIndex <= 14) {
      return 'mid';
    }

    return 'late';
  }

  private calculateMaterialState(currentState: MaterialState, dayIndex: number): MaterialState {
    const config = MATERIAL_STATE_TRANSITIONS[currentState];
    if (dayIndex >= config.thresholdDays && config.canTransitionTo.length > 0) {
      return config.canTransitionTo[0];
    }
    return currentState;
  }

  private calculateLogicBranch(
    materialState: MaterialState,
    dayIndex: number,
    scores?: StructuredScores,
  ): LogicBranch {
    if (materialState === 'nearing_end' && dayIndex >= 18) {
      return 'endgame';
    }

    if (dayIndex === this.TOTAL_DAYS && scores && (scores.odor <= 2 || scores.dust <= 2)) {
      return 'retrospective';
    }

    return 'normal';
  }

  private extractStructuredScores(previousAnswers?: PreviousDayAnswer[]): StructuredScores | undefined {
    if (!previousAnswers || previousAnswers.length === 0) {
      return undefined;
    }

    const latestWithStructuredScores = previousAnswers.find((answer) => answer.structuredScores);
    if (latestWithStructuredScores?.structuredScores) {
      return latestWithStructuredScores.structuredScores;
    }

    const scores = createStructuredScores(3);
    previousAnswers.forEach((answer) => {
      const theme = normalizeTheme(answer.theme) || this.inferThemeFromQuestion(answer.question);
      scores[theme] = answer.score;
    });
    return scores;
  }

  private inferThemeFromQuestion(question: string): CanonicalTheme {
    if (/(异味|味道|除臭|臭味)/.test(question)) return 'odor';
    if (/(扬尘|灰尘|粉尘)/.test(question)) return 'dust';
    if (/(结团|散团|团块)/.test(question)) return 'clumping';
    if (/(清理|粘底|铲)/.test(question)) return 'cleanup';
    return 'comfort';
  }

  private buildThemeSnapshots(input: {
    dayIndex: number;
    answerHistory?: HistoricalAnswerEntry[];
    previousAnswers?: PreviousDayAnswer[];
    questionHistory?: HistoricalQuestionEntry[];
    historyQuestions?: string[];
  }): ThemeHistorySnapshot[] {
    const synthesizedHistory = this.normalizeAnswerHistory(
      input.answerHistory,
      input.previousAnswers,
      input.dayIndex,
    );

    const normalizedQuestionHistory = this.normalizeQuestionHistory(
      input.questionHistory,
      input.historyQuestions,
    );

    return CANONICAL_THEME_ORDER.map((theme) => {
      const scoreHistory = synthesizedHistory
        .map((entry) => ({
          testDay: entry.testDay,
          score: entry.scores[theme],
          remarkSignal: entry.remarkSignal,
        }))
        .filter((entry) => typeof entry.score === 'number');

      const latestScore = scoreHistory.at(-1)?.score ?? 3;
      const baselineScore = scoreHistory[0]?.score ?? latestScore;
      const recentScores = scoreHistory.slice(-3).map((entry) => entry.score);
      const scoreValues = scoreHistory.map((entry) => entry.score);
      const themeQuestions = normalizedQuestionHistory
        .filter((question) => question.theme === theme)
        .map((question) => question.title)
        .slice(-4);

      const recentRemarkSignals = synthesizedHistory
        .filter((entry) => entry.remarkThemes.includes(theme) && entry.remarkSignal)
        .map((entry) => entry.remarkSignal as string)
        .slice(-3);

      const averageScore =
        scoreValues.length > 0
          ? Number((scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length).toFixed(2))
          : latestScore;

      return {
        theme,
        baselineScore,
        latestScore,
        recentScores: recentScores.length > 0 ? recentScores : [latestScore],
        scoreHistory: scoreHistory.map(({ testDay, score }) => ({ testDay, score })),
        minScore: scoreValues.length > 0 ? Math.min(...scoreValues) : latestScore,
        maxScore: scoreValues.length > 0 ? Math.max(...scoreValues) : latestScore,
        averageScore,
        questionTitles: themeQuestions,
        recentRemarkSignals,
      };
    });
  }

  private normalizeAnswerHistory(
    answerHistory: HistoricalAnswerEntry[] | undefined,
    previousAnswers: PreviousDayAnswer[] | undefined,
    dayIndex: number,
  ): Array<{
    testDay: number;
    scores: StructuredScores;
    remarkSignal: string | null;
    remarkThemes: CanonicalTheme[];
  }> {
    const entries = Array.isArray(answerHistory) ? [...answerHistory] : [];

    if (entries.length === 0 && previousAnswers && previousAnswers.length > 0) {
      entries.push({
        testDay: Math.max(1, dayIndex - 1),
        answers: previousAnswers,
        structuredScores: this.extractStructuredScores(previousAnswers),
        remark: null,
      });
    }

    return entries
      .sort((a, b) => a.testDay - b.testDay)
      .map((entry) => {
        const scores = this.normalizeStructuredScores(entry);
        const sanitizedRemark = sanitizeRemarkForAnalysis(entry.remark);

        return {
          testDay: entry.testDay,
          scores,
          remarkSignal: sanitizedRemark?.relevantText || null,
          remarkThemes: sanitizedRemark?.themes || [],
        };
      });
  }

  private normalizeStructuredScores(entry: HistoricalAnswerEntry): StructuredScores {
    const base = createStructuredScores(3);

    CANONICAL_THEME_ORDER.forEach((theme) => {
      const value = entry.structuredScores?.[theme];
      if (typeof value === 'number' && value >= 1 && value <= 5) {
        base[theme] = value;
      }
    });

    if (entry.answers && entry.answers.length > 0) {
      entry.answers.forEach((answer) => {
        const theme = normalizeTheme(answer.theme) || this.inferThemeFromQuestion(answer.question);
        base[theme] = answer.score;
      });
    }

    return base;
  }

  private normalizeQuestionHistory(
    questionHistory?: HistoricalQuestionEntry[],
    historyQuestions?: string[],
  ): Array<{ testDay: number; theme?: CanonicalTheme; title: string }> {
    if (questionHistory && questionHistory.length > 0) {
      return questionHistory.map((question) => ({
        testDay: question.testDay,
        theme: normalizeTheme(question.theme) || this.inferThemeFromQuestion(question.title),
        title: question.title,
      }));
    }

    return (historyQuestions || []).map((title, index) => ({
      testDay: index + 1,
      theme: this.inferThemeFromQuestion(title),
      title,
    }));
  }

  private deriveLocalDiagnosis(
    snapshot: ThemeHistorySnapshot,
    dayIndex: number,
  ): ThemeTrendDiagnosis {
    const recentScores = snapshot.recentScores;
    const latestScore = snapshot.latestScore;
    const previousScore = recentScores.at(-2) ?? snapshot.baselineScore;
    const variability = snapshot.maxScore - snapshot.minScore;
    const deltaFromBaseline = latestScore - snapshot.baselineScore;
    const deltaFromPrevious = latestScore - previousScore;
    const hasAcceptanceSignal = snapshot.recentRemarkSignals.some((signal) =>
      ACCEPTANCE_PATTERNS.some((pattern) => pattern.test(signal)),
    );

    let trendStatus: TrendStatus;
    if (hasAcceptanceSignal && latestScore <= 3) {
      trendStatus = 'accepted';
    } else if (variability >= 2 && recentScores.length >= 2) {
      trendStatus = 'fluctuating';
    } else if (latestScore >= 4 && recentScores.every((score) => score >= 4)) {
      trendStatus = 'stable_good';
    } else if (deltaFromPrevious <= -1 || deltaFromBaseline <= -2 || latestScore <= 2) {
      trendStatus = 'worsening';
    } else if (deltaFromBaseline >= 1 || (previousScore <= 2 && latestScore >= 3)) {
      trendStatus = 'improving';
    } else if (latestScore >= 4) {
      trendStatus = 'stable_good';
    } else {
      trendStatus = 'accepted';
    }

    let riskLevel: RiskLevel;
    if (latestScore <= 2) {
      riskLevel = 'high';
    } else if (latestScore === 3 || variability >= 2) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    const focusAngle = this.pickFocusAngle(snapshot.theme, trendStatus, dayIndex);
    const evidence = `基线 ${snapshot.baselineScore} 分，最近 ${recentScores.join('/')} 分，当前 ${latestScore} 分`;
    const remarkSignal = snapshot.recentRemarkSignals.join('；');

    return {
      theme: snapshot.theme,
      trendStatus,
      riskLevel,
      focusAngle,
      evidence,
      remarkSignal,
    };
  }

  private pickFocusAngle(
    theme: CanonicalTheme,
    trendStatus: TrendStatus,
    dayIndex: number,
  ): FocusAngle {
    switch (trendStatus) {
      case 'worsening':
        if (theme === 'odor' || theme === 'dust') {
          return dayIndex % 2 === 0 ? 'frequency' : 'spread';
        }
        if (theme === 'comfort') {
          return 'scenario';
        }
        return 'severity';
      case 'improving':
        return dayIndex % 2 === 0 ? 'stability' : 'durability';
      case 'stable_good':
        return dayIndex % 2 === 0 ? 'durability' : 'stability';
      case 'fluctuating':
        return dayIndex % 2 === 0 ? 'scenario' : 'stability';
      case 'accepted':
      default:
        return 'impact';
    }
  }

  private async diagnoseThemeTrendsWithAI(input: {
    productName: string;
    dayIndex: number;
    testDurationDays: number;
    themeSnapshots: ThemeHistorySnapshot[];
    localDiagnoses: ThemeTrendDiagnosis[];
  }): Promise<ThemeTrendDiagnosis[]> {
    const systemPrompt = [
      '你是产品试用问卷的趋势诊断器。',
      '你的任务是根据历史评分和备注信号，输出 5 个主题的结构化诊断，不要写自然语言题目。',
      '只允许输出 JSON。',
      'trendStatus 只能是 worsening / improving / stable_good / fluctuating / accepted。',
      'riskLevel 只能是 high / medium / low。',
      'focusAngle 只能是 severity / frequency / spread / stability / durability / scenario / impact。',
      'evidence 和 remarkSignal 保持简短，必须引用输入信息，不能编造。',
    ].join(' ');

    const userPrompt = JSON.stringify(
      {
        productName: input.productName,
        dayIndex: input.dayIndex,
        testDurationDays: input.testDurationDays,
        themes: input.themeSnapshots,
        localDiagnoses: input.localDiagnoses,
        outputFormat: {
          themes: CANONICAL_THEME_ORDER.map((theme) => ({
            theme,
            trendStatus: 'worsening|improving|stable_good|fluctuating|accepted',
            riskLevel: 'high|medium|low',
            focusAngle: 'severity|frequency|spread|stability|durability|scenario|impact',
            evidence: 'string',
            remarkSignal: 'string',
          })),
        },
      },
      null,
      2,
    );

    const response = await generateJson<{ themes: Array<Record<string, unknown>> }>({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
    });

    if (!Array.isArray(response.themes)) {
      throw new Error('AI diagnosis response missing themes array');
    }

    return response.themes.map((raw) => this.parseDiagnosis(raw));
  }

  private parseDiagnosis(raw: Record<string, unknown>): ThemeTrendDiagnosis {
    const theme = normalizeTheme(String(raw.theme || ''));
    const trendStatus = String(raw.trendStatus || '');
    const riskLevel = String(raw.riskLevel || '');
    const focusAngle = String(raw.focusAngle || '');

    if (!theme) {
      throw new Error('AI diagnosis theme is invalid');
    }
    if (!AI_TREND_VALUES.includes(trendStatus as TrendStatus)) {
      throw new Error(`AI diagnosis trendStatus is invalid for theme ${theme}`);
    }
    if (!AI_RISK_VALUES.includes(riskLevel as RiskLevel)) {
      throw new Error(`AI diagnosis riskLevel is invalid for theme ${theme}`);
    }
    if (!AI_FOCUS_VALUES.includes(focusAngle as FocusAngle)) {
      throw new Error(`AI diagnosis focusAngle is invalid for theme ${theme}`);
    }

    return {
      theme,
      trendStatus: trendStatus as TrendStatus,
      riskLevel: riskLevel as RiskLevel,
      focusAngle: focusAngle as FocusAngle,
      evidence: String(raw.evidence || ''),
      remarkSignal: String(raw.remarkSignal || ''),
    };
  }

  private mergeDiagnoses(
    localDiagnoses: ThemeTrendDiagnosis[],
    aiDiagnoses: ThemeTrendDiagnosis[],
  ): ThemeTrendDiagnosis[] {
    const aiMap = new Map(aiDiagnoses.map((diagnosis) => [diagnosis.theme, diagnosis]));

    return localDiagnoses.map((diagnosis) => {
      return aiMap.get(diagnosis.theme) || diagnosis;
    });
  }

  private validateTemplates(
    templates: QuestionTemplate[],
    followupRule: string,
    source: 'model' | 'fallback',
  ): Question[] {
    return templates.map((template) => ({
      id: template.id,
      theme: template.theme,
      title: template.title,
      options: template.options,
      followupRule,
      validation: QuestionTextValidator.validateSingle(template.title),
      source,
    }));
  }
}

export const dynamicQuestionnaireGenerator = new DynamicQuestionnaireGenerator();
