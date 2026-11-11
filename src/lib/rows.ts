import type { Database, Json } from "@/integrations/supabase/types";

import type { ChecklistItem, Customer, Equipment, Invoice, Job, JobPhoto, JobStatus, LineItem, PaymentMethod, Trip } from "./types";

type Tables = Database["public"]["Tables"];
export type CustomerRow = Tables["customers"]["Row"];
export type JobRow = Tables["jobs"]["Row"];
export type InvoiceRow = Tables["invoices"]["Row"];
export type MileageRow = Tables["mileage_logs"]["Row"];

export type SyncTable = "customers" | "jobs" | "invoices" | "mileage_logs";

/** Row shapes we write. user_id is filled in by the database from the signed-in session. */
export type CustomerInsert = Omit<Tables["customers"]["Insert"], "user_id">;
export type JobInsert = Omit<Tables["jobs"]["Insert"], "user_id">;
export type InvoiceInsert = Omit<Tables["invoices"]["Insert"], "user_id">;
export type MileageInsert = Omit<Tables["mileage_logs"]["Insert"], "user_id">;

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const ms = (s: string | null) => (s === null ? null : new Date(s).getTime());
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const JOB_STATUSES: JobStatus[] = ["pending", "scheduled", "en_route", "in_progress", "completed"];

/** Splits a fractional start hour + duration into the "HH:MM" strings the New Job form shows. */
export function hourToTime(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function timeToHour(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

export function customerFromRow(r: CustomerRow): Customer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    customerSince: r.customer_since,
    notes: r.notes,
    equipment: arr<Equipment>(r.equipment),
  };
}

export function customerToRow(c: Customer): CustomerInsert {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    customer_since: c.customerSince,
    notes: c.notes,
    equipment: c.equipment as unknown as Json,
  };
}

export function jobFromRow(r: JobRow): Job {
  const status = JOB_STATUSES.includes(r.status as JobStatus) ? (r.status as JobStatus) : "scheduled";
  return {
    id: r.id,
    customerId: r.customer_id ?? "",
    title: r.title,
    serviceType: r.service_type,
    date: r.scheduled_date ?? "",
    startHour: Number(r.start_hour),
    durationHrs: Number(r.duration_hrs),
    status,
    address: r.address,
    priority: r.priority === "urgent" ? "urgent" : "normal",
    checklist: arr<ChecklistItem>(r.checklist),
    notes: r.notes,
    photos: arr<JobPhoto>(r.photos),
    signature: r.signature,
    activity: arr<{ at: number; text: string }>(r.activity),
    source: (["app", "sms", "email", "webhook"] as const).find((s) => s === r.source) ?? "app",
  };
}

export function jobToRow(j: Job, customerName: string): JobInsert {
  return {
    id: j.id,
    customer_id: j.customerId || null,
    customer_name: customerName,
    title: j.title,
    service_type: j.serviceType,
    address: j.address,
    scheduled_date: j.date || null,
    start_hour: j.startHour,
    duration_hrs: j.durationHrs,
    status: j.status,
    priority: j.priority,
    checklist: j.checklist as unknown as Json,
    notes: j.notes,
    photos: j.photos as unknown as Json,
    signature: j.signature,
    activity: j.activity as unknown as Json,
    source: j.source,
  };
}

export function invoiceFromRow(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customer_id ?? "",
    jobId: r.job_id,
    estimateId: r.estimate_id,
    title: r.title,
    items: arr<LineItem>(r.items),
    taxRate: Number(r.tax_rate),
    status: r.status === "paid" ? "paid" : "unpaid",
    createdAt: ms(r.created_at) ?? Date.now(),
    dueDate: r.due_date,
    paidAt: ms(r.paid_at),
    paidMethod: (r.paid_method as PaymentMethod | null) ?? null,
    stripeSessionId: r.stripe_session_id,
  };
}

export function invoiceToRow(i: Invoice): InvoiceInsert {
  return {
    id: i.id,
    number: i.number,
    customer_id: i.customerId || null,
    job_id: i.jobId,
    estimate_id: i.estimateId,
    title: i.title,
    items: i.items as unknown as Json,
    tax_rate: i.taxRate,
    status: i.status,
    due_date: i.dueDate,
    paid_at: iso(i.paidAt),
    paid_method: i.paidMethod,
    created_at: new Date(i.createdAt).toISOString(),
  };
}

export function tripFromRow(r: MileageRow): Trip {
  return {
    id: r.id,
    purpose: r.purpose,
    addressFrom: r.address_from,
    addressTo: r.address_to,
    startAt: ms(r.start_at) ?? Date.now(),
    startOdometer: Number(r.start_odometer),
    endAt: ms(r.end_at),
    endOdometer: r.end_odometer === null ? null : Number(r.end_odometer),
    elapsedSeconds: r.elapsed_seconds,
  };
}

export function tripToRow(t: Trip): MileageInsert {
  return {
    id: t.id,
    purpose: t.purpose,
    address_from: t.addressFrom,
    address_to: t.addressTo,
    start_at: new Date(t.startAt).toISOString(),
    end_at: iso(t.endAt),
    start_odometer: t.startOdometer,
    end_odometer: t.endOdometer,
    elapsed_seconds: t.elapsedSeconds,
  };
}

/** Closes an open trip: records destination, final odometer and elapsed time. */
export function finishTrip(trip: Trip, opts: { endAt: number; endOdometer: number; addressTo: string }): Trip {
  if (opts.endOdometer < trip.startOdometer) {
    throw new Error("End odometer can't be lower than the start reading.");
  }
  return {
    ...trip,
    addressTo: opts.addressTo.trim() || trip.addressTo,
    endAt: opts.endAt,
    endOdometer: opts.endOdometer,
    elapsedSeconds: Math.max(0, Math.round((opts.endAt - trip.startAt) / 1000)),
  };
}
