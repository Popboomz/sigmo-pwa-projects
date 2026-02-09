import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { daysBetweenSydney } from "@/lib/dateKey";
import type { DailyQuestionnaire, ResponseDoc, TestRun } from "./types";
import { ENGINE_VERSION, generateTemplateQuestions } from "./engine";

const DEFAULT_DURATION: TestRun["durationDays"] = 14;

export async function getOrCreateActiveRun(uid: string, todayKey: string): Promise<TestRun> {
  const runId = `run_${uid}`;
  const ref = doc(db, "testRuns", runId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const run: TestRun = {
      id: runId,
      uid,
      startDateKey: todayKey,
      durationDays: DEFAULT_DURATION,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, run);
    return run;
  }

  const data = snap.data() as TestRun;
  return { ...data, id: runId };
}

export function calcDayIndex(run: TestRun, todayKey: string): number {
  const offset = daysBetweenSydney(run.startDateKey, todayKey);
  return Math.min(run.durationDays, offset + 1);
}

export async function getOrCreateTodayQuestionnaire(
  uid: string,
  run: TestRun,
  todayKey: string
): Promise<DailyQuestionnaire> {
  const dayIndex = calcDayIndex(run, todayKey);
  const id = `${run.id}_${todayKey}`;
  const ref = doc(db, "dailyQuestionnaires", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const docData: DailyQuestionnaire = {
      id,
      uid,
      runId: run.id,
      dateKey: todayKey,
      dayIndex,
      questions: generateTemplateQuestions(dayIndex),
      engineVersion: ENGINE_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, docData);
    return docData;
  }

  const data = snap.data() as DailyQuestionnaire;
  return { ...data, id };
}

export async function submitTodayResponse(input: {
  uid: string;
  runId: string;
  dateKey: string;
  dayIndex: number;
  answers: ResponseDoc["answers"];
  comment?: string;
}): Promise<ResponseDoc> {
  const id = `${input.runId}_${input.dateKey}_${input.uid}`;
  const ref = doc(db, "responses", id);

  const comment = input.comment?.trim();

  const docData: ResponseDoc = {
    id,
    uid: input.uid,
    runId: input.runId,
    dateKey: input.dateKey,
    dayIndex: input.dayIndex,
    answers: input.answers,
    ...(comment ? { comment } : {}),
    submittedAt: serverTimestamp(),
  };

  await setDoc(ref, docData, { merge: true });

  const qRef = doc(db, "dailyQuestionnaires", `${input.runId}_${input.dateKey}`);
  await updateDoc(qRef, { updatedAt: serverTimestamp() }).catch(() => undefined);

  return docData;
}
