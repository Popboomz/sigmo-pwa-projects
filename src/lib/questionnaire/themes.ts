export const CANONICAL_THEME_ORDER = [
  'odor',
  'dust',
  'clumping',
  'cleanup',
  'comfort',
] as const;

export type CanonicalTheme = (typeof CANONICAL_THEME_ORDER)[number];

export interface StructuredScores {
  odor: number;
  dust: number;
  clumping: number;
  cleanup: number;
  comfort: number;
}

export const QUESTION_OPTIONS = ['很差', '较差', '可以接受', '较好', '很好'];

const THEME_ALIASES: Record<string, CanonicalTheme> = {
  odor: 'odor',
  odor_control: 'odor',
  dust: 'dust',
  dust_level: 'dust',
  tracking: 'dust',
  clumping: 'clumping',
  urine_absorb: 'clumping',
  appearance: 'clumping',
  cleanup: 'cleanup',
  comfort: 'comfort',
};

const THEME_DISPLAY_NAMES: Record<CanonicalTheme, string> = {
  odor: '除臭',
  dust: '扬尘',
  clumping: '结团',
  cleanup: '清理',
  comfort: '猫咪接受度',
};

export function isCanonicalTheme(value: string): value is CanonicalTheme {
  return CANONICAL_THEME_ORDER.includes(value as CanonicalTheme);
}

export function normalizeTheme(theme?: string | null): CanonicalTheme | undefined {
  if (!theme) {
    return undefined;
  }

  return THEME_ALIASES[theme.trim().toLowerCase()];
}

export function getThemeDisplayName(theme: CanonicalTheme): string {
  return THEME_DISPLAY_NAMES[theme];
}

export function createStructuredScores(defaultScore = 3): StructuredScores {
  return {
    odor: defaultScore,
    dust: defaultScore,
    clumping: defaultScore,
    cleanup: defaultScore,
    comfort: defaultScore,
  };
}

export function calculateStructuredScoresFromAnswers(
  answers: Array<{ score: number; theme?: string | null }>,
  defaultScore = 3,
): StructuredScores {
  const scores = createStructuredScores(defaultScore);

  answers.forEach((answer, index) => {
    const normalizedTheme = normalizeTheme(answer.theme);

    if (normalizedTheme) {
      scores[normalizedTheme] = answer.score;
      return;
    }

    const fallbackTheme = CANONICAL_THEME_ORDER[index];
    if (fallbackTheme) {
      scores[fallbackTheme] = answer.score;
    }
  });

  return scores;
}

export function normalizeQuestionsTheme<T extends { theme?: string | null }>(
  questions: T[],
): Array<Omit<T, 'theme'> & { theme?: CanonicalTheme }> {
  return questions.map((question) => ({
    ...question,
    theme: normalizeTheme(question.theme),
  }));
}
