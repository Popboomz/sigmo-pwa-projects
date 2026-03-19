import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Message, Protocol } from '@/storage/database/shared/schema';

type LocalProtocol = Protocol;
type LocalMessage = Message;

interface LocalAdminStoreData {
  protocols: LocalProtocol[];
  messages: LocalMessage[];
}

const DEFAULT_STORE: LocalAdminStoreData = {
  protocols: [],
  messages: [],
};

function getStorePath(): string {
  return path.join(process.cwd(), '.local-dev-data', 'admin-store.json');
}

async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(path.dirname(getStorePath()), { recursive: true });
}

async function readStore(): Promise<LocalAdminStoreData> {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalAdminStoreData>;
    return {
      protocols: Array.isArray(parsed.protocols) ? parsed.protocols : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

async function writeStore(data: LocalAdminStoreData): Promise<void> {
  await ensureStoreDir();
  await fs.writeFile(getStorePath(), JSON.stringify(data, null, 2), 'utf8');
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  return crypto.randomUUID();
}

export async function listLocalProtocols(): Promise<LocalProtocol[]> {
  const store = await readStore();
  return [...store.protocols].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLocalProtocol(input: {
  title: string;
  description: string | null;
  shareLink: string;
  productName: string | null;
  testPeriodDays: number;
  createdBy: string;
  materialState?: string | null;
}): Promise<LocalProtocol> {
  const store = await readStore();
  const protocol: LocalProtocol = {
    id: createId(),
    title: input.title,
    description: input.description,
    shareLink: input.shareLink,
    createdBy: input.createdBy,
    createdAt: nowIso(),
    updatedAt: null,
    productName: input.productName,
    testPeriodDays: input.testPeriodDays,
    materialState: input.materialState ?? 'new_bag',
  };
  store.protocols.unshift(protocol);
  await writeStore(store);
  return protocol;
}

export async function getLocalProtocolById(id: string): Promise<LocalProtocol | null> {
  const store = await readStore();
  return store.protocols.find((protocol) => protocol.id === id) ?? null;
}

export async function getLocalProtocolByShareLink(shareLink: string): Promise<LocalProtocol | null> {
  const store = await readStore();
  return store.protocols.find((protocol) => protocol.shareLink === shareLink) ?? null;
}

export async function deleteLocalProtocol(id: string): Promise<boolean> {
  const store = await readStore();
  const nextProtocols = store.protocols.filter((protocol) => protocol.id !== id);
  if (nextProtocols.length === store.protocols.length) {
    return false;
  }
  store.protocols = nextProtocols;
  await writeStore(store);
  return true;
}

export async function listLocalMessages(): Promise<LocalMessage[]> {
  const store = await readStore();
  return [...store.messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLocalMessage(input: {
  authorName: string;
  content: string;
  createdBy?: string | null;
}): Promise<LocalMessage> {
  const store = await readStore();
  const message: LocalMessage = {
    id: createId(),
    authorName: input.authorName,
    content: input.content,
    createdBy: input.createdBy ?? null,
    createdAt: nowIso(),
  };
  store.messages.unshift(message);
  await writeStore(store);
  return message;
}

export async function deleteLocalMessage(id: string): Promise<LocalMessage | null> {
  const store = await readStore();
  const message = store.messages.find((item) => item.id === id) ?? null;
  if (!message) {
    return null;
  }
  store.messages = store.messages.filter((item) => item.id !== id);
  await writeStore(store);
  return message;
}
