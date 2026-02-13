import { createFirebaseDataStore } from "./firebaseStore";
import type { DataStore } from "./types";

let storeSingleton: DataStore | null = null;

export function getDataStore(): DataStore {
  if (!storeSingleton) {
    storeSingleton = createFirebaseDataStore();
  }
  return storeSingleton;
}

export type { DataStore, SubmitTodayResponseInput } from "./types";

