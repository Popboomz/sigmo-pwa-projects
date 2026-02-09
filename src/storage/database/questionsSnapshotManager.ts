import { eq, and, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  questionsSnapshot,
  insertQuestionsSnapshotSchema,
} from "./shared/schema";
import type { QuestionsSnapshot, InsertQuestionsSnapshot } from "./shared/schema";

export class QuestionsSnapshotManager {
  /**
   * 创建问卷快照
   */
  async createSnapshot(
    data: InsertQuestionsSnapshot,
  ): Promise<QuestionsSnapshot> {
    const db = await getDb();
    const validated = insertQuestionsSnapshotSchema.parse(data);
    const [snapshot] = await db
      .insert(questionsSnapshot)
      .values(validated)
      .returning();
    return snapshot;
  }

  /**
   * 获取指定用户的指定天数快照
   */
  async getSnapshot(
    userId: string,
    testDay: number,
  ): Promise<QuestionsSnapshot | null> {
    const db = await getDb();
    const [snapshot] = await db
      .select()
      .from(questionsSnapshot)
      .where(and(eq(questionsSnapshot.userId, userId), eq(questionsSnapshot.testDay, testDay)));
    return snapshot || null;
  }

  /**
   * 获取用户的所有快照
   */
  async getSnapshotsByUser(userId: string): Promise<QuestionsSnapshot[]> {
    const db = await getDb();
    return db
      .select()
      .from(questionsSnapshot)
      .where(eq(questionsSnapshot.userId, userId))
      .orderBy(questionsSnapshot.testDay);
  }

  /**
   * 获取协议的所有快照
   */
  async getSnapshotsByProtocol(
    protocolId: string,
  ): Promise<QuestionsSnapshot[]> {
    const db = await getDb();
    return db
      .select()
      .from(questionsSnapshot)
      .where(eq(questionsSnapshot.protocolId, protocolId))
      .orderBy(questionsSnapshot.testDay);
  }

  /**
   * 获取或创建快照（幂等）
   * 如果快照已存在，返回现有快照
   * 如果快照不存在，创建新快照
   */
  async getOrCreateSnapshot(
    data: InsertQuestionsSnapshot,
  ): Promise<QuestionsSnapshot> {
    const existing = await this.getSnapshot(data.userId, data.testDay);
    if (existing) {
      return existing;
    }

    return this.createSnapshot(data);
  }

  /**
   * 获取前一天的快照（用于生成问题时的上下文）
   */
  async getPreviousSnapshot(
    userId: string,
    currentTestDay: number,
  ): Promise<QuestionsSnapshot | null> {
    if (currentTestDay <= 1) {
      return null;
    }

    return this.getSnapshot(userId, currentTestDay - 1);
  }

  /**
   * 删除快照（慎用）
   */
  async deleteSnapshot(userId: string, testDay: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .delete(questionsSnapshot)
      .where(and(eq(questionsSnapshot.userId, userId), eq(questionsSnapshot.testDay, testDay)));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 批量删除用户的所有快照
   */
  async deleteAllSnapshotsByUser(userId: string): Promise<number> {
    const db = await getDb();
    const result = await db
      .delete(questionsSnapshot)
      .where(eq(questionsSnapshot.userId, userId));
    return result.rowCount ?? 0;
  }
}

export const questionsSnapshotManager = new QuestionsSnapshotManager();
