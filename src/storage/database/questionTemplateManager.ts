/**
 * 问题模板管理器
 *
 * 功能：
 * 1. Day1 固定基线问题模板
 * 2. Day2+ 基于上一天评分的递进问题模板
 */

export interface QuestionTemplate {
  id: string;
  theme: string;
  title: string;
  scoreRange?: 'low' | 'medium' | 'high'; // 仅用于 Day2+ 递进题
  options: string[];
}

export interface PreviousDayScores {
  odor: number;
  dust: number;
  clumping: number;
  comfort: number;
  cleanup: number;
}

export class QuestionTemplateManager {
  /**
   * Day1 固定基线问题模板（专业可评分陈述）
   */
  private static readonly DAY1_BASELINE_TEMPLATES: QuestionTemplate[] = [
    {
      id: 'D1-odor',
      theme: 'odor',
      title: '排泄后异味快速压下的明显程度',
      options: ['很差', '差', '可以接受', '好', '很好'],
    },
    {
      id: 'D1-dust',
      theme: 'dust',
      title: '倒砂或铲砂时可见扬尘程度',
      options: ['很差', '差', '可以接受', '好', '很好'],
    },
    {
      id: 'D1-clumping',
      theme: 'clumping',
      title: '结团紧实成型且不易散开的程度',
      options: ['很差', '差', '可以接受', '好', '很好'],
    },
    {
      id: 'D1-cleanup',
      theme: 'cleanup',
      title: '清理时容易铲起且不粘底的程度',
      options: ['很差', '差', '可以接受', '好', '很好'],
    },
    {
      id: 'D1-comfort',
      theme: 'comfort',
      title: '猫咪使用自然且无明显抗拒的程度',
      options: ['很差', '差', '可以接受', '好', '很好'],
    },
  ];

  /**
   * Day2+ 递进问题模板库
   * 根据 theme 和 scoreRange 返回对应模板
   */
  private static readonly FOLLOW_UP_TEMPLATES: Record<
    string,
    Record<string, QuestionTemplate[]>
  > = {
    odor: {
      low: [
        {
          id: 'follow-odor-low-1',
          theme: 'odor',
          title: '异味问题集中在夜间或高尿量时的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-odor-low-2',
          theme: 'odor',
          title: '异味扩散范围局限于小区域的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      medium: [
        {
          id: 'follow-odor-medium-1',
          theme: 'odor',
          title: '不同时段除臭表现的一致性程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-odor-medium-2',
          theme: 'odor',
          title: '异味强度在可控范围内波动的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      high: [
        {
          id: 'follow-odor-high-1',
          theme: 'odor',
          title: '连续使用后除臭表现维持高水平的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-odor-high-2',
          theme: 'odor',
          title: '满负荷使用时异味控制稳定的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
    },
    dust: {
      low: [
        {
          id: 'follow-dust-low-1',
          theme: 'dust',
          title: '灰尘仅在剧烈搅拌时明显出现的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-dust-low-2',
          theme: 'dust',
          title: '扬尘问题随使用次数增加而加重的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      medium: [
        {
          id: 'follow-dust-medium-1',
          theme: 'dust',
          title: '灰尘控制效果在不同使用频率下一致的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-dust-medium-2',
          theme: 'dust',
          title: '可见灰尘在可接受范围内轻微波动的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      high: [
        {
          id: 'follow-dust-high-1',
          theme: 'dust',
          title: '连续使用后灰尘控制持续保持优异的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-dust-high-2',
          theme: 'dust',
          title: '满盆状态下灰尘控制依然出色的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
    },
    clumping: {
      low: [
        {
          id: 'follow-clumping-low-1',
          theme: 'clumping',
          title: '结团不紧实问题发生在高尿量时的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-clumping-low-2',
          theme: 'clumping',
          title: '散团频率随使用深度增加而上升的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      medium: [
        {
          id: 'follow-clumping-medium-1',
          theme: 'clumping',
          title: '结团紧实度在猫砂深度不同时一致的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-clumping-medium-2',
          theme: 'clumping',
          title: '结团易碎性在可控范围内波动的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      high: [
        {
          id: 'follow-clumping-high-1',
          theme: 'clumping',
          title: '连续使用后结团表现依然紧实易铲的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-clumping-high-2',
          theme: 'clumping',
          title: '高强度使用下结团保持稳定的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
    },
    cleanup: {
      low: [
        {
          id: 'follow-cleanup-low-1',
          theme: 'cleanup',
          title: '粘底问题主要集中在盆底区域的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-cleanup-low-2',
          theme: 'cleanup',
          title: '铲起困难随使用时间增加而加重的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      medium: [
        {
          id: 'follow-cleanup-medium-1',
          theme: 'cleanup',
          title: '清理便利性在不同时段保持一致的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-cleanup-medium-2',
          theme: 'cleanup',
          title: '粘底频率在可接受范围内偶尔出现的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      high: [
        {
          id: 'follow-cleanup-high-1',
          theme: 'cleanup',
          title: '连续使用后清理便利性持续保持的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-cleanup-high-2',
          theme: 'cleanup',
          title: '满负荷使用下依然容易清理的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
    },
    comfort: {
      low: [
        {
          id: 'follow-comfort-low-1',
          theme: 'comfort',
          title: '猫咪抗拒出现在更换环境后的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-comfort-low-2',
          theme: 'comfort',
          title: '使用频率下降与异味明显相关的程度',
          scoreRange: 'low',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      medium: [
        {
          id: 'follow-comfort-medium-1',
          theme: 'comfort',
          title: '猫咪使用态度在不同时段保持一致的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-comfort-medium-2',
          theme: 'comfort',
          title: '偶尔抗拒与猫砂状态变化明显相关的程度',
          scoreRange: 'medium',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
      high: [
        {
          id: 'follow-comfort-high-1',
          theme: 'comfort',
          title: '连续使用后猫咪自然使用持续保持的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
        {
          id: 'follow-comfort-high-2',
          theme: 'comfort',
          title: '在不同使用频率下猫咪依然自然使用的程度',
          scoreRange: 'high',
          options: ['很差', '差', '可以接受', '好', '很好'],
        },
      ],
    },
  };

  /**
   * 获取 Day1 基线问题
   */
  static getDay1BaselineQuestions(): QuestionTemplate[] {
    return JSON.parse(JSON.stringify(this.DAY1_BASELINE_TEMPLATES));
  }

  /**
   * 获取递进问题（Day2+）
   *
   * @param previousScores 前一天的 5 维度评分
   * @param dayIndex 当前天数（用于避免重复）
   */
  static getFollowUpQuestions(
    previousScores: PreviousDayScores,
    dayIndex: number,
  ): QuestionTemplate[] {
    const questions: QuestionTemplate[] = [];

    // 为每个维度选择一个递进问题
    const themes = ['odor', 'dust', 'clumping', 'cleanup', 'comfort'] as const;

    themes.forEach((theme) => {
      const score = previousScores[theme];
      let scoreRange: 'low' | 'medium' | 'high';

      // 根据评分选择问题难度
      if (score <= 2) {
        scoreRange = 'low';
      } else if (score >= 4) {
        scoreRange = 'high';
      } else {
        scoreRange = 'medium';
      }

      // 获取该维度对应难度的问题
      const templates = this.FOLLOW_UP_TEMPLATES[theme]?.[scoreRange] || [];

      if (templates.length > 0) {
        // 根据天数交替选择问题（避免重复）
        const questionIndex = (dayIndex - 2) % templates.length;
        const selectedTemplate = templates[questionIndex];

        questions.push({
          ...selectedTemplate,
          id: `${selectedTemplate.id}-D${dayIndex}`, // 添加天数后缀避免ID冲突
        });
      }
    });

    return questions;
  }

  /**
   * 获取所有可用的问题模板（用于调试）
   */
  static getAllTemplates(): Record<string, QuestionTemplate[]> {
    const result: Record<string, QuestionTemplate[]> = {
      day1: this.getDay1BaselineQuestions(),
    };

    Object.keys(this.FOLLOW_UP_TEMPLATES).forEach(theme => {
      Object.keys(this.FOLLOW_UP_TEMPLATES[theme]).forEach(range => {
        const key = `${theme}-${range}`;
        result[key] = JSON.parse(JSON.stringify(this.FOLLOW_UP_TEMPLATES[theme][range as keyof typeof this.FOLLOW_UP_TEMPLATES[typeof theme]]));
      });
    });

    return result;
  }
}
