import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { estimateToInvoice } from "./billing";
import { addDays, uid } from "./links";
import { createMockState, type AppData } from "./mock-data";
import type {
  BackupProvider,
  Estimate,
  Expense,
  Invoice,
  Job,
  JobStatus,
  OutboxKind,
  PaymentMethod,
} from "./types";

/**
 * In-memory app state. Every mutation that would need to reach the server also
 * pushes an entry onto `outbox` — the hook point for the offline sync layer.
 */
interface Store extends AppData {
  online: boolean;
  networkOnline: boolean;
  simulateOffline: boolean;
  setSimulateOffline: (v: boolean) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;

  enqueue: (kind: OutboxKind, label: string) => void;
  flushOutbox: () => void;

  updateJob: (id: string, patch: Partial<Job>, outbox?: { kind: OutboxKind; label: string }) => void;
  setJobStatus: (id: string, status: JobStatus) => void;
  toggleChecklist: (jobId: string, itemId: string) => void;
  logJobActivity: (jobId: string, text: string) => void;
  rescheduleJob: (id: string, date: string, startHour: number) => void;

  saveEstimate: (est: Estimate) => void;
  createEstimate: (customerId: string, jobId: string | null) => Estimate;
  convertEstimate: (estimateId: string) => Invoice | null;
  payInvoice: (invoiceId: string, method: PaymentMethod) => void;

  clockedIn: boolean;
  toggleClock: () => void;

  addExpense: (e: Omit<Expense, "id" | "createdAt">) => void;

  activeTripId: string | null;
  startTrip: (purpose: string, odometer: number) => void;
  endTrip: (odometer: number) => void;

  runBackup: (p: BackupProvider) => void;
}

const StoreContext = createContext<Store | null>(null);

const KIND_LABEL: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
};

export const statusLabel = (s: JobStatus) => KIND_LABEL[s];

export function StoreProvider({ children, splash }: { children: ReactNode; splash: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  // Mock data is built on the client so dates/times use the device's timezone.
  useEffect(() => {
    setData(createMockState(new Date()));
    setNetworkOnline(navigator.onLine);
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const on = () => setNetworkOnline(true);
    const off = () => setNetworkOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try {
      localStorage.setItem("fieldpro-theme", t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const patch = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => (d ? fn(d) : d));
  }, []);

  const pushOutbox = (d: AppData, kind: OutboxKind, label: string): AppData => ({
    ...d,
    outbox: [...d.outbox, { id: uid("ob"), kind, label, at: Date.now() }],
  });

  const online = networkOnline && !simulateOffline;

  const value = useMemo<Store | null>(() => {
    if (!data) return null;
    const activeTrip = data.trips.find((t) => t.endAt === null) ?? null;
    const openEntry = data.timeEntries.find((e) => e.clockOut === null) ?? null;
    const customerName = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "Customer";

    return {
      ...data,
      online,
      networkOnline,
      simulateOffline,
      setSimulateOffline,
      theme,
      setTheme,
      enqueue: (kind, label) => patch((d) => pushOutbox(d, kind, label)),
      flushOutbox: () => patch((d) => ({ ...d, outbox: [] })),

      updateJob: (id, p, ob) =>
        patch((d) => {
          const next = { ...d, jobs: d.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) };
          return ob ? pushOutbox(next, ob.kind, ob.label) : next;
        }),
      setJobStatus: (id, status) =>
        patch((d) => {
          const job = d.jobs.find((j) => j.id === id);
          const next = {
            ...d,
            jobs: d.jobs.map((j) =>
              j.id === id
                ? { ...j, status, activity: [...j.activity, { at: Date.now(), text: `Status → ${KIND_LABEL[status]}` }] }
                : j,
            ),
          };
          return pushOutbox(next, "status", `${job?.title ?? "Job"} → ${KIND_LABEL[status]}`);
        }),
      toggleChecklist: (jobId, itemId) =>
        patch((d) => {
          const next = {
            ...d,
            jobs: d.jobs.map((j) =>
              j.id === jobId
                ? { ...j, checklist: j.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
                : j,
            ),
          };
          const job = next.jobs.find((j) => j.id === jobId);
          const item = job?.checklist.find((c) => c.id === itemId);
          return pushOutbox(next, "checklist", `${item?.done ? "✓" : "○"} ${item?.label ?? "Task"}`);
        }),
      logJobActivity: (jobId, text) =>
        patch((d) => ({
          ...d,
          jobs: d.jobs.map((j) => (j.id === jobId ? { ...j, activity: [...j.activity, { at: Date.now(), text }] } : j)),
        })),
      rescheduleJob: (id, date, startHour) =>
        patch((d) => {
          const job = d.jobs.find((j) => j.id === id);
          if (!job || (job.date === date && job.startHour === startHour)) return d;
          const next = { ...d, jobs: d.jobs.map((j) => (j.id === id ? { ...j, date, startHour } : j)) };
          return pushOutbox(next, "schedule", `Rescheduled · ${job.title}`);
        }),

      saveEstimate: (est) =>
        patch((d) =>
          pushOutbox(
            { ...d, estimates: d.estimates.map((e) => (e.id === est.id ? est : e)) },
            "estimate",
            `${est.number} saved`,
          ),
        ),
      createEstimate: (customerId, jobId) => {
        const est: Estimate = {
          id: uid("est"),
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
        patch((d) => ({ ...d, estimates: [est, ...d.estimates] }));
        return est;
      },
      convertEstimate: (estimateId) => {
        const est = data.estimates.find((e) => e.id === estimateId);
        if (!est || est.status !== "approved") return null;
        const invoice = estimateToInvoice(est, {
          id: uid("inv"),
          number: `INV-${2088 + data.invoices.length}`,
          now: Date.now(),
          dueDate: addDays(data.today, 30),
        });
        patch((d) =>
          pushOutbox(
            {
              ...d,
              invoices: [invoice, ...d.invoices],
              estimates: d.estimates.map((e) =>
                e.id === estimateId ? { ...e, status: "converted", invoiceId: invoice.id } : e,
              ),
            },
            "invoice",
            `${invoice.number} created from ${est.number}`,
          ),
        );
        return invoice;
      },
      payInvoice: (invoiceId, method) =>
        patch((d) => {
          const inv = d.invoices.find((i) => i.id === invoiceId);
          return pushOutbox(
            {
              ...d,
              invoices: d.invoices.map((i) =>
                i.id === invoiceId ? { ...i, status: "paid", paidAt: Date.now(), paidMethod: method } : i,
              ),
            },
            "payment",
            `${inv?.number ?? "Invoice"} paid · ${customerName(inv?.customerId ?? "")}`,
          );
        }),

      clockedIn: openEntry !== null,
      toggleClock: () =>
        patch((d) => {
          const open = d.timeEntries.find((e) => e.clockOut === null);
          const now = Date.now();
          const timeEntries = open
            ? d.timeEntries.map((e) => (e.id === open.id ? { ...e, clockOut: now } : e))
            : [...d.timeEntries, { id: uid("te"), clockIn: now, clockOut: null }];
          return pushOutbox({ ...d, timeEntries }, "timesheet", open ? "Clocked out" : "Clocked in");
        }),

      addExpense: (e) =>
        patch((d) =>
          pushOutbox(
            { ...d, expenses: [{ ...e, id: uid("ex"), createdAt: Date.now() }, ...d.expenses] },
            "expense",
            `Expense $${e.amount.toFixed(2)} · ${e.vendor || e.category}`,
          ),
        ),

      activeTripId: activeTrip?.id ?? null,
      startTrip: (purpose, odometer) =>
        patch((d) =>
          pushOutbox(
            {
              ...d,
              trips: [
                ...d.trips,
                { id: uid("tr"), purpose, startAt: Date.now(), startOdometer: odometer, endAt: null, endOdometer: null },
              ],
            },
            "trip",
            `Trip started · ${purpose}`,
          ),
        ),
      endTrip: (odometer) =>
        patch((d) =>
          pushOutbox(
            {
              ...d,
              trips: d.trips.map((t) => (t.endAt === null ? { ...t, endAt: Date.now(), endOdometer: odometer } : t)),
            },
            "trip",
            "Trip ended",
          ),
        ),

      runBackup: (p) => {
        // Simulated upload progress — replace with the real provider upload.
        patch((d) => ({ ...d, backups: { ...d.backups, [p]: { ...d.backups[p], status: "running", progress: 0 } } }));
        let progress = 0;
        const timer = window.setInterval(() => {
          progress = Math.min(100, progress + 8 + Math.random() * 14);
          const done = progress >= 100;
          patch((d) => ({
            ...d,
            backups: {
              ...d.backups,
              [p]: done
                ? { status: "done", progress: 100, lastBackupAt: Date.now() }
                : { ...d.backups[p], status: "running", progress },
            },
          }));
          if (done) window.clearInterval(timer);
        }, 260);
      },
    };
  }, [data, online, networkOnline, simulateOffline, theme, setTheme, patch]);

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
