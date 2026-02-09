import { eq, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { messages, insertMessageSchema } from "./shared/schema";
import type { Message, InsertMessage } from "./shared/schema";

export class MessageManager {
  async createMessage(data: InsertMessage): Promise<Message> {
    const db = await getDb();
    const validated = insertMessageSchema.parse(data);
    const [message] = await db.insert(messages).values(validated).returning();
    return message;
  }

  async getAllMessages(): Promise<Message[]> {
    const db = await getDb();
    return db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessageById(id: string): Promise<Message | null> {
    const db = await getDb();
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || null;
  }

  async deleteMessage(id: string): Promise<Message | null> {
    const db = await getDb();
    const [deletedMessage] = await db.delete(messages).where(eq(messages.id, id)).returning();
    return deletedMessage || null;
  }
}

export const messageManager = new MessageManager();
