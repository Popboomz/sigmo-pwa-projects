import type { QuestionnaireEngine } from "@/lib/questionnaire/engine/index";
import type { DailyQuestionnaire, ResponseDoc, TestRun } from "@/lib/questionnaire/types";

export type SubmitTodayResponseInput = {
  uid: string;
  runId: string;
  dateKey: string;
  dayIndex: number;
  answers: ResponseDoc["answers"];
  comment?: string;
};

export interface DataStore {
  getOrCreateActiveRun(uid: string, todayKey: string): Promise<TestRun>;
  getOrCreateTodayQuestionnaire(
    uid: string,
    run: TestRun,
    todayKey: string,
    engine: QuestionnaireEngine
  ): Promise<DailyQuestionnaire>;
  submitTodayResponse(input: SubmitTodayResponseInput): Promise<ResponseDoc>;
}

