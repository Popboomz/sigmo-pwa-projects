import {
  CANONICAL_THEME_ORDER,
  getThemeDisplayName,
  type CanonicalTheme,
} from '@/lib/questionnaire/themes';

export type TrendStatus =
  | 'worsening'
  | 'improving'
  | 'stable_good'
  | 'fluctuating'
  | 'accepted';

export type FocusAngle =
  | 'severity'
  | 'frequency'
  | 'spread'
  | 'stability'
  | 'durability'
  | 'scenario'
  | 'impact';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface QuestionTemplate {
  id: string;
  theme: CanonicalTheme;
  title: string;
  options: string[];
}

export interface PreviousDayScores {
  odor: number;
  dust: number;
  clumping: number;
  comfort: number;
  cleanup: number;
}

const DAY1_BASELINE_TEMPLATES: Record<CanonicalTheme, string> = {
  odor: '排泄后异味快速压下的明显程度',
  dust: '倒砂或铲砂时可见扬尘程度',
  clumping: '结团紧实成型且不易散开的程度',
  cleanup: '清理时容易铲起且不粘底的程度',
  comfort: '猫咪使用自然且无明显抗拒的程度',
};

const BASELINE_OPTIONS: Record<CanonicalTheme, string[]> = {
  odor: ['完全压不住', '压味较弱', '基本可接受', '压味较快', '压味很快'],
  dust: ['扬尘很多', '扬尘较多', '可以接受', '扬尘较少', '几乎无尘'],
  clumping: ['很松散', '较松散', '一般', '较紧实', '很紧实'],
  cleanup: ['很难清理', '较难清理', '一般', '较易清理', '非常易清理'],
  comfort: ['明显抗拒', '较抗拒', '一般', '较愿意用', '非常自然'],
};

const FOLLOW_UP_TEMPLATES: Record<
  CanonicalTheme,
  Record<TrendStatus, Partial<Record<FocusAngle, string[]>>>
> = {
  odor: {
    worsening: {
      severity: ['异味问题比前几天更明显的程度'],
      frequency: ['异味问题在近几天反复出现的频率'],
      spread: ['异味扩散到猫砂盆外的程度'],
    },
    improving: {
      stability: ['除臭改善效果持续稳定的程度'],
      durability: ['异味控制比前几天更能保持的程度'],
    },
    stable_good: {
      stability: ['连续使用后除臭表现保持稳定的程度'],
      durability: ['高使用量下除臭效果仍然稳定的程度'],
    },
    fluctuating: {
      scenario: ['异味控制受尿量变化影响的程度'],
      stability: ['异味表现随时段波动的程度'],
    },
    accepted: {
      impact: ['轻微异味对继续使用影响的程度'],
      scenario: ['异味问题对日常接受度影响的程度'],
    },
  },
  dust: {
    worsening: {
      severity: ['扬尘问题比前几天更明显的程度'],
      frequency: ['铲砂时扬尘反复出现的频率'],
      spread: ['粉尘扩散到盆外范围变大的程度'],
    },
    improving: {
      stability: ['扬尘改善效果持续稳定的程度'],
      durability: ['灰尘控制比前几天更能保持的程度'],
    },
    stable_good: {
      stability: ['连续使用后灰尘控制保持稳定的程度'],
      durability: ['满盆状态下扬尘控制仍然稳定的程度'],
    },
    fluctuating: {
      scenario: ['扬尘表现受铲砂动作影响的程度'],
      stability: ['灰尘控制在不同时段波动的程度'],
    },
    accepted: {
      impact: ['轻微扬尘对继续使用影响的程度'],
      scenario: ['扬尘问题对日常接受度影响的程度'],
    },
  },
  clumping: {
    worsening: {
      severity: ['结团松散问题比前几天更明显的程度'],
      frequency: ['散团问题在近几天反复出现的频率'],
      scenario: ['高尿量时结团变差的程度'],
    },
    improving: {
      stability: ['结团改善效果持续稳定的程度'],
      durability: ['结团紧实度比前几天更能保持的程度'],
    },
    stable_good: {
      stability: ['连续使用后结团表现保持稳定的程度'],
      durability: ['高使用量下结团强度仍然稳定的程度'],
    },
    fluctuating: {
      scenario: ['结团表现受尿量变化影响的程度'],
      stability: ['结团强度在不同天数波动的程度'],
    },
    accepted: {
      impact: ['轻微散团对继续使用影响的程度'],
      scenario: ['结团问题对日常接受度影响的程度'],
    },
  },
  cleanup: {
    worsening: {
      severity: ['清理变费力的问题更明显的程度'],
      frequency: ['粘底问题在近几天反复出现的频率'],
      scenario: ['铲起困难随使用时间加重的程度'],
    },
    improving: {
      stability: ['清理改善效果持续稳定的程度'],
      durability: ['清理便利性比前几天更能保持的程度'],
    },
    stable_good: {
      stability: ['连续使用后清理便利性保持稳定的程度'],
      durability: ['满盆状态下仍然容易清理的程度'],
    },
    fluctuating: {
      scenario: ['清理难度受盆底状态影响的程度'],
      stability: ['清理便利性在不同天数波动的程度'],
    },
    accepted: {
      impact: ['轻微粘底对继续使用影响的程度'],
      scenario: ['清理问题对日常接受度影响的程度'],
    },
  },
  comfort: {
    worsening: {
      severity: ['猫咪抗拒情况比前几天更明显的程度'],
      frequency: ['猫咪犹豫使用在近几天出现的频率'],
      scenario: ['环境变化时猫咪抗拒加重的程度'],
    },
    improving: {
      stability: ['猫咪接受度改善后保持稳定的程度'],
      durability: ['猫咪自然使用比前几天更能保持的程度'],
    },
    stable_good: {
      stability: ['连续使用后猫咪自然使用保持稳定的程度'],
      durability: ['不同时间段猫咪仍愿意使用的程度'],
    },
    fluctuating: {
      scenario: ['猫咪接受度受环境变化影响的程度'],
      stability: ['猫咪使用意愿在不同天数波动的程度'],
    },
    accepted: {
      impact: ['轻微犹豫对继续使用影响的程度'],
      scenario: ['猫咪适应问题对日常接受度影响的程度'],
    },
  },
};

const FALLBACK_FOCUS_BY_TREND: Record<TrendStatus, FocusAngle[]> = {
  worsening: ['severity', 'frequency', 'spread', 'scenario'],
  improving: ['stability', 'durability'],
  stable_good: ['stability', 'durability'],
  fluctuating: ['scenario', 'stability'],
  accepted: ['impact', 'scenario'],
};

export class QuestionTemplateManager {
  static getDay1BaselineQuestions(): QuestionTemplate[] {
    return CANONICAL_THEME_ORDER.map((theme) => ({
      id: `D1-${theme}`,
      theme,
      title: DAY1_BASELINE_TEMPLATES[theme],
      options: [...BASELINE_OPTIONS[theme]],
    }));
  }

  static buildFollowUpQuestion(input: {
    theme: CanonicalTheme;
    trendStatus: TrendStatus;
    focusAngle?: FocusAngle;
    dayIndex: number;
  }): QuestionTemplate {
    const { theme, trendStatus, focusAngle, dayIndex } = input;
    const themeTemplates = FOLLOW_UP_TEMPLATES[theme][trendStatus];
    const focusCandidates = [
      focusAngle,
      ...FALLBACK_FOCUS_BY_TREND[trendStatus],
    ].filter(Boolean) as FocusAngle[];

    let selectedTitles: string[] | undefined;
    for (const candidate of focusCandidates) {
      const titles = themeTemplates[candidate];
      if (titles && titles.length > 0) {
        selectedTitles = titles;
        break;
      }
    }

    if (!selectedTitles || selectedTitles.length === 0) {
      selectedTitles = [
        `${getThemeDisplayName(theme)}表现较前几天变化明显的程度`,
      ];
    }

    const variantIndex = Math.max(0, (dayIndex - 2) % selectedTitles.length);

    return {
      id: `D${dayIndex}-${theme}`,
      theme,
      title: selectedTitles[variantIndex],
      options: [...this.buildOptions(theme, trendStatus, selectedTitles[variantIndex])],
    };
  }

  static getAllTemplates(): Record<string, QuestionTemplate[]> {
    const all: Record<string, QuestionTemplate[]> = {
      baseline: this.getDay1BaselineQuestions(),
    };

    CANONICAL_THEME_ORDER.forEach((theme) => {
      Object.entries(FOLLOW_UP_TEMPLATES[theme]).forEach(([trendStatus, focusMap]) => {
        const typedTrendStatus = trendStatus as TrendStatus;
        Object.entries(focusMap).forEach(([focusAngle, titles]) => {
          all[`${theme}-${typedTrendStatus}-${focusAngle}`] = (titles || []).map(
            (title, index) => ({
              id: `${theme}-${typedTrendStatus}-${focusAngle}-${index + 1}`,
              theme,
              title,
              options: [...this.buildOptions(theme, typedTrendStatus, title)],
            }),
          );
        });
      });
    });

    return all;
  }

  private static buildOptions(
    theme: CanonicalTheme,
    trendStatus: TrendStatus,
    title: string,
  ): string[] {
    if (trendStatus === 'worsening') {
      if (/(频率|反复出现)/.test(title)) {
        return ['几乎每天都更糟', '多数时候更糟', '和前几天差不多', '出现次数变少', '明显减少'];
      }

      if (theme === 'odor' || theme === 'dust') {
        return ['明显加重', '略有加重', '基本持平', '有所改善', '明显改善'];
      }

      return ['问题更明显', '略有加重', '差不多', '有所改善', '明显改善'];
    }

    if (trendStatus === 'improving') {
      return ['明显变差', '略有回落', '基本持平', '继续改善', '明显改善'];
    }

    if (trendStatus === 'stable_good') {
      return ['明显变差', '略有波动', '基本稳定', '较稳定', '非常稳定'];
    }

    if (trendStatus === 'fluctuating') {
      if (/(影响|受.+影响)/.test(title)) {
        return ['影响很大', '影响较大', '影响一般', '影响较小', '几乎不受影响'];
      }

      return ['波动很大', '波动较大', '偶有波动', '基本稳定', '非常稳定'];
    }

    if (trendStatus === 'accepted') {
      return ['影响很大', '影响较大', '影响一般', '影响较小', '几乎不影响'];
    }

    return ['很差', '较差', '可以接受', '较好', '很好'];
  }
}
