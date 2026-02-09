import { eq, and } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  questionnaireAnswers,
  insertQuestionnaireAnswerSchema,
} from "./shared/schema";
import type {
  QuestionnaireAnswer,
  InsertQuestionnaireAnswer,
} from "./shared/schema";

export class QuestionnaireAnswerManager {
  async createAnswer(data: InsertQuestionnaireAnswer): Promise<QuestionnaireAnswer> {
    const db = await getDb();
    const validated = insertQuestionnaireAnswerSchema.parse(data);
    const [answer] = await db.insert(questionnaireAnswers).values(validated).returning();
    return answer;
  }

  async getAnswerByProtocolAndDay(
    protocolId: string,
    dayIndex: number
  ): Promise<QuestionnaireAnswer | null> {
    const db = await getDb();
    const [answer] = await db
      .select()
      .from(questionnaireAnswers)
      .where(
        and(
          eq(questionnaireAnswers.protocolId, protocolId),
          eq(questionnaireAnswers.dayIndex, dayIndex)
        )
      )
      .orderBy(questionnaireAnswers.submittedAt)
      .limit(1);
    return answer || null;
  }

  async getAnswersByProtocolAndDay(
    protocolId: string,
    dayIndex: number
  ): Promise<QuestionnaireAnswer[]> {
    const db = await getDb();
    const answers = await db
      .select()
      .from(questionnaireAnswers)
      .where(
        and(
          eq(questionnaireAnswers.protocolId, protocolId),
          eq(questionnaireAnswers.dayIndex, dayIndex)
        )
      )
      .orderBy(questionnaireAnswers.submittedAt);
    return answers;
  }

  async getAnswersByProtocol(protocolId: string): Promise<QuestionnaireAnswer[]> {
    const db = await getDb();
    const answers = await db
      .select()
      .from(questionnaireAnswers)
      .where(eq(questionnaireAnswers.protocolId, protocolId))
      .orderBy(questionnaireAnswers.dayIndex);
    return answers;
  }

  async hasSubmittedToday(
    protocolId: string,
    dayIndex: number
  ): Promise<boolean> {
    const db = await getDb();
    const [answer] = await db
      .select()
      .from(questionnaireAnswers)
      .where(
        and(
          eq(questionnaireAnswers.protocolId, protocolId),
          eq(questionnaireAnswers.dayIndex, dayIndex)
        )
      )
      .limit(1);
    return !!answer;
  }
}

export const questionnaireAnswerManager = new QuestionnaireAnswerManager();
