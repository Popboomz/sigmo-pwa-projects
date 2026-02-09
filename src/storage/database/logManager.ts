import { eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { logs, insertLogSchema } from "./shared/schema";
import type { Log, InsertLog } from "./shared/schema";

export class LogManager {
  async createLog(data: InsertLog): Promise<Log> {
    const db = await getDb();
    const validated = insertLogSchema.parse(data);
    const [log] = await db.insert(logs).values(validated).returning();
    return log;
  }

  async getAllLogs(): Promise<Log[]> {
    const db = await getDb();
    return db.select().from(logs).orderBy(logs.submittedAt);
  }

  async getLogsByProtocolId(protocolId: string): Promise<Log[]> {
    const db = await getDb();
    return db
      .select()
      .from(logs)
      .where(eq(logs.protocolId, protocolId))
      .orderBy(logs.submittedAt);
  }

  async getLogById(id: string): Promise<Log | null> {
    const db = await getDb();
    const [log] = await db.select().from(logs).where(eq(logs.id, id));
    return log || null;
  }
}

export const logManager = new LogManager();
