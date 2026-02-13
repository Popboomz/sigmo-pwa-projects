import { generateTemplateQuestions } from "@/lib/questionnaire/engine";
import type { Question } from "@/lib/questionnaire/types";

const MAX_TEXT_LENGTH = 80;
const EXPECTED_QUESTION_COUNT = 5;
const EXPECTED_SCALE_VALUES = [1, 2, 3, 4, 5] as const;
const DEFAULT_OPTIONS = generateTemplateQuestions(1)[0]?.options ?? [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type IncomingQuestion = Partial<Question> & { text?: string; title?: string };

function normalizeText(input: IncomingQuestion): string {
  return (input.title ?? input.text ?? "").trim();
}

function hasEmoji(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text);
}

function hasMultipleQuestionSentences(text: string): boolean {
  const matches = text.match(/[?\uFF1F]/g);
  return (matches?.length ?? 0) > 1;
}

function looksYesNoQuestion(text: string): boolean {
  return /(^|\s)(yes|no)\b/i.test(text);
}

function looksVagueEmotionQuestion(text: string): boolean {
  return /how do you feel|feeling|feel/i.test(text);
}

function createStableId(index: number, text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `q_ai_${index + 1}_${slug || "item"}`;
}

function ensureValidOptions(question: IncomingQuestion): void {
  const options = question.options;
  if (!Array.isArray(options) || options.length !== EXPECTED_SCALE_VALUES.length) {
    throw new ValidationError("Each question must contain exactly 5 scale options.");
  }

  const values = options.map((item) => item.value);
  const valid =
    values.length === EXPECTED_SCALE_VALUES.length &&
    EXPECTED_SCALE_VALUES.every((expected, idx) => values[idx] === expected);
  if (!valid) {
    throw new ValidationError("Question scale must match 1-5 exactly.");
  }
}

export function validateAndNormalizeQuestions(rawQuestions: IncomingQuestion[]): Question[] {
  if (!Array.isArray(rawQuestions) || rawQuestions.length !== EXPECTED_QUESTION_COUNT) {
    throw new ValidationError("Exactly 5 questions are required.");
  }

  const seenTitles = new Set<string>();
  const normalized = rawQuestions.map((raw, index) => {
    const title = normalizeText(raw);
    if (!title) {
      throw new ValidationError(`Question ${index + 1} text is empty.`);
    }
    if (title.length > MAX_TEXT_LENGTH) {
      throw new ValidationError(`Question ${index + 1} exceeds ${MAX_TEXT_LENGTH} chars.`);
    }
    if (hasEmoji(title)) {
      throw new ValidationError(`Question ${index + 1} contains emoji.`);
    }
    if (hasMultipleQuestionSentences(title)) {
      throw new ValidationError(`Question ${index + 1} contains multiple questions.`);
    }
    if (looksYesNoQuestion(title)) {
      throw new ValidationError(`Question ${index + 1} is yes/no phrasing.`);
    }
    if (looksVagueEmotionQuestion(title)) {
      throw new ValidationError(`Question ${index + 1} is not performance-evaluable.`);
    }

    const dedupeKey = title.toLowerCase();
    if (seenTitles.has(dedupeKey)) {
      throw new ValidationError("Duplicate question text is not allowed.");
    }
    seenTitles.add(dedupeKey);

    const candidate: IncomingQuestion = {
      id: raw.id ? String(raw.id).trim() : createStableId(index, title),
      title,
      options: raw.options ?? DEFAULT_OPTIONS,
    };

    if (!candidate.id) {
      throw new ValidationError(`Question ${index + 1} id is missing.`);
    }

    ensureValidOptions(candidate);

    return candidate as Question;
  });

  return normalized;
}
