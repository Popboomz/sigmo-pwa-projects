import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { dailyLogs, insertDailyLogsSchema } from "./shared/schema";
import type { DailyLogs, InsertDailyLogs } from "./shared/schema";

export class DailyLogsManager {
  /**
   * 创建每日日志（幂等：如果已存在则抛出错误）
   */
  async createLog(data: InsertDailyLogs): Promise<DailyLogs> {
    const db = await getDb();
    const validated = insertDailyLogsSchema.parse(data);

    // 先检查是否已存在
    const existing = await this.getLog(validated.userId, validated.testDay, validated.protocolId);
    if (existing) {
      const error = new Error('Log already exists') as any;
      error.code = '23505';
      throw error;
    }

    // 插入新记录
    const [log] = await db.insert(dailyLogs).values(validated).returning();
    return log;
  }

  /**
   * 获取指定用户的指定天数日志
   */
  async getLog(userId: string, testDay: number, protocolId?: string): Promise<DailyLogs | null> {
    const db = await getDb();
    const conditions = [
      eq(dailyLogs.userId, userId),
      eq(dailyLogs.testDay, testDay)
    ];
    
    if (protocolId) {
      conditions.push(eq(dailyLogs.protocolId, protocolId));
    }
    
    const [log] = await db
      .select()
      .from(dailyLogs)
      .where(and(...conditions));
    return log || null;
  }

  /**
   * 检查指定天数是否已提交
   */
  async hasSubmitted(userId: string, testDay: number, protocolId?: string): Promise<boolean> {
    const log = await this.getLog(userId, testDay, protocolId);
    return log !== null;
  }

  /**
   * 获取用户的所有日志
   */
  async getLogsByUser(userId: string): Promise<DailyLogs[]> {
    const db = await getDb();
    return db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId))
      .orderBy(dailyLogs.testDay);
  }

  /**
   * 获取协议的所有日志
   */
  async getLogsByProtocol(protocolId: string): Promise<DailyLogs[]> {
    const db = await getDb();
    return db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.protocolId, protocolId))
      .orderBy(dailyLogs.testDay);
  }

  /**
   * 获取前一天的日志（用于生成新问题的上下文）
   */
  async getPreviousLog(
    userId: string,
    currentTestDay: number,
  ): Promise<DailyLogs | null> {
    if (currentTestDay <= 1) {
      return null;
    }

    return this.getLog(userId, currentTestDay - 1);
  }

  /**
   * 获取最近 N 天的日志
   */
  async getRecentLogs(userId: string, days: number): Promise<DailyLogs[]> {
    const db = await getDb();
    return db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId))
      .orderBy(desc(dailyLogs.testDay))
      .limit(days);
  }

  /**
   * 删除日志（慎用）
   */
  async deleteLog(userId: string, testDay: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .delete(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.testDay, testDay)));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 批量删除用户的所有日志
   */
  async deleteAllLogsByUser(userId: string): Promise<number> {
    const db = await getDb();
    const result = await db
      .delete(dailyLogs)
      .where(eq(dailyLogs.userId, userId));
    return result.rowCount ?? 0;
  }

  /**
   * 统计用户的提交次数
   */
  async countSubmissions(userId: string): Promise<number> {
    const db = await getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId));
    return result?.count ?? 0;
  }

  /**
   * 获取用户评分统计（用于趋势分析）
   */
  async getScoreTrend(userId: string): Promise<
    Array<{ testDay: number; scores: any }>
  > {
    const logs = await this.getLogsByUser(userId);
    return logs.map((log) => ({
      testDay: log.testDay,
      scores: log.structuredScores,
    }));
  }
}

export const dailyLogsManager = new DailyLogsManager();
