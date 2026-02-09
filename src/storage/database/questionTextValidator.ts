/**
 * 问题文本验证器
 *
 * 功能：
 * 1. 禁词检测：检测是否包含禁止使用的词汇
 * 2. 句式重复检测：检测同一问卷内问题是否过于相似
 * 3. 可评分检测：检测是否包含可评分锚点词
 * 4. 长度检测：检测问题长度是否在 12-28 字范围内
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100，越高越好
}

export interface QuestionWithValidation {
  id: string;
  theme: string;
  title: string;
  validation?: ValidationResult;
  source?: 'model' | 'fallback';
}

export class QuestionTextValidator {
  // 禁用词列表
  private static readonly FORBIDDEN_WORDS = [
    '体验', '感觉', '感受', '整体', '如何', '怎么样', '到底', '啊', '呢',
    '是不是很', '是不是真的', '你觉得', '您觉得', '您觉得呢',
  ];

  // 逻辑连接词（禁止一句问两个以上点）
  private static readonly LOGIC_CONNECTORS = [
    '且', '并且', '同时', '或者', '以及', '加之',
  ];

  // 可评分锚点词（必须包含至少一个）
  private static readonly SCORABLE_ANCHORS = [
    '是否', '频率', '一致性', '程度', '明显', '持续', '易于', '不易',
    '更少', '更快', '更稳', '易用', '稳定', '波动',
  ];

  /**
   * 验证单个问题文本
   */
  static validateSingle(question: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // 1. 长度检测
    const length = question.length;
    if (length < 12) {
      errors.push(`问题过短（${length}字），要求 12-28 字`);
      score -= 30;
    } else if (length > 28) {
      errors.push(`问题过长（${length}字），要求 12-28 字`);
      score -= 30;
    }

    // 2. 禁词检测
    const forbiddenWords = this.findForbiddenWords(question);
    if (forbiddenWords.length > 0) {
      errors.push(`包含禁用词：${forbiddenWords.join(', ')}`);
      score -= 20 * forbiddenWords.length;
    }

    // 3. 可评分锚点词检测
    const hasScorableAnchor = this.hasScorableAnchor(question);
    if (!hasScorableAnchor) {
      errors.push('缺少可评分锚点词（是否/程度/频率/一致性/易用/明显/持续等）');
      score -= 40;
    }

    // 4. 检测逻辑连接词（禁止一句问两个以上点）
    const connectorCount = this.countLogicConnectors(question);
    if (connectorCount > 1) {
      errors.push(`包含过多的逻辑连接词（${connectorCount}个），禁止一句问两个以上点`);
      score -= 20;
    }

    // 5. 句式检测（必须包含评价对象+评价标准）
    if (!this.hasEvaluationStructure(question)) {
      warnings.push('可能缺少明确的评价对象或评价标准');
      score -= 10;
    }

    // 6. 检测是否为泛问/开放题
    if (this.isTooOpenEnded(question)) {
      errors.push('问题过于开放，不适用于 1-5 评分');
      score -= 30;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * 验证整份问卷（检测重复句式）
   */
  static validateQuestionnaire(questions: QuestionWithValidation[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    results: ValidationResult[];
  } {
    const results: ValidationResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证每个问题
    for (const question of questions) {
      const result = this.validateSingle(question.title);
      results.push(result);

      if (!result.valid) {
        errors.push(`问题 ${question.id}: ${result.errors.join(', ')}`);
      }

      if (result.warnings.length > 0) {
        warnings.push(`问题 ${question.id}: ${result.warnings.join(', ')}`);
      }
    }

    // 检测句式重复
    const similarities = this.checkSimilarities(questions);
    if (similarities.length > 0) {
      similarities.forEach(({ q1, q2, similarity }) => {
        errors.push(`问题 ${q1} 与 ${q2} 相似度过高（${(similarity * 100).toFixed(1)}%）`);
      });
    }

    // 检查主题重复
    const themeCounts = new Map<string, number>();
    questions.forEach((q) => {
      const count = themeCounts.get(q.theme) || 0;
      themeCounts.set(q.theme, count + 1);
    });

    themeCounts.forEach((count, theme) => {
      if (count > 1) {
        errors.push(`主题 ${theme} 重复 ${count} 次`);
      }
    });

    return {
      valid: errors.length === 0 && similarities.length === 0,
      errors,
      warnings,
      results,
    };
  }

  /**
   * 查找禁用词
   */
  private static findForbiddenWords(text: string): string[] {
    const found: string[] = [];
    for (const word of this.FORBIDDEN_WORDS) {
      if (text.includes(word)) {
        found.push(word);
      }
    }
    return found;
  }

  /**
   * 统计逻辑连接词数量
   */
  private static countLogicConnectors(text: string): number {
    let count = 0;
    for (const connector of this.LOGIC_CONNECTORS) {
      if (text.includes(connector)) {
        count += text.split(connector).length - 1;
      }
    }
    return count;
  }

  /**
   * 检测是否包含可评分锚点词
   */
  private static hasScorableAnchor(text: string): boolean {
    return this.SCORABLE_ANCHORS.some((anchor) => text.includes(anchor));
  }

  /**
   * 检测是否具有评价结构（对象+标准）
   */
  private static hasEvaluationStructure(text: string): boolean {
    // 检查是否包含"是否/程度/频率/一致性"等结构
    if (!this.hasScorableAnchor(text)) {
      return false;
    }

    // 检查是否有明确的评价对象（如：异味/结团/清理/使用）
    const objects = ['异味', '扬尘', '灰尘', '结团', '清理', '使用', '猫咪', '除臭'];
    const hasObject = objects.some((obj) => text.includes(obj));

    // 检查是否有明确的评价标准（如：快速/紧实/易铲/明显/持续）
    const criteria = ['快速', '紧实', '易', '明显', '持续', '稳定', '一致', '自然'];
    const hasCriteria = criteria.some((crit) => text.includes(crit));

    return hasObject || hasCriteria;
  }

  /**
   * 检测是否过于开放
   */
  private static isTooOpenEnded(text: string): boolean {
    const openEndedPatterns = [
      /怎么样$/i,
      /如何$/i,
      /觉得.*怎么样/i,
      /感觉如何/i,
      /体验/i,
      /感受/i,
    ];

    return openEndedPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * 检测相似度（Jaccard 相似度）
   */
  private static checkSimilarities(
    questions: QuestionWithValidation[],
  ): Array<{ q1: string; q2: string; similarity: number }> {
    const similarities: Array<{ q1: string; q2: string; similarity: number }> = [];

    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const similarity = this.calculateSimilarity(questions[i].title, questions[j].title);

        // 相似度阈值：60% 认为过于相似
        if (similarity > 0.6) {
          similarities.push({
            q1: questions[i].id,
            q2: questions[j].id,
            similarity,
          });
        }
      }
    }

    return similarities;
  }

  /**
   * 计算 Jaccard 相似度
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const set1 = new Set(text1.split(''));
    const set2 = new Set(text2.split(''));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 自动重试逻辑
   */
  static async generateWithRetry<T>(
    generator: () => Promise<T>,
    validator: (result: T) => boolean,
    maxRetries = 3,
  ): Promise<{ success: boolean; result?: T; attempts: number; error?: any }> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await generator();
        if (validator(result)) {
          return { success: true, result, attempts: attempt };
        }
        lastError = new Error('Validation failed');
      } catch (error) {
        lastError = error;
      }
    }

    return { success: false, attempts: maxRetries, error: lastError };
  }
}
