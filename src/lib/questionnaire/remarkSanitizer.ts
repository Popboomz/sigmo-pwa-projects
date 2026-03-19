import type { CanonicalTheme } from './themes';

const PROFANITY_PATTERNS = [
  /\b(?:sb|jb|tmd|nmsl|mlgb|nm)\b/gi,
  /傻[逼比币B]/g,
  /煞笔/g,
  /脑残/g,
  /垃圾/g,
  /他妈的?/g,
  /妈的/g,
  /操/g,
  /滚蛋/g,
];

const META_COMPLAINT_PATTERNS = [/q\d+/i, /题目/, /问题/, /啥意思/, /看不懂/, /不会答/];

const THEME_KEYWORDS: Record<CanonicalTheme, string[]> = {
  odor: ['异味', '味道', '除臭', '臭味', '臭'],
  dust: ['扬尘', '粉尘', '灰尘', '飞灰', '灰'],
  clumping: ['结团', '成团', '散团', '团块', '尿团'],
  cleanup: ['清理', '粘底', '铲', '盆底', '不好清'],
  comfort: ['猫咪', '接受', '抗拒', '不愿用', '愿意用', '使用频率'],
};

export interface SanitizedRemark {
  original: string;
  cleaned: string;
  relevantText: string | null;
  themes: CanonicalTheme[];
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function removeProfanity(text: string): string {
  return PROFANITY_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ' '),
    text,
  );
}

function detectThemes(text: string): CanonicalTheme[] {
  const matches = new Set<CanonicalTheme>();

  Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
    if (keywords.some((keyword) => text.includes(keyword))) {
      matches.add(theme as CanonicalTheme);
    }
  });

  return [...matches];
}

export function sanitizeRemarkForAnalysis(
  remark?: string | null,
): SanitizedRemark | null {
  if (!remark) {
    return null;
  }

  const original = normalizeWhitespace(remark);
  if (!original) {
    return null;
  }

  let cleaned = normalizeWhitespace(removeProfanity(original));
  cleaned = cleaned.replace(/[!！?？~]+/g, ' ');
  cleaned = cleaned.replace(/[，。；、]+/g, '，');
  cleaned = normalizeWhitespace(cleaned);

  if (!cleaned || cleaned.length < 2) {
    return null;
  }

  const themes = detectThemes(cleaned);
  const isMetaComplaint = META_COMPLAINT_PATTERNS.some((pattern) => pattern.test(cleaned));

  if (themes.length === 0 || (isMetaComplaint && themes.length === 0)) {
    return {
      original,
      cleaned,
      relevantText: null,
      themes: [],
    };
  }

  const segments = cleaned
    .split(/[，]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => detectThemes(segment).length > 0);

  const relevantText = normalizeWhitespace(segments.join('，')).slice(0, 120) || null;

  return {
    original,
    cleaned,
    relevantText,
    themes,
  };
}

export function collectRelevantRemarkSignals(
  remarks: Array<string | null | undefined>,
): string[] {
  return remarks
    .map((remark) => sanitizeRemarkForAnalysis(remark))
    .filter((item): item is SanitizedRemark => Boolean(item?.relevantText))
    .map((item) => item.relevantText as string);
}
