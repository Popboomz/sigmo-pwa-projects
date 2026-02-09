import { eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { surveys, insertSurveySchema } from "./shared/schema";
import type { Survey, InsertSurvey } from "./shared/schema";

export class SurveyManager {
  async createSurvey(data: InsertSurvey): Promise<Survey> {
    const db = await getDb();
    const validated = insertSurveySchema.parse(data);
    const [survey] = await db.insert(surveys).values(validated).returning();
    return survey;
  }

  async getAllSurveys(): Promise<Survey[]> {
    const db = await getDb();
    return db.select().from(surveys).orderBy(surveys.submittedAt);
  }

  async getSurveyById(id: string): Promise<Survey | null> {
    const db = await getDb();
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey || null;
  }
}

export const surveyManager = new SurveyManager();
