import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { estimateToInvoice } from "./billing";
import { addDays, toDateKey } from "./links";
import { getOfflineDb } from "./offline-db";
import {
  customerFromRow,
  customerToRow,
  finishTrip,
  invoiceFromRow,
  invoiceToRow,
  jobFromRow,
  jobToRow,
  timeToHour,
  tripFromRow,
  tripToRow,
  type SyncTable,
} from "./rows";
import { flushQueue, loadSnapshot, overlayPending, pendingItems, pushRow, queueRow } from "./sync";
import type {
  BackupProvider,
  BackupState,
  Customer,
  Estimate,
  Expense,
  Invoice,
  Job,
  JobStatus,
  OutboxItem,
  OutboxKind,
  PaymentMethod,
  TimeEntry,
  Trip,
} from "./types";

export interface AppData {
  today: string;
  customers: Customer[];
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  timeEntries: TimeEntry[];
  expenses: Expense[];
  trips: Trip[];
  backups: Record<BackupProvider, BackupState>;
  business: { name: string; owner: string; maskedLine: string };
}

export interface NewJobInput {
  title: string;
  customerName: string;
  address: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: JobStatus;
}

export type SaveResult = { queued: boolean };

/**
 * App state. Jobs, customers, invoices and mileage live in Lovable Cloud; every
 * change is applied here first, then sent to the cloud — or parked in the
 * on-device sync queue when there's no signal.
 */
interface Store extends AppData {
  userId: string;
  email: string;
  online: boolean;
  networkOnline: boolean;
  simulateOffline: boolean;
  setSimulateOffline: (v: boolean) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;

  /** Changes waiting in the on-device sync queue. */
  outbox: OutboxItem[];
  flushOutbox: () => Promise<{ sent: number; remaining: number }>;
  reload: () => Promise<void>;

  createJob: (input: NewJobInput) => Promise<SaveResult>;
  updateJob: (id: string, patch: Partial<Job>, outbox?: { kind: OutboxKind; label: string }) => void;
  setJobStatus: (id: string, status: JobStatus) => void;
  toggleChecklist: (jobId: string, itemId: string) => void;
  logJobActivity: (jobId: string, text: string) => void;
  rescheduleJob: (id: string, date: string, startHour: number) => void;

  saveEstimate: (est: Estimate) => void;
  createEstimate: (customerId: string, jobId: string | null) => Estimate;
  convertEstimate: (estimateId: string) => Invoice | null;
  payInvoice: (invoiceId: string, method: PaymentMethod) => void;
  replaceInvoice: (inv: Invoice) => void;

  clockedIn: boolean;
  toggleClock: () => void;

  addExpense: (e: Omit<Expense, "id" | "createdAt">) => void;

  activeTripId: string | null;
  startTrip: (t: { purpose: string; odometer: number; addressFrom: string; addressTo: string }) => Promise<SaveResult>;
  endTrip: (t: { odometer: number; addressTo: string }) => Promise<SaveResult & { trip: Trip }>;

  runBackup: (p: BackupProvider) => void;
}

const StoreContext = createContext<Store | null>(null);

const KIND_LABEL: Record<JobStatus, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
};

export const statusLabel = (s: JobStatus) => KIND_LABEL[s];

const newId = () => crypto.randomUUID();

function emptyData(now: Date, owner: string): AppData {
  return {
    today: toDateKey(now),
    customers: [],
    jobs: [],
    estimates: [],
    invoices: [],
    timeEntries: [],
    expenses: [],
    trips: [],
    backups: {
      gdrive: { status: "idle", progress: 0, lastBackupAt: null },
      onedrive: { status: "idle", progress: 0, lastBackupAt: null },
      dropbox: { status: "idle", progress: 0, lastBackupAt: null },
    },
    business: { name: "Thompson Field Services", owner, maskedLine: "(512) 555-0100" },
  };
}

export function StoreProvider({ children, splash }: { children: ReactNode; splash: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const online = networkOnline && !simulateOffline;
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const refreshOutbox = useCallback(async (uid: string) => {
    const items = await pendingItems(uid);
    setOutbox(items.map((i) => ({ id: String(i.id), kind: i.kind, label: i.label, at: i.createdAt })));
    return items;
  }, []);

  const load = useCallback(
    async (uid: string, owner: string) => {
      try {
        const snap = await loadSnapshot(uid);
        const pending = await refreshOutbox(uid);
        const base = emptyData(new Date(), owner);
        setData((prev) => ({
          ...(prev ?? base),
          today: base.today,
          business: { ...base.business, owner },
          customers: overlayPending(snap.customers, pending, "customers").map(customerFromRow),
          jobs: overlayPending(snap.jobs, pending, "jobs").map(jobFromRow),
          invoices: overlayPending(snap.invoices, pending, "invoices").map(invoiceFromRow),
          trips: overlayPending(snap.mileage_logs, pending, "mileage_logs").map(tripFromRow),
        }));
        setLoadError(null);
        if (snap.fromCache) toast("Showing your last synced data", { description: "No signal — changes will upload later." });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Couldn't load your data.");
      }
    },
    [refreshOutbox],
  );

  useEffect(() => {
    setNetworkOnline(navigator.onLine);
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const on = () => setNetworkOnline(true);
    const off = () => setNetworkOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s.session?.user;
      if (!u) return;
      const owner =
        (u.user_metadata?.["full_name"] as string | undefined) ??
        (u.user_metadata?.["name"] as string | undefined) ??
        (u.email ?? "").split("@")[0] ??
        "";
      setUser({ id: u.id, email: u.email ?? "" });
      await load(u.id, owner);
    })();

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [load]);

  const userId = user?.id ?? null;

  const flush = useCallback(async () => {
    if (!userId) return { sent: 0, remaining: 0 };
    const res = await flushQueue(userId);
    await refreshOutbox(userId);
    return res;
  }, [userId, refreshOutbox]);

  // Global network listener: whenever the app regains signal, push the offline queue.
  useEffect(() => {
    if (!online || !userId) return;
    void (async () => {
      const pending = await pendingItems(userId);
      if (pending.length === 0) return;
      const { sent, remaining } = await flush();
      if (sent > 0) toast.success(`Synced ${sent} offline change${sent === 1 ? "" : "s"}`);
      if (remaining > 0) toast.error(`${remaining} change${remaining === 1 ? "" : "s"} still waiting to upload`);
    })();
  }, [online, userId, flush]);

  /** Sends a row to the cloud, or parks it in the sync queue when offline (or when earlier changes are still queued). */
  const save = useCallback(
    async (table: SyncTable, payload: object, kind: OutboxKind, label: string): Promise<SaveResult> => {
      if (!userId) return { queued: false };
      const row = payload as Record<string, unknown>;
      const hasBacklog = (await pendingItems(userId)).length > 0;
      if (onlineRef.current && !hasBacklog) {
        try {
          await pushRow(table, row);
          return { queued: false };
        } catch (err) {
          console.warn("Upload failed, queued for later:", err);
        }
      }
      await queueRow(userId, table, row, kind, label);
      await refreshOutbox(userId);
      if (onlineRef.current) void flush();
      return { queued: true };
    },
    [userId, refreshOutbox, flush],
  );

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try {
      localStorage.setItem("fieldpro-theme", t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<Store | null>(() => {
    if (!data || !user) return null;
    const activeTrip = data.trips.find((t) => t.endAt === null) ?? null;
    const openEntry = data.timeEntries.find((e) => e.clockOut === null) ?? null;
    const customerName = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "";

    const saveJob = (job: Job, kind: OutboxKind, label: string) =>
      save("jobs", jobToRow(job, customerName(job.customerId)), kind, label);

    /** Applies a change to one job locally and uploads the result. */
    const mutateJob = (id: string, fn: (j: Job) => Job, kind: OutboxKind, label: (j: Job) => string) => {
      const current = data.jobs.find((j) => j.id === id);
      if (!current) return;
      const next = fn(current);
      if (next === current) return;
      setData((d) => (d ? { ...d, jobs: d.jobs.map((j) => (j.id === id ? next : j)) } : d));
      void saveJob(next, kind, label(next));
    };

    const saveInvoice = (inv: Invoice, kind: OutboxKind, label: string) =>
      save("invoices", invoiceToRow(inv), kind, label);

    return {
      ...data,
      userId: user.id,
      email: user.email,
      online,
      networkOnline,
      simulateOffline,
      setSimulateOffline,
      theme,
      setTheme,
      outbox,
      flushOutbox: flush,
      reload: () => load(user.id, data.business.owner),

      createJob: async (input) => {
        const name = input.customerName.trim();
        let customer = data.customers.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
        if (!customer) {
          customer = {
            id: newId(),
            name,
            phone: "",
            email: "",
            address: input.address.trim(),
            customerSince: data.today,
            notes: "",
            equipment: [],
          };
          const c = customer;
          setData((d) => (d ? { ...d, customers: [...d.customers, c] } : d));
          await save("customers", customerToRow(c), "customer", `New customer · ${c.name}`);
        }
        const start = timeToHour(input.startTime);
        const end = timeToHour(input.endTime);
        const job: Job = {
          id: newId(),
          customerId: customer.id,
          title: input.title.trim(),
          serviceType: "General service",
          date: input.date,
          startHour: start,
          durationHrs: Math.max(0.25, end - start),
          status: input.status,
          address: input.address.trim(),
          priority: "normal",
          checklist: [],
          notes: "",
          photos: [],
          signature: null,
          activity: [{ at: Date.now(), text: "Job created" }],
          source: "app",
        };
        setData((d) => (d ? { ...d, jobs: [...d.jobs, job] } : d));
        return save("jobs", jobToRow(job, customer.name), "job", `New job · ${job.title}`);
      },

      updateJob: (id, p, ob) =>
        mutateJob(id, (j) => ({ ...j, ...p }), ob?.kind ?? "note", (j) => ob?.label ?? `Updated · ${j.title}`),
      setJobStatus: (id, status) =>
        mutateJob(
          id,
          (j) => ({ ...j, status, activity: [...j.activity, { at: Date.now(), text: `Status → ${KIND_LABEL[status]}` }] }),
          "status",
          (j) => `${j.title} → ${KIND_LABEL[status]}`,
        ),
      toggleChecklist: (jobId, itemId) =>
        mutateJob(
          jobId,
          (j) => ({ ...j, checklist: j.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }),
          "checklist",
          (j) => {
            const item = j.checklist.find((c) => c.id === itemId);
            return `${item?.done ? "✓" : "○"} ${item?.label ?? "Task"}`;
          },
        ),
      logJobActivity: (jobId, text) =>
        mutateJob(jobId, (j) => ({ ...j, activity: [...j.activity, { at: Date.now(), text }] }), "note", () => text),
      rescheduleJob: (id, date, startHour) =>
        mutateJob(
          id,
          (j) => (j.date === date && j.startHour === startHour ? j : { ...j, date, startHour }),
          "schedule",
          (j) => `Rescheduled · ${j.title}`,
        ),

      // Estimates, expenses and time entries stay on this device for now.
      saveEstimate: (est) =>
        setData((d) => (d ? { ...d, estimates: d.estimates.map((e) => (e.id === est.id ? est : e)) } : d)),
      createEstimate: (customerId, jobId) => {
        const est: Estimate = {
          id: newId(),
          number: `EST-${1044 + data.estimates.length}`,
          customerId,
          jobId,
          title: "New estimate",
          status: "draft",
          selectedTier: "better",
          taxRate: 0.0825,
          createdAt: Date.now(),
          invoiceId: null,
          tiers: {
            good: { name: "Good", summary: "Essential fix", items: [] },
            better: { name: "Better", summary: "Recommended", items: [] },
            best: { name: "Best", summary: "Premium + protection", items: [] },
          },
        };
        setData((d) => (d ? { ...d, estimates: [est, ...d.estimates] } : d));
        return est;
      },
      convertEstimate: (estimateId) => {
        const est = data.estimates.find((e) => e.id === estimateId);
        if (!est || est.status !== "approved") return null;
        const invoice = estimateToInvoice(est, {
          id: newId(),
          number: `INV-${2088 + data.invoices.length}`,
          now: Date.now(),
          dueDate: addDays(data.today, 30),
        });
        setData((d) =>
          d
            ? {
                ...d,
                invoices: [invoice, ...d.invoices],
                estimates: d.estimates.map((e) =>
                  e.id === estimateId ? { ...e, status: "converted", invoiceId: invoice.id } : e,
                ),
              }
            : d,
        );
        void saveInvoice(invoice, "invoice", `${invoice.number} created from ${est.number}`);
        return invoice;
      },
      payInvoice: (invoiceId, method) => {
        const inv = data.invoices.find((i) => i.id === invoiceId);
        if (!inv) return;
        const paid: Invoice = { ...inv, status: "paid", paidAt: Date.now(), paidMethod: method };
        setData((d) => (d ? { ...d, invoices: d.invoices.map((i) => (i.id === invoiceId ? paid : i)) } : d));
        void saveInvoice(paid, "payment", `${inv.number} paid · ${customerName(inv.customerId) || "Customer"}`);
      },
      replaceInvoice: (inv) =>
        setData((d) => (d ? { ...d, invoices: d.invoices.map((i) => (i.id === inv.id ? inv : i)) } : d)),

      clockedIn: openEntry !== null,
      toggleClock: () =>
        setData((d) => {
          if (!d) return d;
          const open = d.timeEntries.find((e) => e.clockOut === null);
          const now = Date.now();
          const timeEntries = open
            ? d.timeEntries.map((e) => (e.id === open.id ? { ...e, clockOut: now } : e))
            : [...d.timeEntries, { id: newId(), clockIn: now, clockOut: null }];
          return { ...d, timeEntries };
        }),

      addExpense: (e) =>
        setData((d) => (d ? { ...d, expenses: [{ ...e, id: newId(), createdAt: Date.now() }, ...d.expenses] } : d)),

      activeTripId: activeTrip?.id ?? null,
      startTrip: ({ purpose, odometer, addressFrom, addressTo }) => {
        const trip: Trip = {
          id: newId(),
          purpose,
          addressFrom: addressFrom.trim(),
          addressTo: addressTo.trim(),
          startAt: Date.now(),
          startOdometer: odometer,
          endAt: null,
          endOdometer: null,
          elapsedSeconds: null,
        };
        setData((d) => (d ? { ...d, trips: [...d.trips, trip] } : d));
        return save("mileage_logs", tripToRow(trip), "trip", `Trip started · ${purpose}`);
      },
      endTrip: async ({ odometer, addressTo }) => {
        if (!activeTrip) throw new Error("No trip in progress.");
        const trip = finishTrip(activeTrip, { endAt: Date.now(), endOdometer: odometer, addressTo });
        setData((d) => (d ? { ...d, trips: d.trips.map((t) => (t.id === trip.id ? trip : t)) } : d));
        const res = await save(
          "mileage_logs",
          tripToRow(trip),
          "trip",
          `Trip ended · ${(odometer - trip.startOdometer).toFixed(1)} mi`,
        );
        return { ...res, trip };
      },

      runBackup: (p) => {
        // Simulated upload progress — replace with the real provider upload.
        setData((d) => (d ? { ...d, backups: { ...d.backups, [p]: { ...d.backups[p], status: "running", progress: 0 } } } : d));
        let progress = 0;
        const timer = window.setInterval(() => {
          progress = Math.min(100, progress + 8 + Math.random() * 14);
          const done = progress >= 100;
          setData((d) =>
            d
              ? {
                  ...d,
                  backups: {
                    ...d.backups,
                    [p]: done
                      ? { status: "done", progress: 100, lastBackupAt: Date.now() }
                      : { ...d.backups[p], status: "running", progress },
                  },
                }
              : d,
          );
          if (done) window.clearInterval(timer);
        }, 260);
      },
    };
  }, [data, user, online, networkOnline, simulateOffline, theme, setTheme, outbox, flush, load, save]);

  if (loadError && !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold">Couldn't load your jobs</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <button
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }
  if (!value) return <>{splash}</>;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useCustomer(id: string) {
  return useStore().customers.find((c) => c.id === id);
}

/** Clears this device's offline copy and queue (used on sign-out). */
export async function clearOfflineData() {
  const db = getOfflineDb();
  await Promise.all([db.syncQueue.clear(), db.cache.clear()]);
}
