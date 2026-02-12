import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { QuestionnaireEngine } from "@/lib/questionnaire/engine/index";
import {
  calcDayIndex as legacyCalcDayIndex,
  getOrCreateActiveRun as legacyGetOrCreateActiveRun,
  submitTodayResponse as legacySubmitTodayResponse,
} from "@/lib/questionnaire/store";
import type { DailyQuestionnaire, TestRun } from "@/lib/questionnaire/types";

import type { DataStore, SubmitTodayResponseInput } from "./types";

async function getOrCreateTodayQuestionnaireWithEngine(
  uid: string,
  run: TestRun,
  todayKey: string,
  engine: QuestionnaireEngine
): Promise<DailyQuestionnaire> {
  const dayIndex = legacyCalcDayIndex(run, todayKey);
  const id = `${run.id}_${todayKey}`;
  const ref = doc(db, "dailyQuestionnaires", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const generated = await engine.generate({ dayIndex });
    const writeData = {
      id,
      uid,
      runId: run.id,
      dateKey: todayKey,
      dayIndex,
      questions: generated.questions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, writeData);
    return {
      ...writeData,
      engineVersion: generated.engineVersion,
    } as DailyQuestionnaire;
  }

  const data = snap.data() as DailyQuestionnaire;
  return { ...data, id };
}

export function createFirebaseDataStore(): DataStore {
  return {
    getOrCreateActiveRun: legacyGetOrCreateActiveRun,
    getOrCreateTodayQuestionnaire: getOrCreateTodayQuestionnaireWithEngine,
    submitTodayResponse: (input: SubmitTodayResponseInput) => legacySubmitTodayResponse(input),
  };
}
