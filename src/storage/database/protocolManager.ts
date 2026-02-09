import { eq, and } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { protocols, insertProtocolSchema, updateProtocolSchema } from "./shared/schema";
import type { Protocol, InsertProtocol, UpdateProtocol } from "./shared/schema";

export class ProtocolManager {
  async createProtocol(data: InsertProtocol): Promise<Protocol> {
    const db = await getDb();
    const validated = insertProtocolSchema.parse(data);
    const [protocol] = await db.insert(protocols).values(validated).returning();
    return protocol;
  }

  async getAllProtocols(): Promise<Protocol[]> {
    const db = await getDb();
    return db.select().from(protocols).orderBy(protocols.createdAt);
  }

  async getProtocolById(id: string): Promise<Protocol | null> {
    const db = await getDb();
    const [protocol] = await db.select().from(protocols).where(eq(protocols.id, id));
    return protocol || null;
  }

  async getProtocolByShareLink(shareLink: string): Promise<Protocol | null> {
    const db = await getDb();
    const [protocol] = await db
      .select()
      .from(protocols)
      .where(eq(protocols.shareLink, shareLink));
    return protocol || null;
  }

  async updateProtocol(id: string, data: UpdateProtocol): Promise<Protocol | null> {
    const db = await getDb();
    const validated = updateProtocolSchema.parse(data);
    const [protocol] = await db
      .update(protocols)
      .set({ ...validated, updatedAt: new Date().toISOString() })
      .where(eq(protocols.id, id))
      .returning();
    return protocol || null;
  }

  async deleteProtocol(id: string): Promise<boolean> {
    const db = await getDb();
    const [result] = await db.delete(protocols).where(eq(protocols.id, id)).returning();
    return !!result;
  }

  async updateProtocolMaterialState(id: string, materialState: string): Promise<Protocol | null> {
    const db = await getDb();
    const [protocol] = await db
      .update(protocols)
      .set({ materialState, updatedAt: new Date().toISOString() })
      .where(eq(protocols.id, id))
      .returning();
    return protocol || null;
  }
}

export const protocolManager = new ProtocolManager();
