import type { Question } from "@/lib/questionnaire/types";

export type EngineInput = {
  dayIndex: number;
};

export type EngineOutput = {
  questions: Question[];
  engineVersion: string;
};

export interface QuestionnaireEngine {
  generate(input: EngineInput): EngineOutput | Promise<EngineOutput>;
}

