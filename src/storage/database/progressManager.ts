import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  progress,
  insertProgressSchema,
  updateProgressSchema,
} from "./shared/schema";
import type { Progress, InsertProgress, UpdateProgress } from "./shared/schema";

export class ProgressManager {
  /**
   * 创建用户进度记录
   */
  async createProgress(data: InsertProgress): Promise<Progress> {
    const db = await getDb();
    const validated = insertProgressSchema.parse(data);
    const [newProgress] = await db.insert(progress).values(validated).returning();
    return newProgress;
  }

  /**
   * 获取用户的进度记录
   */
  async getProgress(userId: string, protocolId: string): Promise<Progress | null> {
    const db = await getDb();
    const [result] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.protocolId, protocolId)));
    return result || null;
  }

  /**
   * 获取协议的所有进度记录
   */
  async getProgressesByProtocol(protocolId: string): Promise<Progress[]> {
    const db = await getDb();
    return db
      .select()
      .from(progress)
      .where(eq(progress.protocolId, protocolId))
      .orderBy(progress.lastSubmittedDay);
  }

  /**
   * 更新用户进度
   */
  async updateProgress(
    userId: string,
    protocolId: string,
    data: UpdateProgress,
  ): Promise<Progress | null> {
    const db = await getDb();
    const validated = updateProgressSchema.parse(data);
    const [updated] = await db
      .update(progress)
      .set({ ...validated, updatedAt: new Date().toISOString() })
      .where(and(eq(progress.userId, userId), eq(progress.protocolId, protocolId)))
      .returning();
    return updated || null;
  }

  /**
   * 推进进度（用于提交成功后）
   */
  async advanceProgress(
    userId: string,
    protocolId: string,
    newDay: number,
    updates?: Partial<Pick<
      Progress,
      "materialState" | "logicBranch" | "lifecyclePhase"
    >>,
  ): Promise<Progress | null> {
    const db = await getDb();
    const [updated] = await db
      .update(progress)
      .set({
        lastSubmittedDay: newDay,
        completedDays: sql`${progress.completedDays} + 1`,
        lastSubmittedAt: new Date().toISOString(),
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(progress.userId, userId), eq(progress.protocolId, protocolId)))
      .returning();
    return updated || null;
  }

  /**
   * 标记测试已结束（materialState = ended，不可逆）
   */
  async endTest(userId: string, protocolId: string): Promise<Progress | null> {
    const db = await getDb();
    const [updated] = await db
      .update(progress)
      .set({
        materialState: "ended",
        lifecyclePhase: "finished",
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(progress.userId, userId), eq(progress.protocolId, protocolId)))
      .returning();
    return updated || null;
  }

  /**
   * 删除进度记录（慎用）
   */
  async deleteProgress(userId: string, protocolId: string): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .delete(progress)
      .where(and(eq(progress.userId, userId), eq(progress.protocolId, protocolId)));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 获取或创建进度记录
   */
  async getOrCreateProgress(
    userId: string,
    protocolId: string,
  ): Promise<Progress> {
    const existing = await this.getProgress(userId, protocolId);
    if (existing) {
      return existing;
    }

    return this.createProgress({
      userId,
      protocolId,
      lastSubmittedDay: 0,
      completedDays: 0,
      materialState: "new_bag",
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * 计算当前应该在哪一天（基于 lastSubmittedDay）
   */
  getCurrentDay(progress: Progress): number {
    return progress.lastSubmittedDay + 1;
  }

  /**
   * 检查是否已结束
   */
  isEnded(progress: Progress): boolean {
    return progress.materialState === "ended";
  }
}

export const progressManager = new ProgressManager();
