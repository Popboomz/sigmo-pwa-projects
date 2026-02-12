import { ENGINE_VERSION, generateTemplateQuestions } from "@/lib/questionnaire/engine";

import type { EngineInput, EngineOutput, QuestionnaireEngine } from "./types";

export class TemplateQuestionnaireEngine implements QuestionnaireEngine {
  generate(input: EngineInput): EngineOutput {
    return {
      questions: generateTemplateQuestions(input.dayIndex),
      engineVersion: ENGINE_VERSION,
    };
  }
}

