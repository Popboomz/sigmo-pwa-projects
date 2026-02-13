import { AiQuestionnaireEngine } from "./aiEngine";
import { TemplateQuestionnaireEngine } from "./templateEngine";
import type { EngineOutput } from "./types";

export async function generateWithFallback(dayIndex: number): Promise<EngineOutput> {
  const aiEngine = new AiQuestionnaireEngine();
  try {
    const aiOutput = await aiEngine.generate({ dayIndex });
    return {
      questions: aiOutput.questions,
      engineVersion: "ai",
    };
  } catch {
    const templateOutput = new TemplateQuestionnaireEngine().generate({ dayIndex });
    return {
      questions: templateOutput.questions,
      engineVersion: "template-fallback",
    };
  }
}

