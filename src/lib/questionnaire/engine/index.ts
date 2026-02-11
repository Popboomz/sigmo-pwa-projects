import type { QuestionnaireEngine } from "./types";
import { TemplateQuestionnaireEngine } from "./templateEngine";

let engineSingleton: QuestionnaireEngine | null = null;

export function getQuestionnaireEngine(): QuestionnaireEngine {
  if (engineSingleton) return engineSingleton;

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
      engineSingleton = new TemplateQuestionnaireEngine();
      break;
    default:
      engineSingleton = new TemplateQuestionnaireEngine();
      break;
  }

  return engineSingleton;
}

export type { EngineInput, EngineOutput, QuestionnaireEngine } from "./types";
