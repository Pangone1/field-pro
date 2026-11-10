import { supabase } from "@/integrations/supabase/client";

import { getOfflineDb, type SyncQueueItem } from "./offline-db";
import type { CustomerRow, InvoiceRow, JobRow, MileageRow, SyncTable } from "./rows";
import type { OutboxKind } from "./types";

type Payload = Record<string, unknown>;

/** Sends one full row to the cloud. Throws on any failure so the caller can queue it instead. */
export async function pushRow(table: SyncTable, payload: Payload): Promise<void> {
  // Each branch keeps the generated table types; payloads are built by the typed mappers in rows.ts.
  const res =
    table === "customers"
      ? await supabase.from("customers").upsert(payload as never)
      : table === "jobs"
        ? await supabase.from("jobs").upsert(payload as never)
        : table === "invoices"
          ? await supabase.from("invoices").upsert(payload as never)
          : await supabase.from("mileage_logs").upsert(payload as never);
  if (res.error) throw new Error(res.error.message);
}

export async function queueRow(
  userId: string,
  table: SyncTable,
  payload: Payload,
  kind: OutboxKind,
  label: string,
): Promise<void> {
  await getOfflineDb().syncQueue.add({ userId, table, payload, kind, label, createdAt: Date.now(), attempts: 0 });
}

export async function pendingCount(userId: string): Promise<number> {
  return getOfflineDb().syncQueue.where("userId").equals(userId).count();
}

export function pendingItems(userId: string): Promise<SyncQueueItem[]> {
  return getOfflineDb().syncQueue.where("userId").equals(userId).sortBy("createdAt");
}

let flushing: Promise<{ sent: number; remaining: number }> | null = null;

/**
 * Pushes queued changes to the cloud in the order they were made. Stops at the
 * first failure so later changes never land before earlier ones.
 */
export function flushQueue(userId: string): Promise<{ sent: number; remaining: number }> {
  flushing ??= (async () => {
    const q = getOfflineDb().syncQueue;
    let sent = 0;
    try {
      const items = await pendingItems(userId);
      for (const item of items) {
        try {
          await pushRow(item.table, item.payload);
          await q.delete(item.id!);
          sent++;
        } catch (err) {
          await q.update(item.id!, { attempts: item.attempts + 1 });
          console.warn("Sync paused:", err instanceof Error ? err.message : err);
          break;
        }
      }
    } finally {
      flushing = null;
    }
    return { sent, remaining: await pendingCount(userId) };
  })();
  return flushing;
}

export interface CloudSnapshot {
  customers: CustomerRow[];
  jobs: JobRow[];
  invoices: InvoiceRow[];
  mileage_logs: MileageRow[];
  fromCache: boolean;
}

/** Loads everything for the signed-in user; falls back to the last saved copy when offline. */
export async function loadSnapshot(userId: string): Promise<CloudSnapshot> {
  const cache = getOfflineDb().cache;
  try {
    const [customers, jobs, invoices, trips] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("jobs").select("*").order("scheduled_date", { ascending: true, nullsFirst: true }),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("mileage_logs").select("*").order("start_at", { ascending: true }),
    ]);
    const err = customers.error ?? jobs.error ?? invoices.error ?? trips.error;
    if (err) throw new Error(err.message);
    const snap: CloudSnapshot = {
      customers: customers.data,
      jobs: jobs.data,
      invoices: invoices.data,
      mileage_logs: trips.data,
      fromCache: false,
    };
    const savedAt = Date.now();
    await cache
      .bulkPut(
        (["customers", "jobs", "invoices", "mileage_logs"] as const).map((t) => ({
          key: `${userId}:${t}`,
          rows: snap[t],
          savedAt,
        })),
      )
      .catch(() => undefined);
    return snap;
  } catch (err) {
    const read = async <T>(t: SyncTable) => ((await cache.get(`${userId}:${t}`))?.rows ?? []) as T[];
    const snap: CloudSnapshot = {
      customers: await read<CustomerRow>("customers"),
      jobs: await read<JobRow>("jobs"),
      invoices: await read<InvoiceRow>("invoices"),
      mileage_logs: await read<MileageRow>("mileage_logs"),
      fromCache: true,
    };
    if (!snap.customers.length && !snap.jobs.length && navigator.onLine) throw err;
    return snap;
  }
}

/** Replays queued (not yet uploaded) rows on top of loaded rows so offline work stays visible after a reload. */
export function overlayPending<T extends { id: string }>(rows: T[], pending: SyncQueueItem[], table: SyncTable): T[] {
  const out = [...rows];
  for (const item of pending) {
    if (item.table !== table) continue;
    const row = item.payload as unknown as T;
    const i = out.findIndex((r) => r.id === row.id);
    if (i >= 0) out[i] = { ...out[i], ...row };
    else out.push(row);
  }
  return out;
}
