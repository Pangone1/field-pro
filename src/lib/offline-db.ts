import Dexie, { type Table } from "dexie";

import type { SyncTable } from "./rows";
import type { OutboxKind } from "./types";

/** One change waiting to reach Lovable Cloud. Payloads are full rows, so replaying is idempotent (upsert by id). */
export interface SyncQueueItem {
  id?: number;
  userId: string;
  table: SyncTable;
  payload: Record<string, unknown>;
  kind: OutboxKind;
  label: string;
  createdAt: number;
  attempts: number;
}

/** Last rows loaded from the cloud, so the app opens with data when there's no signal. */
export interface CacheEntry {
  key: string; // `${userId}:${table}`
  rows: unknown[];
  savedAt: number;
}

class SoloContractorDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;
  cache!: Table<CacheEntry, string>;

  constructor() {
    super("SoloContractorDB");
    this.version(1).stores({
      syncQueue: "++id, userId, createdAt",
      cache: "key",
    });
  }
}

let db: SoloContractorDB | null = null;

/** Lazily opened so nothing touches IndexedDB during server rendering. */
export function getOfflineDb(): SoloContractorDB {
  db ??= new SoloContractorDB();
  return db;
}
