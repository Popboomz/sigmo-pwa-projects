import type { Question } from "@/lib/questionnaire/types";

import type { EngineInput, EngineOutput, QuestionnaireEngine } from "./types";
import { validateAndNormalizeQuestions } from "./validator";

type AiRouteResponse = {
  questions?: unknown[];
  engineVersion?: string;
  error?: string;
};

export class AiQuestionnaireEngine implements QuestionnaireEngine {
  async generate(input: EngineInput): Promise<EngineOutput> {
    if (typeof window !== "undefined") {
      throw new Error("AiQuestionnaireEngine must run on the server.");
    }

    const adminToken = process.env.AI_ADMIN_TOKEN;
    if (!adminToken) {
      throw new Error("AI_ADMIN_TOKEN is not configured.");
    }

    const response = await fetch("/api/admin/ai/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sigmo-admin-token": adminToken,
      },
      body: JSON.stringify({ dayIndex: input.dayIndex }),
    });

    let payload: AiRouteResponse = {};
    try {
      payload = (await response.json()) as AiRouteResponse;
    } catch {
      // Keep payload empty and use status text below.
    }

    if (!response.ok) {
      throw new Error(payload.error || `AI route failed: ${response.status}`);
    }

    const questions = validateAndNormalizeQuestions((payload.questions ?? []) as Question[]);
    return {
      questions,
      engineVersion: payload.engineVersion || "ai",
    };
  }
}
