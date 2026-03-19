import { NextRequest, NextResponse } from "next/server";

import { generateJson } from "@/lib/ai/chatgpt";
import { validateAndNormalizeQuestions } from "@/lib/questionnaire/engine/validator";
import type { Question } from "@/lib/questionnaire/types";

type ProviderQuestion = {
  id?: string;
  title?: string;
  text?: string;
  options?: Question["options"];
};

function createMockQuestions(dayIndex: number): ProviderQuestion[] {
  return [
    { id: `q_ai_${dayIndex}_odor`, title: `Day ${dayIndex}: How effective was odor control?` },
    { id: `q_ai_${dayIndex}_dust`, title: `Day ${dayIndex}: How well was dust controlled during scooping?` },
    { id: `q_ai_${dayIndex}_clump`, title: `Day ${dayIndex}: How strong and intact were the clumps?` },
    { id: `q_ai_${dayIndex}_track`, title: `Day ${dayIndex}: How well was litter tracking minimized?` },
    { id: `q_ai_${dayIndex}_clean`, title: `Day ${dayIndex}: How efficient was tray cleanup with low residue?` },
  ];
}

function extractQuestionsFromText(content: string): ProviderQuestion[] {
  const parsed = JSON.parse(content) as unknown;
  if (Array.isArray(parsed)) return parsed as ProviderQuestion[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown[] }).questions)) {
    return (parsed as { questions: ProviderQuestion[] }).questions;
  }
  throw new Error("AI response does not contain a questions array");
}

async function generateByOpenAI(dayIndex: number): Promise<ProviderQuestion[]> {
  const prompt = [
    "Generate exactly 5 questionnaire items for cat litter performance evaluation.",
    `Day index: ${dayIndex}.`,
    'Output JSON only, as {"questions":[{"id":"...","title":"..."}]}.',
    "Requirements: each title <= 80 chars; no emoji; no yes/no phrasing; no duplicate titles.",
    "Use performance-evaluable phrasing only.",
  ].join(" ");

  const payload = await generateJson<{ questions?: ProviderQuestion[] }>({
    systemPrompt: "You are a strict JSON generator.",
    userPrompt: prompt,
    temperature: 0.2,
  });

  return extractQuestionsFromText(JSON.stringify(payload));
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.AI_ADMIN_TOKEN;
    const receivedToken = request.headers.get("x-sigmo-admin-token");
    if (!expectedToken || receivedToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { dayIndex?: number };
    const dayIndex = Number(body.dayIndex);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      return NextResponse.json({ error: "dayIndex must be a positive integer" }, { status: 400 });
    }

    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
    let rawQuestions: ProviderQuestion[];

    if (provider === "mock") {
      rawQuestions = createMockQuestions(dayIndex);
    } else if (provider === "openai") {
      rawQuestions = await generateByOpenAI(dayIndex);
    } else {
      throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
    }

    const questions = validateAndNormalizeQuestions(rawQuestions);
    return NextResponse.json({
      questions,
      engineVersion: `ai-${provider}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
