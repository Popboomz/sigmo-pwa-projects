import { eq, and, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  questionnaires,
  insertQuestionnaireSchema,
} from "./shared/schema";
import type {
  Questionnaire,
  InsertQuestionnaire,
} from "./shared/schema";

export class QuestionnaireManager {
  async createQuestionnaire(data: InsertQuestionnaire): Promise<Questionnaire> {
    const db = await getDb();
    const validated = insertQuestionnaireSchema.parse(data);
    const [questionnaire] = await db.insert(questionnaires).values(validated).returning();
    return questionnaire;
  }

  async getQuestionnaireByProtocolAndDay(
    protocolId: string,
    dayIndex: number
  ): Promise<Questionnaire | null> {
    const db = await getDb();
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.protocolId, protocolId),
          eq(questionnaires.dayIndex, dayIndex)
        )
      );
    return questionnaire || null;
  }

  async getQuestionnairesByProtocol(protocolId: string): Promise<Questionnaire[]> {
    const db = await getDb();
    const questionnairesList = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.protocolId, protocolId))
      .orderBy(questionnaires.dayIndex);
    return questionnairesList;
  }

  async getLatestQuestionnaire(protocolId: string): Promise<Questionnaire | null> {
    const db = await getDb();
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.protocolId, protocolId))
      .orderBy(desc(questionnaires.dayIndex))
      .limit(1);
    return questionnaire || null;
  }

  async deleteQuestionnaireByProtocolAndDay(
    protocolId: string,
    dayIndex: number
  ): Promise<void> {
    const db = await getDb();
    await db
      .delete(questionnaires)
      .where(
        and(
          eq(questionnaires.protocolId, protocolId),
          eq(questionnaires.dayIndex, dayIndex)
        )
      );
  }
}

export const questionnaireManager = new QuestionnaireManager();
