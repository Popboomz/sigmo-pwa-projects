import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

import type {
  DailyLogs,
  Progress,
  QuestionsSnapshot,
} from '@/storage/database/shared/schema';
import type {
  LifecyclePhase,
  LogicBranch,
  MaterialState,
} from '@/storage/database/dynamicQuestionnaireGenerator';

interface LocalQuestionnaireStoreData {
  progress: Progress[];
  snapshots: QuestionsSnapshot[];
  dailyLogs: DailyLogs[];
}

const DEFAULT_STORE: LocalQuestionnaireStoreData = {
  progress: [],
  snapshots: [],
  dailyLogs: [],
};

function getStorePath(): string {
  return path.join(process.cwd(), '.local-dev-data', 'questionnaire-store.json');
}

async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(path.dirname(getStorePath()), { recursive: true });
}

async function readStore(): Promise<LocalQuestionnaireStoreData> {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalQuestionnaireStoreData>;

    return {
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      dailyLogs: Array.isArray(parsed.dailyLogs) ? parsed.dailyLogs : [],
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

async function writeStore(data: LocalQuestionnaireStoreData): Promise<void> {
  await ensureStoreDir();
  await fs.writeFile(getStorePath(), JSON.stringify(data, null, 2), 'utf8');
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  return crypto.randomUUID();
}

function createProgressRecord(userId: string, protocolId: string): Progress {
  return {
    id: createId(),
    userId,
    protocolId,
    lastSubmittedDay: 0,
    completedDays: 0,
    materialState: 'new_bag',
    logicBranch: null,
    lifecyclePhase: null,
    lastSubmittedAt: null,
    startedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: null,
  };
}

export async function getOrCreateLocalProgress(
  userId: string,
  protocolId: string,
): Promise<Progress> {
  const store = await readStore();
  const existing = store.progress.find(
    (item) => item.userId === userId && item.protocolId === protocolId,
  );

  if (existing) {
    return existing;
  }

  const progress = createProgressRecord(userId, protocolId);
  store.progress.push(progress);
  await writeStore(store);
  return progress;
}

export function getCurrentLocalDay(progress: Progress): number {
  return progress.lastSubmittedDay + 1;
}

export function isLocalProgressEnded(progress: Progress): boolean {
  return progress.materialState === 'ended';
}

export async function endLocalTest(
  userId: string,
  protocolId: string,
): Promise<Progress | null> {
  const store = await readStore();
  const target = store.progress.find(
    (item) => item.userId === userId && item.protocolId === protocolId,
  );

  if (!target) {
    return null;
  }

  target.materialState = 'ended';
  target.lifecyclePhase = 'finished';
  target.updatedAt = nowIso();
  await writeStore(store);
  return target;
}

export async function advanceLocalProgress(
  userId: string,
  protocolId: string,
  newDay: number,
  updates?: Partial<Pick<Progress, 'materialState' | 'logicBranch' | 'lifecyclePhase'>>,
): Promise<Progress | null> {
  const store = await readStore();
  const target = store.progress.find(
    (item) => item.userId === userId && item.protocolId === protocolId,
  );

  if (!target) {
    return null;
  }

  target.lastSubmittedDay = newDay;
  target.completedDays += 1;
  target.lastSubmittedAt = nowIso();
  target.updatedAt = nowIso();

  if (updates?.materialState) {
    target.materialState = updates.materialState;
  }
  if (updates?.logicBranch) {
    target.logicBranch = updates.logicBranch;
  }
  if (updates?.lifecyclePhase) {
    target.lifecyclePhase = updates.lifecyclePhase;
  }

  await writeStore(store);
  return target;
}

export async function getLocalSnapshot(
  userId: string,
  testDay: number,
): Promise<QuestionsSnapshot | null> {
  const store = await readStore();
  return (
    store.snapshots.find((item) => item.userId === userId && item.testDay === testDay) ||
    null
  );
}

export async function getLocalSnapshotsByUser(userId: string): Promise<QuestionsSnapshot[]> {
  const store = await readStore();
  return store.snapshots
    .filter((item) => item.userId === userId)
    .sort((a, b) => a.testDay - b.testDay);
}

export async function createLocalSnapshot(
  data: Omit<QuestionsSnapshot, 'id' | 'createdAt'>,
): Promise<QuestionsSnapshot> {
  const store = await readStore();
  const existing = store.snapshots.find(
    (item) => item.userId === data.userId && item.testDay === data.testDay,
  );

  if (existing) {
    return existing;
  }

  const snapshot: QuestionsSnapshot = {
    ...data,
    id: createId(),
    createdAt: nowIso(),
  };
  store.snapshots.push(snapshot);
  await writeStore(store);
  return snapshot;
}

export async function getLocalLog(
  userId: string,
  testDay: number,
  protocolId?: string,
): Promise<DailyLogs | null> {
  const store = await readStore();
  return (
    store.dailyLogs.find(
      (item) =>
        item.userId === userId &&
        item.testDay === testDay &&
        (!protocolId || item.protocolId === protocolId),
    ) || null
  );
}

export async function hasLocalSubmitted(
  userId: string,
  testDay: number,
  protocolId?: string,
): Promise<boolean> {
  return Boolean(await getLocalLog(userId, testDay, protocolId));
}

export async function getPreviousLocalLog(
  userId: string,
  currentTestDay: number,
  protocolId?: string,
): Promise<DailyLogs | null> {
  if (currentTestDay <= 1) {
    return null;
  }

  return getLocalLog(userId, currentTestDay - 1, protocolId);
}

export async function getLocalLogsByUser(
  userId: string,
  protocolId?: string,
): Promise<DailyLogs[]> {
  const store = await readStore();
  return store.dailyLogs
    .filter((item) => item.userId === userId && (!protocolId || item.protocolId === protocolId))
    .sort((a, b) => a.testDay - b.testDay);
}

export async function getLocalLogsByProtocol(protocolId: string): Promise<DailyLogs[]> {
  const store = await readStore();
  return store.dailyLogs
    .filter((item) => item.protocolId === protocolId)
    .sort((a, b) => a.testDay - b.testDay);
}

export async function getLocalProgressByProtocol(protocolId: string): Promise<Progress[]> {
  const store = await readStore();
  return store.progress
    .filter((item) => item.protocolId === protocolId)
    .sort((a, b) => a.lastSubmittedDay - b.lastSubmittedDay);
}

export async function createLocalDailyLog(input: {
  userId: string;
  protocolId: string;
  testDay: number;
  answers: any;
  remark: string | null;
  structuredScores: any;
  materialState: MaterialState;
  logicBranch: LogicBranch;
  lifecyclePhase: LifecyclePhase;
  submittedAt: string;
}): Promise<DailyLogs> {
  const store = await readStore();
  const log: DailyLogs = {
    id: createId(),
    userId: input.userId,
    protocolId: input.protocolId,
    testDay: input.testDay,
    answers: input.answers,
    remark: input.remark,
    structuredScores: input.structuredScores,
    materialState: input.materialState,
    logicBranch: input.logicBranch,
    lifecyclePhase: input.lifecyclePhase,
    submittedAt: input.submittedAt,
    createdAt: nowIso(),
  };

  store.dailyLogs.push(log);
  await writeStore(store);
  return log;
}
