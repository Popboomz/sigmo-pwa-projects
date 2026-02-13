import type { QuestionnaireEngine } from "./types";
import { generateWithFallback } from "./fallback";
import { TemplateQuestionnaireEngine } from "./templateEngine";

let engineSingleton: QuestionnaireEngine | null = null;

export function getQuestionnaireEngine(): QuestionnaireEngine {
  if (engineSingleton) return engineSingleton;

  const forceTemplate =
    process.env.NODE_ENV === "test" ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1";
  if (forceTemplate) {
    engineSingleton = new TemplateQuestionnaireEngine();
    return engineSingleton;
  }

  const configuredEngine = (
    process.env.NEXT_PUBLIC_QUESTION_ENGINE ??
    process.env.QUESTION_ENGINE ??
    "template"
  ).toLowerCase();

  switch (configuredEngine) {
    case "template":
      engineSingleton = new TemplateQuestionnaireEngine();
      break;
    case "ai":
      engineSingleton = {
        generate: ({ dayIndex }) => generateWithFallback(dayIndex),
      };
      break;
    default:
      engineSingleton = new TemplateQuestionnaireEngine();
      break;
  }

  return engineSingleton;
}

export type { EngineInput, EngineOutput, QuestionnaireEngine } from "./types";
