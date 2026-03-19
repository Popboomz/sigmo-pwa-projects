export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface QuestionWithValidation {
  id: string;
  theme: string;
  title: string;
  validation?: ValidationResult;
  source?: 'model' | 'fallback';
}

export class QuestionTextValidator {
  private static readonly MIN_LENGTH = 10;
  private static readonly MAX_LENGTH = 32;

  private static readonly FORBIDDEN_WORDS = [
    '体验',
    '感觉',
    '感受',
    '整体',
    '如何',
    '怎么样',
    '到底',
    '为啥',
    '为什么',
    '你觉得',
    '您觉得',
  ];

  private static readonly LOGIC_CONNECTORS = ['并且', '同时', '或者', '以及'];

  private static readonly SCORABLE_ANCHORS = [
    '程度',
    '频率',
    '明显',
    '持续',
    '稳定',
    '保持',
    '影响',
    '波动',
    '加重',
    '改善',
    '容易',
  ];

  private static readonly OBJECT_KEYWORDS = [
    '异味',
    '除臭',
    '扬尘',
    '灰尘',
    '粉尘',
    '结团',
    '散团',
    '清理',
    '粘底',
    '猫咪',
    '抗拒',
    '接受',
  ];

  static validateSingle(question: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;
    const normalized = question.trim();

    if (!normalized) {
      return {
        valid: false,
        errors: ['题目不能为空'],
        warnings,
        score: 0,
      };
    }

    if (normalized.length < this.MIN_LENGTH) {
      errors.push(`题目过短，需要至少 ${this.MIN_LENGTH} 个字`);
      score -= 30;
    }

    if (normalized.length > this.MAX_LENGTH) {
      errors.push(`题目过长，需要控制在 ${this.MAX_LENGTH} 个字以内`);
      score -= 30;
    }

    const forbiddenWords = this.findForbiddenWords(normalized);
    if (forbiddenWords.length > 0) {
      errors.push(`包含禁用词：${forbiddenWords.join('、')}`);
      score -= 20;
    }

    if (!this.hasScorableAnchor(normalized)) {
      errors.push('缺少可评分锚点词');
      score -= 30;
    }

    if (!this.hasEvaluationObject(normalized)) {
      errors.push('缺少明确评价对象');
      score -= 30;
    }

    const connectorCount = this.countLogicConnectors(normalized);
    if (connectorCount > 1) {
      errors.push('题目包含过多逻辑连接词');
      score -= 20;
    }

    if (this.isTooOpenEnded(normalized)) {
      errors.push('题目过于开放，不适合 1-5 评分');
      score -= 30;
    }

    if (this.hasMultipleEvaluationClauses(normalized)) {
      warnings.push('题目可能同时在问两个点');
      score -= 10;
    }

    if (/[？?]/.test(normalized)) {
      warnings.push('建议使用陈述式题干而不是问句');
      score -= 5;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  static validateQuestionnaire(questions: QuestionWithValidation[]) {
    const results = questions.map((question) => this.validateSingle(question.title));
    const errors: string[] = [];
    const warnings: string[] = [];

    results.forEach((result, index) => {
      if (!result.valid) {
        errors.push(`题目 ${questions[index].id}: ${result.errors.join('，')}`);
      }
      if (result.warnings.length > 0) {
        warnings.push(`题目 ${questions[index].id}: ${result.warnings.join('，')}`);
      }
    });

    const similarities = this.checkSimilarities(questions);
    similarities.forEach(({ q1, q2, similarity }) => {
      errors.push(`题目 ${q1} 与 ${q2} 过于相似（${(similarity * 100).toFixed(0)}%）`);
    });

    const themeCounts = new Map<string, number>();
    questions.forEach((question) => {
      themeCounts.set(question.theme, (themeCounts.get(question.theme) || 0) + 1);
    });

    themeCounts.forEach((count, theme) => {
      if (count > 1) {
        errors.push(`主题 ${theme} 在同一份问卷中重复出现 ${count} 次`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      results,
    };
  }

  static async generateWithRetry<T>(
    generator: () => Promise<T>,
    validator: (result: T) => boolean,
    maxRetries = 3,
  ): Promise<{ success: boolean; result?: T; attempts: number; error?: unknown }> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
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

    return {
      success: false,
      attempts: maxRetries,
      error: lastError,
    };
  }

  private static findForbiddenWords(text: string): string[] {
    return this.FORBIDDEN_WORDS.filter((word) => text.includes(word));
  }

  private static countLogicConnectors(text: string): number {
    return this.LOGIC_CONNECTORS.reduce((count, connector) => {
      return count + (text.split(connector).length - 1);
    }, 0);
  }

  private static hasScorableAnchor(text: string): boolean {
    return this.SCORABLE_ANCHORS.some((anchor) => text.includes(anchor));
  }

  private static hasEvaluationObject(text: string): boolean {
    return this.OBJECT_KEYWORDS.some((keyword) => text.includes(keyword));
  }

  private static isTooOpenEnded(text: string): boolean {
    return (
      /(如何|怎么样|为什么|为啥|怎么回事)/.test(text) ||
      /(感觉|感受|体验)/.test(text)
    );
  }

  private static hasMultipleEvaluationClauses(text: string): boolean {
    const clauseMarkers = ['且', '并且', '同时', '以及', '，'];
    return clauseMarkers.reduce((count, marker) => {
      return count + (text.includes(marker) ? 1 : 0);
    }, 0) > 1;
  }

  private static checkSimilarities(
    questions: QuestionWithValidation[],
  ): Array<{ q1: string; q2: string; similarity: number }> {
    const similarities: Array<{ q1: string; q2: string; similarity: number }> = [];

    for (let i = 0; i < questions.length; i += 1) {
      for (let j = i + 1; j < questions.length; j += 1) {
        const similarity = this.calculateSimilarity(
          questions[i].title,
          questions[j].title,
        );

        if (similarity > 0.72) {
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

  private static calculateSimilarity(text1: string, text2: string): number {
    const set1 = new Set(text1.split(''));
    const set2 = new Set(text2.split(''));
    const intersection = new Set([...set1].filter((item) => set2.has(item)));
    const union = new Set([...set1, ...set2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}
