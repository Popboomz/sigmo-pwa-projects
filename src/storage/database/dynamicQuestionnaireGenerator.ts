import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { QuestionTextValidator, QuestionWithValidation } from './questionTextValidator';
import { QuestionTemplateManager, PreviousDayScores, QuestionTemplate } from './questionTemplateManager';

export interface Question {
  id: string;
  theme: string;
  title: string;
  options: string[];
  followupRule: string;
  validation?: import('./questionTextValidator').ValidationResult;
  source?: 'model' | 'fallback';
}

interface StructuredScores {
  odor: number;      // 除臭感受
  dust: number;      // 扬尘感受
  clumping: number;  // 结团体验
  comfort: number;   // 猫咪接受度
  cleanup: number;   // 清理轻松度
}

interface PreviousDayAnswer {
  questionId: string;
  score: number;
  question: string;
  theme?: string;
  structuredScores?: StructuredScores;
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
}

export type MaterialState = 'new_bag' | 'normal' | 'nearing_end' | 'ended';
export type LogicBranch = 'normal' | 'endgame' | 'retrospective';
export type LifecyclePhase = 'early' | 'mid' | 'late';

interface DynamicQuestionnaireConfig {
  productName: string;
  dayIndex: number;
  testDurationDays: number;
  currentMaterialState?: MaterialState; // 改为可选
  previousAnswers?: PreviousDayAnswer[];
  historyQuestions?: string[];
}

/**
 * 主题池定义（保持不变，兼容现有逻辑）
 */
const THEME_POOL = [
  'odor_control',      // 除臭感受
  'dust_level',        // 扬尘感受
  'clumping',          // 结团体验
  'tracking',          // 带出/粘爪
  'cleanup',           // 清理轻松度
  'urine_absorb',      // 吸收表现
  'appearance',        // 外观变化
  'comfort',           // 猫咪接受度
] as const;

type Theme = typeof THEME_POOL[number];

const THEME_NAMES: Record<Theme, string> = {
  odor_control: '除臭感受',
  dust_level: '扬尘感受',
  clumping: '结团体验',
  tracking: '带出/粘爪',
  cleanup: '清理轻松度',
  urine_absorb: '吸收表现',
  appearance: '外观变化',
  comfort: '猫咪接受度',
};

/**
 * 生命周期阶段定义（21天）
 */
const PHASE_CONFIG = {
  early: { start: 1, end: 7, name: '早期体验' },
  mid: { start: 8, end: 14, name: '稳定体验' },
  late: { start: 15, end: 21, name: '衰减/持久体验' },
};

/**
 * 物料状态定义
 */
const MATERIAL_STATE_TRANSITIONS: Record<MaterialState, { canTransitionTo: MaterialState[]; thresholdDays: number }> = {
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
    thresholdDays: Infinity,
  },
};

/**
 * 逻辑分支定义
 */
const BRANCH_CONDITIONS = {
  endgame: (state: MaterialState, day: number, scores?: StructuredScores) =>
    state === 'nearing_end' && day >= 18,
  retrospective: (state: MaterialState, day: number, scores?: StructuredScores) =>
    day === 21 && scores && (scores.odor <= 2 || scores.dust <= 2),
  normal: () => true,
};

/**
 * 动态问卷生成器（升级版）
 * 测试总长度：21天，3个阶段
 * 状态机：new_bag -> normal -> nearing_end -> ended（不可逆）
 * 逻辑分支：normal | endgame | retrospective
 */
export class DynamicQuestionnaireGenerator {
  private readonly TOTAL_DAYS = 21;
  private readonly DAYS_PER_CYCLE = 7;

  /**
   * 生成每日问卷（升级版，包含状态机和分支逻辑）
   */
  async generateDailyQuestionnaire(config: DynamicQuestionnaireConfig): Promise<DailyQuestionnaireResponse> {
    const {
      productName,
      dayIndex,
      testDurationDays,
      currentMaterialState,
      previousAnswers,
      historyQuestions,
    } = config;

    // 计算周期信息
    const cycleIndex = Math.ceil(dayIndex / this.DAYS_PER_CYCLE);
    const dayInCycle = ((dayIndex - 1) % this.DAYS_PER_CYCLE) + 1;

    // 计算生命周期阶段
    const lifecyclePhase = this.calculateLifecyclePhase(dayIndex);

    // 计算新的物料状态（不可逆）
    const newMaterialState = this.calculateMaterialState(currentMaterialState || 'new_bag', dayIndex);

    // 提取 5 维度评分
    const structuredScores = this.extractStructuredScores(previousAnswers);

    // 计算逻辑分支
    const logicBranch = this.calculateLogicBranch(newMaterialState, dayIndex, structuredScores);

    // 如果是第一天，使用预设的基线问题
    if (dayIndex === 1) {
      return {
        ...this.getBaselineQuestions(productName),
        globalDayIndex: dayIndex,
        cycleIndex,
        dayInCycle,
        materialState: newMaterialState,
        logicBranch,
        lifecyclePhase,
        avoidRepeatCheck: '基线问题',
      };
    }

    // 准备历史问题文本
    const historyText = this.formatHistoryQuestions(historyQuestions || []);

    // 准备前一天评分（5 维度）
    const prevDayScores = this.formatPreviousDayScores(previousAnswers, structuredScores);

    // 使用 AI 生成问题
    let response = await this.generateQuestionsWithAI({
      productName,
      globalDayIndex: dayIndex,
      cycleIndex,
      dayInCycle,
      lifecyclePhase,
      materialState: newMaterialState,
      logicBranch,
      prevDayScores,
      historyText,
      structuredScores,
    });

    // 验证 AI 生成的问题是否符合新规则
    const validQuestions = response.questions.filter((q: Question) => {
      const validation = QuestionTextValidator.validateSingle(q.title);
      (q as any).validation = validation;
      return validation.valid;
    });

    if (validQuestions.length < 5) {
      // AI 生成的问题不符合要求，使用本地模板兜底
      console.warn('[DynamicQuestionnaireGenerator] AI generated invalid questions, using fallback template');
      response = this.getProgressiveQuestions(
        cycleIndex,
        dayInCycle,
        lifecyclePhase,
        newMaterialState,
        logicBranch,
        structuredScores,
      );
      response.avoidRepeatCheck = response.avoidRepeatCheck + '（AI 验证失败兜底）';
    }

    return {
      ...response,
      globalDayIndex: dayIndex,
      cycleIndex,
      dayInCycle,
      materialState: newMaterialState,
      logicBranch,
      lifecyclePhase,
    };
  }

  /**
   * 计算生命周期阶段
   */
  private calculateLifecyclePhase(dayIndex: number): LifecyclePhase {
    if (dayIndex <= PHASE_CONFIG.early.end) {
      return 'early';
    } else if (dayIndex <= PHASE_CONFIG.mid.end) {
      return 'mid';
    } else {
      return 'late';
    }
  }

  /**
   * 计算物料状态（不可逆状态机）
   */
  private calculateMaterialState(currentState: MaterialState, dayIndex: number): MaterialState {
    const config = MATERIAL_STATE_TRANSITIONS[currentState];

    // 如果已达到阈值，则检查是否需要升级
    if (dayIndex >= config.thresholdDays && config.canTransitionTo.length > 0) {
      // 转换到下一个状态
      return config.canTransitionTo[0];
    }

    return currentState;
  }

  /**
   * 计算逻辑分支
   */
  private calculateLogicBranch(
    materialState: MaterialState,
    dayIndex: number,
    scores?: StructuredScores,
  ): LogicBranch {
    // 按优先级检查分支条件
    if (BRANCH_CONDITIONS.endgame(materialState, dayIndex, scores)) {
      return 'endgame';
    }

    if (BRANCH_CONDITIONS.retrospective(materialState, dayIndex, scores)) {
      return 'retrospective';
    }

    return 'normal';
  }

  /**
   * 提取 5 维度评分（从前一天答案）
   */
  private extractStructuredScores(previousAnswers?: PreviousDayAnswer[]): StructuredScores | undefined {
    if (!previousAnswers || previousAnswers.length === 0) {
      return undefined;
    }

    // 如果已有结构化评分，直接返回
    const latestAnswer = previousAnswers[previousAnswers.length - 1];
    if (latestAnswer.structuredScores) {
      return latestAnswer.structuredScores;
    }

    // 否则从问题和评分中推断（临时兼容逻辑）
    const scores: StructuredScores = {
      odor: 3,
      dust: 3,
      clumping: 3,
      comfort: 3,
      cleanup: 3,
    };

    previousAnswers.forEach(answer => {
      const theme = answer.theme || this.inferThemeFromQuestion(answer.question);
      scores[theme as keyof StructuredScores] = answer.score;
    });

    return scores;
  }

  /**
   * 从问题文本推断主题
   */
  private inferThemeFromQuestion(question: string): keyof StructuredScores {
    if (question.includes('除臭') || question.includes('味道')) return 'odor';
    if (question.includes('扬尘') || question.includes('粉尘')) return 'dust';
    if (question.includes('结团') || question.includes('团')) return 'clumping';
    if (question.includes('猫咪') || question.includes('喜欢')) return 'comfort';
    if (question.includes('清理') || question.includes('铲')) return 'cleanup';
    return 'comfort'; // 默认
  }

  /**
   * 获取第一天基线问题（5 维度）- 使用新的验证规则
   */
  private getBaselineQuestions(productName: string): Omit<DailyQuestionnaireResponse, 'globalDayIndex' | 'cycleIndex' | 'dayInCycle' | 'materialState' | 'logicBranch' | 'lifecyclePhase'> {
    // 使用新的固定基线问题模板
    const baselineTemplates = QuestionTemplateManager.getDay1BaselineQuestions();

    // 验证每个问题
    const validatedQuestions = baselineTemplates.map((template) => {
      const validation = QuestionTextValidator.validateSingle(template.title);
      return {
        id: template.id,
        theme: template.theme,
        title: template.title,
        options: template.options,
        followupRule: `建立${THEME_NAMES[template.theme as keyof typeof THEME_NAMES] || template.theme}基线`,
        validation,
        source: 'fallback' as const,
      };
    });

    return {
      questions: validatedQuestions as Question[],
      avoidRepeatCheck: '基线问题（新规则）',
    };
  }

  /**
   * 格式化历史问题
   */
  private formatHistoryQuestions(questions: string[]): string {
    if (!questions || questions.length === 0) {
      return '（暂无历史问题记录）';
    }
    return questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  }

  /**
   * 格式化前一天评分（5 维度）
   */
  private formatPreviousDayScores(
    previousAnswers?: PreviousDayAnswer[],
    structuredScores?: StructuredScores,
  ): string {
    if (structuredScores) {
      const scoreMap = {
        1: '很差',
        2: '差',
        3: '可以接受',
        4: '好',
        5: '很好',
      };

      return [
        `除臭感受：${scoreMap[structuredScores.odor as keyof typeof scoreMap]} (${structuredScores.odor}分)`,
        `扬尘感受：${scoreMap[structuredScores.dust as keyof typeof scoreMap]} (${structuredScores.dust}分)`,
        `结团体验：${scoreMap[structuredScores.clumping as keyof typeof scoreMap]} (${structuredScores.clumping}分)`,
        `猫咪接受度：${scoreMap[structuredScores.comfort as keyof typeof scoreMap]} (${structuredScores.comfort}分)`,
        `清理轻松度：${scoreMap[structuredScores.cleanup as keyof typeof scoreMap]} (${structuredScores.cleanup}分)`,
      ].join('\n');
    }

    if (!previousAnswers || previousAnswers.length === 0) {
      return '（暂无昨天评分数据）';
    }

    const scoreMap = {
      1: '很差',
      2: '差',
      3: '可以接受',
      4: '好',
      5: '很好',
    };

    return previousAnswers.map((a, i) => {
      const scoreText = scoreMap[a.score as keyof typeof scoreMap] || a.score;
      return `- 问题 ${i + 1}：${scoreText} (${a.score}分) - "${a.question}"`;
    }).join('\n');
  }

  /**
   * 使用 AI 进行模板改写（量表适配型）
   * 策略：先生成模板题，然后让 AI 改写，最后验证
   */
  private async generateQuestionsWithAI(config: {
    productName: string;
    globalDayIndex: number;
    cycleIndex: number;
    dayInCycle: number;
    lifecyclePhase: LifecyclePhase;
    materialState: MaterialState;
    logicBranch: LogicBranch;
    prevDayScores: string;
    historyText: string;
    structuredScores?: StructuredScores;
  }): Promise<Pick<DailyQuestionnaireResponse, 'questions' | 'avoidRepeatCheck'>> {
    const {
      globalDayIndex,
      cycleIndex,
      dayInCycle,
      structuredScores,
    } = config;

    // 1. 先生成模板题（Day1 固定 / Day2+ 递进）
    let templateQuestions: QuestionTemplate[];
    if (globalDayIndex === 1) {
      templateQuestions = QuestionTemplateManager.getDay1BaselineQuestions();
    } else {
      // Day2+ 需要前一天的评分
      if (!structuredScores) {
        console.warn('[DynamicQuestionnaireGenerator] No previous scores for Day2+, using fallback');
        return this.getProgressiveQuestionsFromAIContext(cycleIndex, dayInCycle, 'normal');
      }

      const previousScores: PreviousDayScores = {
        odor: structuredScores.odor,
        dust: structuredScores.dust,
        clumping: structuredScores.clumping,
        comfort: structuredScores.comfort,
        cleanup: structuredScores.cleanup,
      };

      templateQuestions = QuestionTemplateManager.getFollowUpQuestions(previousScores, globalDayIndex);
    }

    // 2. 使用 AI 改写模板题（高级改写，保持语义不变）
    const rewrittenQuestions = await this.rewriteQuestionsWithAI(templateQuestions);

    // 3. 验证改写后的问题
    const validQuestions: Question[] = [];
    const invalidQuestions: QuestionTemplate[] = [];

    for (let i = 0; i < rewrittenQuestions.length; i++) {
      const rewritten = rewrittenQuestions[i];
      const validation = QuestionTextValidator.validateSingle(rewritten.title);

      if (validation.valid) {
        validQuestions.push({
          id: rewritten.id,
          theme: rewritten.theme,
          title: rewritten.title,
          options: rewritten.options,
          followupRule: templateQuestions[i].title, // 记录原始模板
          validation,
          source: 'model' as const,
        });
      } else {
        console.warn(`[DynamicQuestionnaireGenerator] Question ${rewritten.id} validation failed:`, validation.errors);
        invalidQuestions.push(templateQuestions[i]);
      }
    }

    // 4. 如果有无效问题，用模板题兜底
    if (invalidQuestions.length > 0) {
      invalidQuestions.forEach(template => {
        const validation = QuestionTextValidator.validateSingle(template.title);
        validQuestions.push({
          id: template.id,
          theme: template.theme,
          title: template.title,
          options: template.options,
          followupRule: template.title,
          validation,
          source: 'fallback' as const,
        });
      });
    }

    return {
      questions: validQuestions,
      avoidRepeatCheck: invalidQuestions.length > 0 ? 'AI 验证失败，使用模板题兜底' : 'AI 改写成功',
    };
  }

  /**
   * 使用 AI 改写问题（带重试机制）
   */
  private async rewriteQuestionsWithAI(
    templateQuestions: QuestionTemplate[],
  ): Promise<QuestionTemplate[]> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.callAIRewriter(templateQuestions);
        return result;
      } catch (error) {
        console.error(`[DynamicQuestionnaireGenerator] AI rewrite attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          console.warn('[DynamicQuestionnaireGenerator] All AI rewrite attempts failed, using templates');
          return templateQuestions;
        }
      }
    }

    return templateQuestions;
  }

  /**
   * 调用 AI 改写器
   */
  private async callAIRewriter(templateQuestions: QuestionTemplate[]): Promise<QuestionTemplate[]> {
    const templateText = templateQuestions.map(q => {
      return `ID: ${q.id}, Theme: ${q.theme}, Original: "${q.title}"`;
    }).join('\n');

    const systemPrompt = `你是一个量表适配型问题改写引擎。

你的任务：对输入的"模板问题"进行"高级改写"，改写后必须：
1. 保持语义不变（评价对象+评价标准不变）
2. 适配 1-5 评分量表（很差/差/可以接受/好/很好）
3. 禁止任何语气词、闲聊词、泛问
4. 必须是可评分陈述（评价对象+标准）
5. 不得出现禁词：体验/感觉/感受/整体/如何/怎么样/到底/啊/呢/你觉得/是不是很
6. 禁止一句问两个以上点（且/并且/同时/或者 最多出现 1 次）
7. 字数 12-28（中文+数字计入）
8. 每题必须含可评分锚点词之一：是否/频率/一致性/程度/明显/持续/易于/不易/更少/更快/更稳

输出格式：纯 JSON，无任何前缀后缀
{
  "questions": [
    {
      "id": "原ID",
      "theme": "原theme",
      "title": "改写后的标题"
    }
  ]
}`;

    const userPrompt = `请改写以下模板问题（保持语义，适配 1-5 量表）：

${templateText}

**注意**：仅改写 title 字段，id/theme/options 保持不变。`;

    const configLLM = new Config();
    const client = new LLMClient(configLLM);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.5,
    });

    const responseText = response.content?.trim() || '';

    console.log('[DynamicQuestionnaireGenerator] AI Rewrite Response:', responseText);

    // 解析 JSON
    let rewriteResponse: { questions: Array<{ id: string; theme: string; title: string }> };
    try {
      const cleanedText = this.cleanJSON(responseText);
      console.log('[DynamicQuestionnaireGenerator] Cleaned JSON:', cleanedText);
      rewriteResponse = JSON.parse(cleanedText);
    } catch (error) {
      console.error('[DynamicQuestionnaireGenerator] Failed to parse AI rewrite response:', error);
      throw new Error('Parse failed');
    }

    // 验证响应格式
    if (!rewriteResponse.questions || !Array.isArray(rewriteResponse.questions) || rewriteResponse.questions.length !== templateQuestions.length) {
      console.error('[DynamicQuestionnaireGenerator] Invalid rewrite response format');
      throw new Error('Invalid format');
    }

    // 合并改写后的标题与原始模板
    const rewrittenQuestions: QuestionTemplate[] = rewriteResponse.questions.map((rw, index) => {
      const original = templateQuestions[index];
      return {
        id: original.id,
        theme: original.theme,
        title: rw.title || original.title, // 如果改写失败，使用原标题
        options: original.options,
      };
    });

    return rewrittenQuestions;
  }

  /**
   * 清理 JSON 字符串
   */
  private cleanJSON(text: string): string {
    // 移除 markdown 代码块标记
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // 找到 JSON 对象的开始和结束
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned.trim();
  }

  /**
   * 验证问题标题
   */
  private validateTitle(title: string): string {
    if (!title || typeof title !== 'string') {
      return '今天的使用体验怎么样';
    }

    // 移除序号
    let cleaned = title.replace(/^\d+[\.\、]\s*/, '');

    // 移除 Markdown
    cleaned = cleaned.replace(/[#*_`~\[\]]/g, '');

    // 移除换行
    cleaned = cleaned.replace(/\n+/g, '');

    // 检查长度
    if (cleaned.length < 12) {
      cleaned += '你觉得怎么样';
    }
    if (cleaned.length > 28) {
      cleaned = cleaned.substring(0, 28);
    }

    return cleaned.trim();
  }

  /**
   * 验证选项
   */
  private validateOptions(options: any): string[] {
    const defaultOptions = ['很差', '差', '可以接受', '好', '很好'];

    if (!Array.isArray(options)) {
      return defaultOptions;
    }

    // 如果选项数量不对或内容不对，使用默认选项
    if (options.length !== 5) {
      return defaultOptions;
    }

    // 简单验证选项内容
    const requiredOptions = defaultOptions;
    const isValid = requiredOptions.every(opt => options.includes(opt));

    if (!isValid) {
      return defaultOptions;
    }

    return options;
  }

  /**
   * 获取基于评分的递进问题（Day 2+ 本地模板兜底）
   */
  private getProgressiveQuestions(
    cycleIndex: number,
    dayInCycle: number,
    lifecyclePhase: LifecyclePhase,
    materialState: MaterialState,
    logicBranch: LogicBranch,
    prevDayScores?: StructuredScores,
  ): Pick<DailyQuestionnaireResponse, 'questions' | 'avoidRepeatCheck'> {
    let questions: any[];

    if (prevDayScores) {
      // 使用 QuestionTemplateManager 的 getFollowUpQuestions 方法
      // 需要转换 StructuredScores 为 PreviousDayScores 格式
      const previousScores: PreviousDayScores = {
        odor: prevDayScores.odor,
        dust: prevDayScores.dust,
        clumping: prevDayScores.clumping,
        comfort: prevDayScores.comfort,
        cleanup: prevDayScores.cleanup,
      };

      const globalDayIndex = (cycleIndex - 1) * 7 + dayInCycle;
      questions = QuestionTemplateManager.getFollowUpQuestions(previousScores, globalDayIndex);
    } else {
      // 没有上一天评分数据，使用默认问题
      questions = this.getDefaultQuestionsForContext(cycleIndex, dayInCycle, logicBranch);
    }

    // 验证每个问题
    const validatedQuestions = questions.map((q) => {
      const validation = QuestionTextValidator.validateSingle(q.title);
      return {
        ...q,
        validation,
        source: 'fallback' as const,
      };
    });

    return {
      questions: validatedQuestions as Question[],
      avoidRepeatCheck: '本地模板（基于评分递进）',
    };
  }

  /**
   * 获取默认问题（用于没有评分数据的情况）
   */
  private getDefaultQuestionsForContext(
    cycleIndex: number,
    dayInCycle: number,
    logicBranch: LogicBranch,
  ): QuestionTemplate[] {
    const baseQuestions = [
      {
        id: `C${cycleIndex}D${dayInCycle}Q1`,
        theme: 'odor_control',
        title: '今天整体除臭情况到底怎么样',
        options: ['很差', '差', '可以接受', '好', '很好'],
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q2`,
        theme: 'clumping',
        title: '今天结团效果情况怎么样呢',
        options: ['很差', '差', '可以接受', '好', '很好'],
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q3`,
        theme: 'cleanup',
        title: '今天清理起来是不是很费劲',
        options: ['很差', '差', '可以接受', '好', '很好'],
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q4`,
        theme: 'dust_level',
        title: '今天猫砂灰尘控制效果怎么样好不好',
        options: ['很差', '差', '可以接受', '好', '很好'],
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q5`,
        theme: 'comfort',
        title: '猫咪今天用着感觉怎么样',
        options: ['很差', '差', '可以接受', '好', '很好'],
      },
    ];

    if (logicBranch === 'endgame') {
      baseQuestions[0].title = '这两天除臭效果有没有变差';
      baseQuestions[1].title = '对比前几天结团效果怎么样';
      baseQuestions[2].title = '现在用起来是不是比以前费力';
      baseQuestions[4].title = '猫咪最近用着还适应吗';
    }

    if (logicBranch === 'retrospective') {
      baseQuestions[0].title = '21 天里除臭效果整体怎么样';
      baseQuestions[1].title = '结团效果这一周保持得如何';
      baseQuestions[2].title = '现在清理还像刚开始那样轻松吗';
      baseQuestions[3].title = '扬尘问题这段时间表现如何';
      baseQuestions[4].title = '猫咪这 21 天整体适应得怎么样';
    }

    return baseQuestions;
  }

  /**
   * 从 AI 上下文推断参数并获取递进问题（用于 AI 失败时的降级）
   */
  private getProgressiveQuestionsFromAIContext(
    cycleIndex: number,
    dayInCycle: number,
    logicBranch: LogicBranch,
  ): Pick<DailyQuestionnaireResponse, 'questions' | 'avoidRepeatCheck'> {
    // 推断参数
    const lifecyclePhase: LifecyclePhase = cycleIndex === 1 ? 'early' : cycleIndex === 2 ? 'mid' : 'late';
    const materialState: MaterialState = cycleIndex === 1 ? 'normal' : cycleIndex === 2 ? 'nearing_end' : 'ended';

    return this.getProgressiveQuestions(
      cycleIndex,
      dayInCycle,
      lifecyclePhase,
      materialState,
      logicBranch,
      undefined, // 没有上一天评分数据
    );
  }

  /**
   * 获取默认降级问题（根据逻辑分支）
   */
  private getDefaultFallbackQuestions(globalDayIndex: number, cycleIndex: number, dayInCycle: number, logicBranch: LogicBranch): Pick<DailyQuestionnaireResponse, 'questions' | 'avoidRepeatCheck'> {
    const baseQuestions = [
      {
        id: `C${cycleIndex}D${dayInCycle}Q1`,
        theme: 'odor_control',
        title: '今天整体除臭情况到底怎么样',
        options: ['很差', '差', '可以接受', '好', '很好'],
        followupRule: '默认问题',
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q2`,
        theme: 'clumping',
        title: '今天结团效果情况怎么样呢',
        options: ['很差', '差', '可以接受', '好', '很好'],
        followupRule: '默认问题',
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q3`,
        theme: 'cleanup',
        title: '今天清理起来是不是很费劲',
        options: ['很差', '差', '可以接受', '好', '很好'],
        followupRule: '默认问题',
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q4`,
        theme: 'dust_level',
        title: '今天猫砂灰尘控制效果怎么样好不好',
        options: ['很差', '差', '可以接受', '好', '很好'],
        followupRule: '默认问题',
      },
      {
        id: `C${cycleIndex}D${dayInCycle}Q5`,
        theme: 'comfort',
        title: '猫咪今天用着感觉怎么样',
        options: ['很差', '差', '可以接受', '好', '很好'],
        followupRule: '默认问题',
      },
    ];

    if (logicBranch === 'endgame') {
      baseQuestions[0].title = '这两天除臭效果有没有变差';
      baseQuestions[1].title = '对比前几天结团效果怎么样';
      baseQuestions[2].title = '现在用起来是不是比以前费力';
      baseQuestions[4].title = '猫咪最近用着还适应吗';
    }

    if (logicBranch === 'retrospective') {
      baseQuestions[0].title = '21 天里除臭效果整体怎么样';
      baseQuestions[1].title = '结团效果这一周保持得如何';
      baseQuestions[2].title = '现在清理还像刚开始那样轻松吗';
      baseQuestions[3].title = '扬尘问题这段时间表现如何';
      baseQuestions[4].title = '猫咪这 21 天整体适应得怎么样';
    }

    return {
      questions: baseQuestions,
      avoidRepeatCheck: '使用默认问题',
    };
  }
}

export const dynamicQuestionnaireGenerator = new DynamicQuestionnaireGenerator();
