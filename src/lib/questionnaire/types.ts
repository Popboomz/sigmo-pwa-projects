export type TestRun = {
  id: string;
  uid: string;
  startDateKey: string;
  durationDays: 7 | 14 | 21;
  status: "active" | "ended";
  createdAt?: any;
  updatedAt?: any;
};

export type QuestionOption = {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
};

export type Question = {
  id: string;
  title: string;
  options: QuestionOption[];
};

export type DailyQuestionnaire = {
  id: string;
  uid: string;
  runId: string;
  dateKey: string;
  dayIndex: number;
  questions: Question[];
  engineVersion: string;
  createdAt?: any;
  updatedAt?: any;
};

export type ResponseDoc = {
  id: string;
  uid: string;
  runId: string;
  dateKey: string;
  dayIndex: number;
  answers: Array<{ questionId: string; value: 1 | 2 | 3 | 4 | 5 }>;
  comment?: string;
  submittedAt?: any;
};
